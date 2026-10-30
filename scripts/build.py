#!/usr/bin/env python3
"""Refresh the student website from the course's already rendered HTML."""
from pathlib import Path
from datetime import datetime
from html import escape, unescape
import argparse
import base64
import hashlib
import json
import re
import shutil
import subprocess
import tarfile
import tempfile
from urllib.parse import unquote
from release import CONFIG, PUBLISHED, PUBLISHED_SLIDES, NOTES_ONLY, STANDALONE_NOTES, PUBLISHED_PDFS, AFTER_CLASS, withheld

SITE = Path(__file__).resolve().parents[1]
ROOT = SITE.parent
DIST = SITE / 'dist'

def standalone_source(root, number):
    relative = CONFIG.get('standalone_notes_sources', {}).get(str(number))
    if relative is None:
        return root/'quantum-notes'/f'lecture{number:02d}.html'
    source = (root/relative).resolve()
    if not source.is_relative_to(root.resolve()):
        raise SystemExit('Standalone notes source must remain within the course.')
    return source

def standalone_content(root, number):
    """Package a standalone draft with only its reader-facing dependencies."""
    source = standalone_source(root, number)
    review = CONFIG.get('notes_acceptance', {}).get(str(number))
    preview = CONFIG.get('notes_preview_acceptance', {}).get(str(number))
    if review:
        acceptance_path = root/review
        acceptance = json.loads(acceptance_path.read_text())
        for dimension in ('understanding', 'physics', 'visuals', 'operation', 'offline_bundle'):
            if not acceptance['dimensions'].get(dimension, '').startswith('passed'):
                raise SystemExit(f'Incomplete notes acceptance: {number}, {dimension}')
        if source.relative_to(root).as_posix() not in acceptance['sha256']:
            raise SystemExit(f'Notes acceptance does not cover {source.name}')
        for relative, expected in acceptance['sha256'].items():
            if hashlib.sha256((root/relative).read_bytes()).hexdigest() != expected:
                raise SystemExit(f'Reviewed notes source changed: {relative}')
        if not (acceptance_path.parent/acceptance['evidence']).is_file():
            raise SystemExit(f'Missing notes review evidence: {number}')
    if preview and not review:
        # The teacher explicitly requested an online preview while browser
        # visual verification is pending. Preserve that status, never fake pass.
        acceptance_path = root/preview
        acceptance = json.loads(acceptance_path.read_text())
        if acceptance.get('publication_mode') != 'teacher_requested_web_preview' or not acceptance.get('authorization'):
            raise SystemExit(f'Missing explicit web-preview authorization: {number}')
        for dimension in ('understanding', 'physics', 'operation', 'offline_bundle'):
            if not acceptance['dimensions'].get(dimension, '').startswith('passed'):
                raise SystemExit(f'Incomplete preview checks: {number}, {dimension}')
        if acceptance['dimensions'].get('visuals') != 'pending_teacher_web_preview':
            raise SystemExit('Use full notes_acceptance for a visually accepted release.')
        required = [source] + [source.parent/f for f in CONFIG.get('standalone_notes_files', {}).get(str(number), [])]
        for required_file in required:
            if required_file.relative_to(root).as_posix() not in acceptance['sha256']:
                raise SystemExit(f'Preview review does not cover {required_file.name}')
        for relative, expected in acceptance['sha256'].items():
            if hashlib.sha256((root/relative).read_bytes()).hexdigest() != expected:
                raise SystemExit(f'Reviewed preview source changed: {relative}')
        for evidence in [acceptance['evidence']] + acceptance.get('evidence_files', []):
            if not (acceptance_path.parent/evidence).is_file():
                raise SystemExit(f'Missing preview evidence: {evidence}')
    # Copy only explicitly listed student-facing companion files.
    for relative in CONFIG.get('standalone_notes_files', {}).get(str(number), []):
        origin = (source.parent/relative).resolve()
        target = (DIST/'notes'/relative).resolve()
        if not origin.is_relative_to(source.parent.resolve()) or not target.is_relative_to((DIST/'notes').resolve()):
            raise SystemExit('Companion file must remain within the notes bundle.')
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(origin, target)
    text = sanitize_notes(source.read_text())
    name = f'lecture{number:02d}'
    if source.parent == root/'quantum-notes':
        assets = root/'quantum-notes/assets'/name
        if assets.is_dir():
            copy_tree(assets, DIST/'notes/assets'/name)
        return text
    destination = DIST/'notes/assets'/name
    destination.mkdir(parents=True, exist_ok=True)
    for folder in ('assets', 'interactions', f'{name}_files'):
        origin = source.parent/folder
        # Game sources and diagnostic copies are not publication resources.
        if folder == 'interactions':
            (destination/folder).mkdir(exist_ok=True)
            for filename in ('answers.html', 'quantum.html', 'host.css'):
                shutil.copy2(origin/filename, destination/folder/filename)
        elif folder == 'assets':
            copy_tree(origin, destination)
        else:
            copy_tree(origin, destination/folder)
    shutil.copy2(source.parent/'style.css', destination/'style.css')
    for prefix, replacement in (
        ('assets/', f'assets/{name}/'),
        ('interactions/', f'assets/{name}/interactions/'),
        (f'{name}_files/', f'assets/{name}/{name}_files/'),
    ):
        text = re.sub(r'((?:href|src|srcset)=["\'])'+re.escape(prefix),
                      lambda m: m[1]+replacement, text)
    text = text.replace('../../assets/', 'assets/')
    text = text.replace('href="style.css"', f'href="assets/{name}/style.css"')
    shared = root/'quantum-notes/assets/mathjax'
    target = DIST/'notes/assets/mathjax'
    target.mkdir(parents=True, exist_ok=True)
    shutil.copy2(shared/'tex-chtml-full.js', target/'tex-chtml-full.js')
    copy_tree(shared/'output/chtml/fonts', target/'output/chtml/fonts')
    return text

