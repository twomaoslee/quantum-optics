"""Publish the course video recap pages and links."""
from html import escape, unescape
import posixpath
import re
import shutil


def embed_note_videos(notes, recap, relative):
    """Render selected recap videos at the end of their named lesson sections."""
    source = notes.read_text()
    text = re.sub(r'<!-- note-video:start -->.*?<!-- note-video:end -->', '', source, flags=re.S)
    sections = re.findall(r'<section ([^>]*data-note-section="[^"]+"[^>]*)>(.*?)</section>', recap, re.S)
    for attributes, body in sections:
        options = dict(re.findall(r'data-([\w-]+)="([^"]*)"', attributes))
        title_id, title = re.search(r'<h2 id="([^"]+)">(.*?)</h2>', body, re.S).groups()
        duration = re.search(r'<p>([^<·]+) ·', body)[1].strip()
        video = re.search(r'<video\b[^>]*>', body)[0]
        def media(attribute):
            url = unescape(re.search(rf'\b{attribute}="([^"]+)"', video)[1])
            return escape(posixpath.relpath(posixpath.join(posixpath.dirname(relative), url), 'notes'), quote=True)

        key = 'video-' + title_id.removesuffix('-title')
        card = f'''<!-- note-video:start --><aside class="note-video" id="{key}" aria-labelledby="{key}-title">
<p class="note-video-meta">视频回顾 · {duration}</p>
<h4 id="{key}-title">{title}</h4>
<p class="note-video-prompt">{options['prompt']}</p>
<div class="note-video-player">
<video controls playsinline preload="none" width="1280" height="720" aria-labelledby="{key}-title" poster="{media('poster')}" src="{media('src')}"></video>
<button type="button" class="note-video-start" aria-label="播放：{title}" hidden></button>
</div>
<a class="note-video-next" href="#{options['next']}">继续阅读 · {options['next-label']} →</a>
</aside><!-- note-video:end -->'''
        # These standalone notes use leaf lesson sections. Fail explicitly on a layout change.
        section = re.search(rf'<section\b[^>]*\bid="{re.escape(options["note-section"])}"[^>]*>(.*?)</section>', text, re.S)
        if not section or '<section ' in section[1] or f'id="{options["next"]}"' not in text:
            raise ValueError(f'Invalid video location in {notes.name}: {options}')
        end = section.end(1)
        text = text[:end] + card + text[end:]
    if sections:
        assets = ('<!-- note-video:start --><link rel="stylesheet" href="../assets/notes/video-recap.css">'
                  '<script defer src="../assets/notes/video-recap.js"></script><!-- note-video:end -->')
        text = text.replace('<head>', '<head>' + assets, 1)
    if text != source:
        notes.write_text(text)


def sync_video_recaps(site, config, published_slides):
    """Add the authorized video pages and their lecture material links."""
    home = site / 'dist/index.html'
    original = home.read_text()
    text = original
    for number, relative in config.get('video_recaps', {}).items():
        lecture = int(number)
        if lecture not in published_slides:
            raise ValueError('Video recap requires published slides')
        output = site / 'dist' / relative
        output.parent.mkdir(parents=True, exist_ok=True)
        source = site / relative
        shutil.copyfile(source, output)
        assets = source.with_suffix('')
        if assets.is_dir():
            shutil.copytree(assets, output.with_suffix(''), dirs_exist_ok=True)

        name = f'lecture{lecture:02d}'
        notes = site / 'dist/notes' / f'{name}.html'
        if notes.exists():
            embed_note_videos(notes, source.read_text(), relative)
            for asset in ('video-recap.css', 'video-recap.js'):
                target = site / 'dist/assets/notes' / asset
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(site / 'assets/notes' / asset, target)

        card_pattern = (rf'<article class="lecture">'
                        rf'(?:(?!</article>).)*href="slides/{name}\.html"'
                        r'(?:(?!</article>).)*</article>')
        link = (f'<a class="action video-recap-link" id="{name}" style="grid-column:1/-1" '
                f'href="{escape(relative, quote=True)}">视频回顾</a>')

        def add_link(match):
            card = re.sub(r'<a class="action video-recap-link"[^>]*>.*?</a>', '', match[0])
            if '<a class="download"' in card:
                return card.replace('<a class="download"', link + '<a class="download"', 1)
            return card.replace('</div></article>', link + '</div></article>', 1)

        text, count = re.subn(card_pattern, add_link, text, flags=re.S)
        if count != 1:
            raise ValueError(f'Video recap homepage entry not found: {name}')
    if text != original:
        home.write_text(text)
