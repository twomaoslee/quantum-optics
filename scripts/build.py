#!/usr/bin/env python3
"""Refresh the student website from the course's already rendered HTML."""
from pathlib import Path
from datetime import datetime
from html import escape
import argparse
import json
import re
import shutil
from release import PUBLISHED, AFTER_CLASS, withheld

SITE = Path(__file__).resolve().parents[1]
ROOT = SITE.parent
DIST = SITE / 'dist'

def copy_tree(source, destination):
    def ignore(directory, names):
        return [name for name in names if withheld(name) or name in {'archive', 'qa', '__pycache__', '.DS_Store'}
                or (name.endswith('.md') and name not in {'SOURCES.md', 'README.md'})
                or name.endswith(('.py', '.pyc', '.qmd', '.zip', '.map'))
                or name.endswith('-prompt.txt')
                or (name.endswith('.json') and ('verification' in name or name == 'slide-manifest.json'))]
    shutil.copytree(source, destination, ignore=ignore, dirs_exist_ok=True)

def sanitize_notes(text):
    text = re.sub(r'<link\b[^>]*href="([^\"]*lecture\d+[^\"]*)"[^>]*>',
                  lambda m: '' if withheld(m[1]) else m[0], text)
    # Keep the syllabus, but remove reading invitations for unreleased chapters.
    text = re.sub(r'<p><a href="[^\"]*lecture(\d+)\.html">.*?</p>',
                  lambda m: '<p>第二讲资料将在授课后发布。</p>' if int(m[1]) in AFTER_CLASS else ('' if int(m[1]) not in PUBLISHED else m[0]), text, flags=re.S)
    def gate_link(match):
        if not withheld(match[1]):
            return match[0]
        if 'pagination-link' in match[0]:
            return ''
        title = re.sub(r'<[^>]+>', '', match[2])
        return f'<span>{title}（授课后发布）</span>'
    text = re.sub(r'<a\b[^>]*href="([^\"]*lecture\d+[^\"]*)"[^>]*>(.*?)</a>', gate_link, text, flags=re.S)
    text = re.sub(r'<p><a href="assets/lecture01/make_lecture01_figures.py">.*?</p>', '', text, flags=re.S)
    text = re.sub(r'可复现代码与核验结果分别为 .*?sample-electron-verification.json</a>。', '', text, flags=re.S)
    text = re.sub(r'此前版本所用的OpenStax图6.6与6.7.*?存档</a>。', '', text, flags=re.S)
    text = re.sub(r'<a href="assets/lecture01/make_blackbody_limits.py">.*?可供复算。', '', text, flags=re.S)
    text = text.replace('<a href="assets/lecture01/make_complexity_growth.py">独立脚本</a>', '教学模型')
    text = text.replace('公式和参数写在正文展开框及<a href="assets/lecture01/complexity-growth-verification.json">核验记录</a>中。', '公式和参数见正文展开框。')
    text = re.sub(r'<p><a href="assets/lecture01/make_complexity_growth.py">.*?</p>', '', text, flags=re.S)
    text = re.sub(r'<a href="assets/lecture01/estimate_rsa_time.py">.*?给出了完整计算。', '', text, flags=re.S)
    text = re.sub(r'<p><a href="assets/lecture01/blackbody-limits-verification.json">.*?</p>', '', text, flags=re.S)
    text = re.sub(r'图件计算与本讲新增算例的核验记录可分别查看.*?讲义计算核验</a>。', '', text, flags=re.S)
    text = text.replace('本讲的实验照片、教材插图和人物图均保存在本地，出处见', '本讲实验照片、教材插图和人物图的出处见')
    return text

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', type=Path, default=ROOT)
    args = parser.parse_args()
    root = args.source_root.resolve()
    notes = root / 'quantum-notes/_book'
    slides = root / 'quantum-slides'
    pdf = root / '量子光学 · 第一讲：从量子力学到量子信息科学.pdf'
    required = [notes/'index.html', pdf] + [folder/f'lecture{n:02d}.html' for folder in (notes, slides) for n in PUBLISHED]
    for path in required:
        if not path.is_file():
            raise SystemExit(f'Missing source: {path.name}; render the course before publishing.')
    # Only replace this script's generated output directory, never course sources.
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    copy_tree(notes, DIST/'notes')
    missing_poster = DIST/'notes/figures/lecture01/slide10-image18.png'
    if not missing_poster.exists():
        shutil.copy2(slides/'assets/from-ppt/slide10-image18.png', missing_poster)
    copy_tree(slides/'assets', DIST/'slides/assets')
    for name in ('lecture01.html','lecture02.html','lecture01-backup.html'):
        if not withheld(name):
            shutil.copy2(slides/name, DIST/'slides'/name)
    (DIST/'assets').mkdir()
    shutil.copy2(slides/'assets/branding/csu-logo.png', DIST/'assets/csu-logo.png')
    (DIST/'downloads').mkdir()
    shutil.copy2(pdf, DIST/'downloads/lecture01-slides.pdf')
    shutil.copy2(SITE/'site.css', DIST/'site.css')
    (DIST/'.nojekyll').touch()
    notes_nav = '''<style>.course-site-return{display:inline-block;margin:0 0 18px;font:500 15px/1.6 sans-serif;color:#07529c;text-decoration:none}.course-site-return:hover{text-decoration:underline}</style>'''
    for path in (DIST/'notes').glob('*.html'):
        text = sanitize_notes(path.read_text())
        text = text.replace('</head>',notes_nav+'</head>',1)
        text = re.sub(r'(<main\b[^>]*>)',r'\1<a class="course-site-return" href="../index.html">← 课程首页 · 讲义与课件</a>',text,count=1)
        path.write_text(text)
    for path in (DIST/'notes/assets/lecture01').glob('*.json'):
        path.unlink()
    # Search is rebuilt from the sanitized output to avoid stale internal text.
    search = DIST/'notes/search.json'
    if search.exists():
        items = [item for item in json.loads(search.read_text()) if not withheld(item.get('href', ''))]
        for item in items:
            if isinstance(item.get('text'),str):
                item['text'] = re.sub(r'图件计算与本讲新增算例的核验记录可分别查看.*?讲义计算核验。','',item['text'])
        search.write_text(json.dumps(items,ensure_ascii=False))
    source = (root/'quantum-notes/outline.qmd').read_text()
    units = []
    for unit_title, unit_text in re.findall(r'^## (第[一二三四]单元：[^\n]+)\n(.*?)(?=^## |\Z)',source,re.M|re.S):
        lectures = re.findall(r'^### 第(\d+)讲[　 ]+([^\n]+)',unit_text,re.M)
        units.append((unit_title,lectures))
    summaries = {
        1: ('从量子力学到量子信息科学', '整数分解 → 量子力学 → 量子信息 → 光与控制'),
        2: ('量子态与测量', '从三块偏振片与连续测量出发，理解量子态、Born 规则与相对相位。')
    }
    rows=[]
    for number,(title,summary) in summaries.items():
        if number not in PUBLISHED:
            continue
        name=f'lecture{number:02d}'
        changed=datetime.fromtimestamp(max((notes/f'{name}.html').stat().st_mtime,(slides/f'{name}.html').stat().st_mtime)).strftime('%Y-%m-%d')
        download = '<a class="download" href="downloads/lecture01-slides.pdf" download>课件 PDF · 49 页 · 14.4 MB ↓</a>' if number==1 else ''
        rows.append(f'''<article class="lecture"><div class="lecture-number" aria-hidden="true">{number:02d}</div><div><h3><a href="notes/{name}.html"><span class="sr-only">第 {number} 讲：</span>{title}</a></h3><p>{summary}</p><p class="revision">资料更新：{changed}</p></div><div class="actions"><a class="action primary" href="notes/{name}.html" aria-label="阅读第{number}讲讲义">在线讲义</a><a class="action" href="slides/{name}.html" aria-label="打开第{number}讲课件">课堂课件</a>{download}</div></article>''')
    blocks=[]
    for title,lectures in units:
        rows2=[]
        for number,name in lectures:
            n=int(number)
            short=summaries[n][0] if n in summaries else name
            content=f'<a href="notes/lecture{n:02d}.html">{escape(short)}</a>' if n in PUBLISHED else escape(short)
            status = '可阅读' if n in PUBLISHED else ('授课后发布' if n in AFTER_CLASS else '待更新')
            rows2.append(f'<li><span class="num">{n:02d}</span><span>{content}</span><span class="status">{status}</span></li>')
        blocks.append(f'<section class="unit"><h3>{escape(title)}</h3><ol>{"".join(rows2)}</ol></section>')
    page=(SITE/'index.template.html').read_text().replace('{{LECTURES}}',''.join(rows)).replace('{{CURRICULUM}}',''.join(blocks))
    page=page.replace('{{PUBLISHED_NUMBERS}}', '、'.join(str(n) for n in sorted(PUBLISHED)))
    (DIST/'index.html').write_text(page)
    size=sum(p.stat().st_size for p in DIST.rglob('*') if p.is_file())
    print(f'Website ready: {size/1024/1024:.1f} MiB; {len(units)} units, {sum(len(x[1]) for x in units)} lectures.')

if __name__=='__main__':
    main()