def slide_link(number):
    return (f'<a class="action" href="slides/lecture{number:02d}.html" '
            f'target="_blank" rel="noopener" '
            f'aria-label="在新标签页打开第{number}讲课件">课堂课件</a>')

def new_tab_material_links(text):
    """Keep the course homepage open when entering notes or slides."""
    def replace(match):
        tag = re.sub(r'\s+target="[^"]*"', '', match[0])
        rel = re.search(r'\s+rel="([^"]*)"', tag)
        if rel:
            values = list(dict.fromkeys(rel[1].split() + ['noopener']))
            tag = tag[:rel.start()] + f' rel="{" ".join(values)}"' + tag[rel.end():]
        else:
            tag = tag[:-1] + ' rel="noopener">'
        tag = re.sub(r'aria-label="阅读第(\d+)讲讲义"',
                     r'aria-label="在新标签页阅读第\1讲讲义"', tag)
        return tag[:-1] + ' target="_blank">'
    return re.sub(r'<a\b[^>]*href="(?:notes|slides)/[^"#?]+\.html(?:[#?][^"]*)?"[^>]*>',
                  replace, text)

def update_material_links():
    """Refresh homepage link behavior without rebuilding course material."""
    homepage = DIST/'index.html'
    text = homepage.read_text()
    for number in sorted(PUBLISHED_SLIDES):
        pattern = rf'<a\b[^>]*href="slides/lecture{number:02d}\.html"[^>]*>课堂课件</a>'
        text, count = re.subn(pattern, slide_link(number), text)
        if count != 1:
            raise SystemExit(f'Expected one homepage slide link for lecture {number}, found {count}.')
    homepage.write_text(new_tab_material_links(text))

def sync_share_assets():
    shutil.copytree(SITE/'assets/share', DIST/'assets/share', dirs_exist_ok=True)

def update_sharing():
    """Refresh only homepage metadata and its cover, preserving the release."""
    pattern = r'<!-- Course sharing metadata -->.*?<!-- /Course sharing metadata -->'
    block = re.search(pattern, (SITE/'index.template.html').read_text(), re.S)[0]
    page = DIST/'index.html'
    text = re.sub(pattern + r'\s*', '', page.read_text(), flags=re.S)
    if text.count('</head>') != 1:
        raise SystemExit('Expected one homepage head element.')
    page.write_text(text.replace('</head>', block + '\n</head>', 1))
    sync_share_assets()

def use_shared_slide_images(directory):
    """Reuse byte-identical published assets instead of inline slide images."""
    assets = {}
    for path in sorted((directory/'assets').rglob('*')):
        if path.is_file():
            assets.setdefault(hashlib.sha256(path.read_bytes()).digest(), path)
    pattern = re.compile(r'(<(?:img|source|video)\b[^>]*?\bsrc=")(data:image/[^;,]+;base64,([A-Za-z0-9+/=\s]+))(")')
    for path in directory.glob('*.html'):
        def replace(match):
            asset = assets.get(hashlib.sha256(base64.b64decode(match[3])).digest())
            if asset is None:
                return match[0]
            return match[1] + asset.relative_to(directory).as_posix() + match[4]
        path.write_text(pattern.sub(replace, path.read_text()))

def copy_tree(source, destination):
    def ignore(directory, names):
        return [name for name in names if withheld(Path(directory)/name) or name in {'archive', 'qa', '__pycache__', '.DS_Store'}
                or (name.endswith('.md') and name not in {'SOURCES.md', 'README.md'})
                or name.endswith(('.py', '.pyc', '.qmd', '.zip', '.map'))
                or name.endswith('-prompt.txt')
                or (name.endswith('.json') and ('verification' in name or 'reader-states' in name or name == 'slide-manifest.json'))]
    shutil.copytree(source, destination, ignore=ignore, dirs_exist_ok=True)

def sync_note_titles(text):
    for old, new in CONFIG.get('note_title_aliases', {}).items():
        text = text.replace(old, new)
    return text

def sanitize_notes(text):
    text = sync_note_titles(text)
    if 4 in PUBLISHED:
        text = text.replace('第一至三讲已有完整资料，后续资料在授课后发布。',
                            '第一至三讲已有完整资料，<a href="lecture04.html">第四讲讲义</a>已可阅读，后续资料在授课后发布。')
    text = text.replace('量子调控：如何控制一个量子比特？', '量子调控：如何控制量子态？')
    text = text.replace('量子比特：状态、测量与调控', '量子比特：如何描述状态与预测测量？')
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

