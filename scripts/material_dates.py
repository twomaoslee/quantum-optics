"""Keep teacher-confirmed class times independent of material publication dates."""
from pathlib import Path
from datetime import datetime
from html import escape
from zoneinfo import ZoneInfo
import hashlib
import json
import re


def material_digest(site, number):
    digest = hashlib.sha256()
    for relative in [f'notes/lecture{number:02d}.html', f'slides/lecture{number:02d}.html', f'downloads/lecture{number:02d}-slides.pdf']:
        path = site / 'dist' / relative
        if path.is_file():
            digest.update(relative.encode())
            digest.update(path.read_bytes())
    return digest.hexdigest()


def date_markup(config, entry):
    weekly = config['weekly_class']
    days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    if entry.get('class_start'):
        start = datetime.fromisoformat(entry['class_start'])
        end = datetime.fromisoformat(entry['class_end'])
        if start.tzinfo is None or end.tzinfo is None or end <= start:
            raise ValueError('Class start/end must be ordered timezone-aware timestamps.')
        label = f'{start:%Y-%m-%d}（{days[start.weekday()]}）{start:%H:%M}–{end:%H:%M}'
        class_time = f'<time datetime="{escape(entry["class_start"], quote=True)}">{label}</time>'
    else:
        class_time = f'{days[weekly["weekday"] - 1]} {escape(weekly["start"])}–{escape(weekly["end"])}（日期待补充）'
    updated = entry['materials_updated']
    display = datetime.fromisoformat(updated).strftime('%Y-%m-%d %H:%M') if 'T' in updated else updated
    return ('<div class="lecture-dates">'
            f'<p class="class-time">上课时间：{class_time}</p>'
            f'<p class="revision">资料更新时间：<time datetime="{escape(updated, quote=True)}">{escape(display)}</time></p>'
            '</div>')


def sync_dates(site, updated_numbers=(), now=None):
    site = Path(site)
    path = site / 'lecture-metadata.json'
    config = json.loads(path.read_text())
    moment = now or datetime.now(ZoneInfo(config['timezone']))
    if moment.tzinfo is None:
        raise ValueError('Publication update time must include a timezone.')
    stamp = moment.astimezone(ZoneInfo(config['timezone'])).isoformat(timespec='minutes')
    requested = set(updated_numbers)
    for number, entry in config['lectures'].items():
        if requested and int(number) not in requested:
            continue
        digest = material_digest(site, int(number))
        if int(number) in requested or digest != entry.get('published_materials_sha256'):
            entry['materials_updated'] = stamp
        entry['published_materials_sha256'] = digest
        # Class timestamps are author-maintained; builds never derive them from mtimes.
    homepage = site / 'dist/index.html'
    text = homepage.read_text()

    def card(match):
        content = match[0]
        number = str(int(re.search(r'<div class="lecture-number"[^>]*>(\d+)</div>', content)[1]))
        entry = config['lectures'].get(number)
        if entry is None:
            raise ValueError('Missing lecture metadata: ' + number)
        pattern = r'<div class="lecture-dates">.*?</div>|<p class="revision">.*?</p>'
        content, count = re.subn(pattern, lambda _: date_markup(config, entry), content, count=1, flags=re.S)
        if count != 1:
            raise ValueError('Missing material metadata position for lecture ' + number)
        return content

    text = re.sub(r'<article class="lecture">.*?</article>', card, text, flags=re.S)
    homepage.write_text(text)
    path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    sync_dates(Path(__file__).resolve().parents[1])