def sync_notes_sidebar(directory, source):
    """Refresh shared navigation even when chapter bodies are preserved."""
    pattern = r'<nav\b[^>]*\bid="quarto-sidebar"[^>]*>.*?</nav>'
    match = re.search(pattern, source.read_text(), re.S)
    if not match:
        raise RuntimeError(f'Missing canonical sidebar in {source.name}')
    sidebar = re.sub(r'[ \t]+$', '', sanitize_notes(match[0]), flags=re.M)
    # Standalone notes join the shared book navigation without changing old bodies.
    for n in sorted(STANDALONE_NOTES):
        name = f'lecture{n:02d}.html'
        page = directory/name
        title = unescape(re.search(r'<title>(.*?)</title>', page.read_text(), re.S)[1])
        if f'href="./{name}"' not in sidebar:
            item = f'<li class="sidebar-item"><div class="sidebar-item-container"><a href="./{name}" class="sidebar-item-text sidebar-link"><span class="chapter-title">{escape(title)}</span></a></div></li>'
            previous = re.search(r'<li class="sidebar-item">(?:(?!</li>).)*href="\./lecture'+f'{n-1:02d}'+r'\.html".*?</li>', sidebar, re.S)
            if not previous:
                raise RuntimeError(f'Missing preceding chapter for {name}')
            sidebar = sidebar[:previous.end()] + item + sidebar[previous.end():]
    for page in directory.glob('*.html'):
        def mark_current(link):
            tag = link[0].replace(' sidebar-link active', ' sidebar-link').replace(' aria-current="page"', '')
            if link[1].removeprefix('./') == page.name:
                tag = tag.replace('sidebar-link"', 'sidebar-link active" aria-current="page"')
            return tag
        current = re.sub(r'<a\b[^>]*href="([^"]+)"[^>]*>', mark_current, sidebar)
        text, count = re.subn(pattern, lambda _: current, page.read_text(), flags=re.S)
        if count == 0 and page.name in {f'lecture{n:02d}.html' for n in STANDALONE_NOTES}:
            continue  # Standalone page has its own chapter TOC and a course-home link.
        if count != 1:
            raise RuntimeError(f'Expected one sidebar in {page.name}, found {count}')
        page.write_text(sync_note_titles(text))
    search = directory/'search.json'
    if search.exists():
        items = json.loads(search.read_text())
        for item in items:
            for key in ('title', 'section', 'text'):
                if isinstance(item.get(key), str):
                    item[key] = sync_note_titles(item[key])
        search.write_text(json.dumps(items, ensure_ascii=False))

def slide_delivery_files(source, number):
    """Bind self-contained slide publication to the accepted source version."""
    name = f'lecture{number:02d}'
    manifest = json.loads((source/'qa'/name/'delivery-manifest.json').read_text())
    files = manifest.get('files')
    if files is None:
        # Self-contained decks have a hash-bound review rather than an asset list.
        review_dir = source/'qa'/name
        acceptance = json.loads((review_dir/manifest['acceptance']).read_text())
        digest = hashlib.sha256((source/f'{name}.html').read_bytes()).hexdigest()
        if digest != manifest['html_sha256'] or digest != acceptance['html_sha256']:
            raise SystemExit(f'Reviewed HTML changed: {name}')
        dimensions = acceptance['required_dimensions']
        if not dimensions or any(value != 'passed' for value in dimensions.values()):
            raise SystemExit(f'Incomplete slide acceptance: {name}')
        for relative, expected in acceptance['sources'].items():
            if hashlib.sha256((source/relative).read_bytes()).hexdigest() != expected:
                raise SystemExit(f'Reviewed source changed: {relative}')
        for relative in acceptance['evidence'].values():
            if not (review_dir/relative).is_file():
                raise SystemExit(f'Missing acceptance evidence: {relative}')
        files = [name+'.html']
    return files

def update_slides(root, numbers):
    """Publish packaged slides without changing already published note bodies."""
    if not set(numbers) <= PUBLISHED_SLIDES:
        raise SystemExit('Requested slides are not authorized in publication.json.')
    homepage = DIST/'index.html'
    text = homepage.read_text()
    for number in numbers:
        name = f'lecture{number:02d}'
        source = root/'quantum-slides'
        files = slide_delivery_files(source, number)
        for relative in files:
            path = Path(relative)
            # Delivery manifests also track authoring and QA sources. Publish only
            # the main classroom HTML/CSS and browser assets, never those sources.
            if path.parts[0] != 'assets' and path.name not in {name+'.html', name+'.css'}:
                continue
            if path.suffix.lower() not in {'.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.woff', '.woff2', '.mp4', '.webm', '.mp3', '.ogg'}:
                continue
            if path.is_absolute() or '..' in path.parts or withheld(Path('slides')/path):
                raise SystemExit(f'Unexpected packaged path: {relative}')
            target = DIST/'slides'/path
            target.parent.mkdir(parents=True, exist_ok=True)
            if path.suffix == '.html':
                content = (source/path).read_text()
                content = re.sub(r'<aside\b[^>]*class="[^"]*\bnotes\b[^"]*"[^>]*>.*?</aside>', '', content, flags=re.S)
                target.write_text(content)
            else:
                shutil.copy2(source/path, target)
        pattern = r'<article class="lecture">(?:(?!</article>).)*href="(?:notes|slides)/'+name+r'\.html".*?</article>'
        match = re.search(pattern, text, re.S)
        if not match:
            if number in PUBLISHED:
                raise SystemExit(f'Missing homepage entry for {name}')
            title = re.search(r'^### 第'+str(number)+r'讲[　 ]+([^\n{]+)',
                              (root/'quantum-notes/outline.qmd').read_text(), re.M)[1].strip()
            card = (f'<article class="lecture"><div class="lecture-number" aria-hidden="true">{number:02d}</div>'
                    f'<div><h3><a href="slides/{name}.html"><span class="sr-only">第 {number} 讲：</span>{escape(title)}</a></h3>'
                    '<p>课堂课件与两处互动演示。</p><p class="revision">资料更新：2000-01-01</p></div>'
                    f'<div class="actions">{slide_link(number)}</div></article>')
            marker = '</section></div>\n<section class="curriculum"'
            if text.count(marker) != 1:
                raise SystemExit('Missing homepage materials insertion point.')
            text = text.replace(marker, card+marker, 1)
            match = re.search(pattern, text, re.S)
            curriculum = rf'(<li><span class="num">{number:02d}</span><span class="lecture-title">).*?(</span><span class="status">).*?(</span></li>)'
            text, count = re.subn(curriculum, lambda m: m[1]+f'<a href="slides/{name}.html">{escape(title)}</a>'+m[2]+'课件已发布'+m[3], text)
            if count != 1:
                raise SystemExit(f'Missing curriculum entry for {name}')
            match = re.search(pattern, text, re.S)
        card = match[0]
        if f'href="slides/{name}.html"' not in card:
            link = slide_link(number)
            card = card.replace('</div></article>', link+'</div></article>')
        card = card.replace('第四讲讲义与互动演示。', '第四讲讲义、课堂课件与互动演示。')
        card = card.replace('在线讲义与互动演示。', '在线讲义、课堂课件与互动演示。')
        changed = datetime.fromtimestamp((source/f'{name}.html').stat().st_mtime).strftime('%Y-%m-%d')
        card = re.sub(r'资料更新：\d{4}-\d{2}-\d{2}', '资料更新：'+changed, card)
        text = text[:match.start()] + card + text[match.end():]
    text = re.sub(r'目前可阅读第 [^<]+讲 · 后续资料在授课后发布',
                  '按讲次选择已发布的讲义与课件 · 后续资料在授课后发布', text)
    homepage.write_text(text)
    update_material_links()

def update_notes(root, numbers):
    """Update standalone notes and their dependencies, preserving other releases."""
    if not set(numbers) <= (PUBLISHED & STANDALONE_NOTES):
        raise SystemExit('Only authorized standalone notes can use this update mode.')
    search_path = DIST/'notes/search.json'
    items = json.loads(search_path.read_text())
    homepage = DIST/'index.html'
    home = homepage.read_text()
    for number in numbers:
        name = f'lecture{number:02d}'
        source = root/'quantum-notes'
        modified = [standalone_source(root, number).stat().st_mtime]
        if number in PUBLISHED_SLIDES:
            modified.append((root/'quantum-slides'/f'{name}.html').stat().st_mtime)
        date = datetime.fromtimestamp(max(modified)).strftime('%Y-%m-%d')
        text = standalone_content(root, number)
        nav_css = '<style>.course-site-return{display:inline-block;margin:0 0 18px;font:500 15px/1.6 sans-serif;color:#07529c;text-decoration:none}.course-site-return:hover{text-decoration:underline}</style>'
        text = text.replace('</head>', nav_css+'</head>', 1)
        text = re.sub(r'(<main\b[^>]*>)', r'\1<a class="course-site-return" href="../index.html">← 课程首页 · 讲义与课件</a>', text, count=1)
        (DIST/'notes'/f'{name}.html').write_text(text)
        # Shared dependencies newly referenced by the synchronized local lab.
        for relative in ['vendor/katex/fonts/KaTeX_Math-Italic.woff2', 'mathjax/tex-svg-full.js']:
            target = DIST/'notes/assets'/relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source/'assets'/relative, target)
        items = [item for item in items if item.get('href', '').split('#')[0] != f'{name}.html']
        title = unescape(re.search(r'<title>(.*?)</title>', text, re.S)[1])
        body = re.search(r'<main\b[^>]*>(.*?)</main>', text, re.S)[1]
        body = re.sub(r'<(?:script|style)\b[^>]*>.*?</(?:script|style)>', '', body, flags=re.S)
        plain = unescape(re.sub(r'<[^>]+>', ' ', body))
        items.append(dict(objectID=f'{name}.html', href=f'{name}.html', title=title, section='', text=re.sub(r'\s+', ' ', plain)))
        pattern = r'<article class="lecture">(?:(?!</article>).)*href="(?:notes|slides)/'+name+r'\.html".*?</article>'
        match = re.search(pattern, home, re.S)
        if not match:
            heading = re.search(r'^### 第'+str(number)+r'讲[　 ]+([^\n]+)',
                                (source/'outline.qmd').read_text(), re.M)
            if heading is None:
                raise SystemExit(f'Missing syllabus title for {name}')
            label = escape(heading[1])
            card = (f'<article class="lecture"><div class="lecture-number" aria-hidden="true">{number:02d}</div>'
                    f'<div><h3><a href="notes/{name}.html"><span class="sr-only">第 {number} 讲：</span>{label}</a></h3>'
                    f'<p>在线讲义与互动演示。</p><p class="revision">资料更新：{date}</p></div>'
                    f'<div class="actions"><a class="action primary" href="notes/{name}.html" '
                    f'aria-label="阅读第{number}讲讲义">在线讲义</a></div></article>')
            home, count = re.subn(r'(</section></div>\s*<section class="curriculum")',
                                 lambda m: card+m[0], home, count=1)
            if count != 1:
                raise SystemExit('Missing homepage materials section.')
        else:
            card = re.sub(r'资料更新：\d{4}-\d{2}-\d{2}', '资料更新：'+date, match[0])
            if f'href="notes/{name}.html"' not in card:
                card = card.replace(f'<h3><a href="slides/{name}.html"', f'<h3><a href="notes/{name}.html"', 1)
                card = card.replace('<div class="actions">',
                                    f'<div class="actions"><a class="action primary" href="notes/{name}.html" aria-label="阅读第{number}讲讲义">在线讲义</a>', 1)
                card = card.replace('课堂课件与两处互动演示。', '在线讲义、课堂课件与互动演示。')
            home = home[:match.start()] + card + home[match.end():]
        home = re.sub(r'(<li><span class="num">'+f'{number:02d}'+r'</span><span class="lecture-title">)(.*?)(</span><span class="status">)(.*?)(</span></li>)',
                      lambda m: m[1]+(m[2].replace(f'href="slides/{name}.html"', f'href="notes/{name}.html"') if '<a ' in m[2] else f'<a href="notes/{name}.html">{m[2]}</a>')+m[3]+'可阅读'+m[5],home)
    home = re.sub(r'目前可阅读第 [^<]+ 讲',
                  '目前可阅读第 '+'、'.join(str(n) for n in sorted(PUBLISHED))+' 讲',home)
    search_path.write_text(json.dumps(items, ensure_ascii=False))
    homepage.write_text(new_tab_material_links(sync_note_titles(home)))
    sync_notes_sidebar(DIST/'notes', root/'quantum-notes/_book/index.html')

def update_pdfs(root, numbers):
    """Publish authorized PDF downloads without rebuilding notes or slides."""
    if not set(numbers) <= PUBLISHED_PDFS:
        raise SystemExit('Requested PDFs are not authorized in publication.json.')
    home = DIST/'index.html'
    text = home.read_text()
    for number in numbers:
        if number not in (4, 5, 6):
            raise SystemExit('Targeted PDF update currently supports Lectures 4, 5 and 6.')
        name = f'lecture{number:02d}'
        files = {4: [('第四讲课件.pdf', 'slides', '课件 PDF · 46 页')],
                 5: [('第五讲课件.pdf', 'slides', '课件 PDF · 56 页')],
                 6: [('第六讲课件.pdf', 'slides', '课件 PDF · 49 页')]}[number]
        # Handouts are local-only; remove the previously published copy.
        (DIST/f'downloads/{name}-print-9up.pdf').unlink(missing_ok=True)
        links = ''
        for filename, suffix, label in files:
            source = root/'output/pdf'/filename
            if not source.is_file():
                raise SystemExit(f'Missing PDF: {filename}')
            target = DIST/f'downloads/{name}-{suffix}.pdf'
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
            links += f'<a class="download" href="downloads/{name}-{suffix}.pdf" download>{label} · {source.stat().st_size/1_000_000:.1f} MB ↓</a>'
        pattern = r'<article class="lecture">(?:(?!</article>).)*href="notes/'+name+r'\.html".*?</article>'
        match = re.search(pattern, text, re.S)
        if not match:
            raise SystemExit(f'Missing homepage entry for {name}')
        card = re.sub(r'<a[^>]*href="downloads/'+name+r'-[^"]+\.pdf"[^>]*>.*?</a>', '', match[0])
        card = card.replace('</div></article>', links+'</div></article>')
        text = text[:match.start()] + card + text[match.end():]
    home.write_text(text)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--update-sharing', action='store_true',
                        help='Only refresh homepage share metadata and cover assets.')
    parser.add_argument('--update-material-links', '--update-slide-links',
                        dest='update_material_links', action='store_true',
                        help='Only refresh homepage notes and slides links to open in new tabs.')
    parser.add_argument('--source-root', type=Path, default=ROOT)
    parser.add_argument('--update-notes', type=int, nargs='+', choices=sorted(STANDALONE_NOTES),
                        help='Update standalone notes and dependencies only.')
    parser.add_argument('--update-slides', type=int, nargs='+', choices=sorted(PUBLISHED_SLIDES),
                        help='Update packaged classroom slides and their homepage links only.')
    parser.add_argument('--update-lectures', type=int, nargs='+',
                        help='Preserve other note pages and search entries from the committed release.')
    parser.add_argument('--update-curriculum', action='store_true',
                        help='Refresh the syllabus and shared titles while preserving published chapter bodies.')
    parser.add_argument('--update-pdfs', type=int, nargs='+', choices=sorted(PUBLISHED_PDFS & {4, 5, 6}), help='Publish authorized PDF downloads only.')
    args = parser.parse_args()
    if args.update_material_links:
        if args.update_notes or args.update_slides or args.update_sharing or args.update_lectures or args.update_curriculum or args.update_pdfs:
            parser.error('--update-material-links cannot be combined with other update modes.')
        update_material_links()
        print('Homepage notes and slides links updated to open in new tabs.')
        return
    if args.update_pdfs:
        if args.update_notes or args.update_slides or args.update_sharing or args.update_lectures or args.update_curriculum:
            parser.error('--update-pdfs cannot be combined with other update modes.')
        update_pdfs(args.source_root.resolve(), args.update_pdfs)
        print('PDF downloads and homepage links updated.')
        return
    if args.update_notes:
        if args.update_sharing or args.update_lectures or args.update_curriculum or args.update_slides:
            parser.error('--update-notes cannot be combined with other update modes.')
        update_notes(args.source_root.resolve(), args.update_notes)
        print('Standalone notes, dependencies and search updated.')
        return
    if args.update_slides:
        if args.update_sharing or args.update_lectures or args.update_curriculum:
            parser.error('--update-slides cannot be combined with other update modes.')
        update_slides(args.source_root.resolve(), args.update_slides)
        print('Packaged classroom slides and homepage entries updated.')
        return
    if args.update_sharing:
        if args.update_lectures or args.update_curriculum:
            parser.error('--update-sharing cannot be combined with course updates.')
        update_sharing()
        print('Homepage sharing metadata and cover updated.')
        return
    updated_lectures = args.update_lectures or []
    partial_update = bool(updated_lectures or args.update_curriculum)
    notes_only_update = bool(updated_lectures) and set(updated_lectures) <= NOTES_ONLY
    root = args.source_root.resolve()
    preserved_notes = {}
    preserved_search = []
    if partial_update:
        if not set(updated_lectures) <= PUBLISHED:
            raise SystemExit('Requested lecture is not authorized in publication.json.')
        names = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', 'HEAD', 'dist/notes'], cwd=SITE, text=True).splitlines()
        for name in names:
            path = Path(name)
            if path.parent != Path('dist/notes') or path.suffix != '.html' or path.name in {'index.html', 'outline.html'}:
                continue
            if any(path.name == f'lecture{n:02d}.html' for n in updated_lectures):
                continue
            preserved_notes[path.name] = subprocess.check_output(['git', 'show', f'HEAD:{name}'], cwd=SITE)
        previous_search = json.loads(subprocess.check_output(['git', 'show', 'HEAD:dist/notes/search.json'], cwd=SITE))
        refreshed_pages = {'index.html', 'outline.html'} | {f'lecture{n:02d}.html' for n in updated_lectures}
        preserved_search = [item for item in previous_search if item.get('href', '').split('#')[0] not in refreshed_pages]
    notes = root / 'quantum-notes/_book'
    note_sources = {n: standalone_source(root, n) if n in STANDALONE_NOTES
                    else notes/f'lecture{n:02d}.html' for n in PUBLISHED}
    slides = root / 'quantum-slides'
    pdf = root / '量子光学 · 第一讲：从量子力学到量子信息科学.pdf'
    pdfs = {1: (pdf, 49), 2: (root/'output/pdf/第二讲课件.pdf', 43),
            3: (root/'output/pdf/第三讲课件-主讲页.pdf', 46),
            4: (root/'output/pdf/第四讲课件.pdf', 46),
            5: (root/'output/pdf/第五讲课件.pdf', 56),
            6: (root/'output/pdf/第六讲课件.pdf', 49)}
    required = [notes/'index.html'] + list(note_sources.values()) + [pdfs[n][0] for n in PUBLISHED_PDFS] + [slides/f'lecture{n:02d}.html' for n in PUBLISHED_SLIDES]
    for path in required:
        if not path.is_file():
            raise SystemExit(f'Missing source: {path.name}; render the course before publishing.')
    for number in PUBLISHED_SLIDES:
        if (slides/'qa'/f'lecture{number:02d}'/'delivery-manifest.json').is_file():
            slide_delivery_files(slides, number)
    # Only replace this script's generated output directory, never course sources.
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    if notes_only_update:
        # Reuse the committed release byte-for-byte; unrelated cloud source
        # assets need not be downloaded again for a new standalone chapter.
        with tempfile.TemporaryFile() as archive:
            subprocess.run(['git', 'archive', 'HEAD', 'dist'], cwd=SITE, stdout=archive, check=True)
            archive.seek(0)
            with tarfile.open(fileobj=archive) as saved:
                saved.extractall(SITE)
        for name in ('index.html', 'outline.html'):
            shutil.copy2(notes/name, DIST/'notes'/name)
    else:
        copy_tree(notes, DIST/'notes')
    for n in sorted(STANDALONE_NOTES):
        (DIST/'notes'/f'lecture{n:02d}.html').write_text(standalone_content(root, n))
    missing_poster = DIST/'notes/figures/lecture01/slide10-image18.png'
    if not missing_poster.exists():
        shutil.copy2(slides/'assets/from-ppt/slide10-image18.png', missing_poster)
    if not notes_only_update:
        copy_tree(slides/'assets', DIST/'slides/assets')
    # Retain attribution and licensing, but not internal review or prompt references.
    for path in DIST.rglob('SOURCES.md'):
        text = path.read_text()
        text = re.sub(r'^- `qa/.*\n?', '', text, flags=re.M)
        text = re.sub(r'^本次独立概率.*\n?', '', text, flags=re.M)
        text = re.sub(r'截取与加工脚本及检查证据见`qa/[^`]+`。', '', text)
        text = re.sub(r'验证另用.*?结果保存于 `verification.json`。', '', text)
        text = re.sub(r'(?:完整初始与修订提示词|提示词完整保存在|完整提示词见|提示词见)[^。]*。', '', text)
        # Prompt subsections are internal production records, not attribution.
        if 'lecture03' in path.parts:
            text = re.sub(r'^### [^\n]*提示词[^\n]*\n.*?(?=^## |\Z)', '', text, flags=re.M|re.S)
            text = '\n'.join(line for line in text.splitlines() if not re.search(r'qa/|scripts/|提示词|核验记录|未对外发布|原始生成文件', line)) + '\n'
        path.write_text(text)
    for name in [f'lecture{n:02d}{suffix}.html' for n in sorted(PUBLISHED_SLIDES if not notes_only_update else set()) for suffix in ('', '-backup')]:
        if not withheld(Path('slides')/name) and (slides/name).is_file():
            text = (slides/name).read_text()
            text = re.sub(r'<aside\b[^>]*class="[^"]*\bnotes\b[^"]*"[^>]*>.*?</aside>', '', text, flags=re.S)
            (DIST/'slides'/name).write_text(text)
    if not notes_only_update:
        use_shared_slide_images(DIST/'slides')
    (DIST/'assets').mkdir(exist_ok=True)
    if not notes_only_update:
        shutil.copy2(slides/'assets/branding/csu-logo.png', DIST/'assets/csu-logo.png')
    (DIST/'downloads').mkdir(exist_ok=True)
    for n in sorted(PUBLISHED_PDFS if not notes_only_update else set()):
        shutil.copy2(pdfs[n][0], DIST/f'downloads/lecture{n:02d}-slides.pdf')
    shutil.copy2(SITE/'site.css', DIST/'site.css')
    (DIST/'.nojekyll').touch()
    notes_nav = '''<style>.course-site-return{display:inline-block;margin:0 0 18px;font:500 15px/1.6 sans-serif;color:#07529c;text-decoration:none}.course-site-return:hover{text-decoration:underline}</style>'''
    for path in (DIST/'notes').glob('*.html'):
        text = sanitize_notes(path.read_text())
        text = text.replace('</head>',notes_nav+'</head>',1)
        text = re.sub(r'(<main\b[^>]*>)',r'\1<a class="course-site-return" href="../index.html">← 课程首页 · 讲义与课件</a>',text,count=1)
        path.write_text(text)
    for name, content in preserved_notes.items():
        (DIST/'notes'/name).write_text(sanitize_notes(content.decode()))
    # Body preservation must not restore stale chapter names or retired links.
    nav_source = notes / 'index.html'
    sync_notes_sidebar(DIST/'notes', nav_source)
    for path in (DIST/'notes/assets/lecture01').glob('*.json'):
        path.unlink()
    # Search is rebuilt from the sanitized output to avoid stale internal text.
    search = DIST/'notes/search.json'
    if search.exists():
        items = [item for item in json.loads(search.read_text()) if not withheld(item.get('href', ''))]
        if partial_update:
            items = preserved_search + [item for item in items if item.get('href', '').split('#')[0] in refreshed_pages]
        for n in sorted(STANDALONE_NOTES):
            name = f'lecture{n:02d}.html'
            items = [item for item in items if item.get('href', '').split('#')[0] != name]
            text = (DIST/'notes'/name).read_text()
            title = unescape(re.search(r'<title>(.*?)</title>', text, re.S)[1])
            body = re.search(r'<main\b[^>]*>(.*?)</main>', text, re.S)[1]
            body = re.sub(r'<(?:script|style)\b[^>]*>.*?</(?:script|style)>', '', body, flags=re.S)
            plain = unescape(re.sub(r'<[^>]+>', ' ', body))
            items.append(dict(objectID=name, href=name, title=title, section='', text=re.sub(r'\s+', ' ', plain)))
        # Quarto's incremental index may retain entries for renamed syllabus headings.
        outline_ids = set(re.findall(r'\bid="([^"]+)"', (DIST/'notes/outline.html').read_text()))
        items = [item for item in items
                 if not item.get('href', '').startswith('outline.html#')
                 or unquote(item['href'].split('#', 1)[1]) in outline_ids]
        for item in items:
            for key in ('title', 'section', 'text'):
                if isinstance(item.get(key), str):
                    item[key] = item[key].replace('量子调控：如何控制一个量子比特？', '量子调控：如何控制量子态？')
                    item[key] = item[key].replace('量子比特：状态、测量与调控', '量子比特：如何描述状态与预测测量？')
                    if item.get('href', '').startswith('outline.html'):
                        item[key] = item[key].replace('第3讲　怎样控制一个量子比特？', '第3讲　量子调控：如何控制量子态？')
            if isinstance(item.get('text'),str):
                if 4 in PUBLISHED:
                    item['text'] = item['text'].replace('第一至三讲已有完整资料，后续资料在授课后发布。', '第一至三讲已有完整资料，第四讲讲义已可阅读，后续资料在授课后发布。')
                item['text'] = re.sub(r'图件计算与本讲新增算例的核验记录可分别查看.*?讲义计算核验。','',item['text'])
        search.write_text(json.dumps(items,ensure_ascii=False))
    source = (root/'quantum-notes/outline.qmd').read_text()
    units = []
    for unit_title, unit_text in re.findall(r'^## (第[一二三四]单元：[^\n]+)\n(.*?)(?=^## |\Z)',source,re.M|re.S):
        lectures = [(number, re.sub(r'\s*\{[^}]*\}\s*$', '', title))
                    for number, title in re.findall(r'^### 第(\d+)讲[　 ]+([^\n]+)',unit_text,re.M)]
        units.append((unit_title,lectures))
    titles = {int(number): title for _, lectures in units for number, title in lectures}
    summaries = {
        1: (titles[1], '整数分解 → 量子力学 → 量子信息 → 光与控制'),
        2: (titles[2], '从偏振实验出发，用量子态预测测量，理解筛选、相位调控与不同物理系统中的量子比特。'),
        3: (titles[3], '从量子态的演化出发，学习共振驱动、脉冲时长与相位调控，制备并检验目标态，理解单比特量子门。'),
        4: (titles[4], '第四讲讲义、课堂课件与互动演示。'),
        5: (titles[5], '在线讲义与互动演示。'),
        6: (titles[6], '在线讲义、课堂课件与互动演示。' if 6 in PUBLISHED else '课堂课件与两处互动演示。')
    }
    for number in sorted(PUBLISHED | PUBLISHED_SLIDES):
        summaries.setdefault(number, (titles[number], '在线讲义与互动演示。'))
    rows=[]
    for number,(title,summary) in summaries.items():
        if number not in (PUBLISHED | PUBLISHED_SLIDES):
            continue
        name=f'lecture{number:02d}'
        times = [note_sources[number].stat().st_mtime] if number in PUBLISHED else []
        slide_links = ''
        if number in PUBLISHED_SLIDES:
            times.append((slides/f'{name}.html').stat().st_mtime)
            slide_links = slide_link(number)
            if number in PUBLISHED_PDFS:
                slide_links += f'<a class="download" href="downloads/{name}-slides.pdf" download>课件 PDF · {pdfs[number][1]} 页 · {pdfs[number][0].stat().st_size/1_000_000:.1f} MB ↓</a>'
        changed=datetime.fromtimestamp(max(times)).strftime('%Y-%m-%d')
        entry = 'notes' if number in PUBLISHED else 'slides'
        note_link = f'<a class="action primary" href="notes/{name}.html" aria-label="阅读第{number}讲讲义">在线讲义</a>' if number in PUBLISHED else ''
        rows.append(f'''<article class="lecture"><div class="lecture-number" aria-hidden="true">{number:02d}</div><div><h3><a href="{entry}/{name}.html"><span class="sr-only">第 {number} 讲：</span>{title}</a></h3><p>{summary}</p><p class="revision">资料更新：{changed}</p></div><div class="actions">{note_link}{slide_links}</div></article>''')
    blocks=[]
    for unit_number, (title,lectures) in enumerate(units, 1):
        rows2=[]
        for number,name in lectures:
            n=int(number)
            short=summaries[n][0] if n in summaries else name
            content=f'<a href="notes/lecture{n:02d}.html">{escape(short)}</a>' if n in PUBLISHED else escape(short)
            status = '可阅读' if n in PUBLISHED else ('课题汇报' if n == 15 else '授课后发布')
            if n in PUBLISHED_SLIDES and n not in PUBLISHED:
                content = f'<a href="slides/lecture{n:02d}.html">{escape(short)}</a>'
                status = '课件已发布'
            rows2.append(f'<li><span class="num">{n:02d}</span><span class="lecture-title">{content}</span><span class="status">{status}</span></li>')
        first, last = int(lectures[0][0]), int(lectures[-1][0])
        blocks.append(f'<section class="unit" aria-labelledby="unit-{unit_number}"><div class="unit-heading"><h3 id="unit-{unit_number}">{escape(title)}</h3><p class="unit-range">第 {first}—{last} 讲</p></div><ol start="{first}">{"".join(rows2)}</ol></section>')
    page=(SITE/'index.template.html').read_text().replace('{{LECTURES}}',''.join(rows)).replace('{{CURRICULUM}}',''.join(blocks))
    page=page.replace('{{PUBLISHED_NUMBERS}}', '、'.join(str(n) for n in sorted(PUBLISHED)))
    (DIST/'index.html').write_text(new_tab_material_links(page))
    if 4 in PUBLISHED_PDFS:
        update_pdfs(root, [4])
    sync_share_assets()
    size=sum(p.stat().st_size for p in DIST.rglob('*') if p.is_file())
    print(f'Website ready: {size/1024/1024:.1f} MiB; {len(units)} units, {sum(len(x[1]) for x in units)} lectures.')

if __name__=='__main__':
    main()
