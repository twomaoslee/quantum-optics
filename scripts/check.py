#!/usr/bin/env python3
"""Validate the same static output locally and in GitHub Actions."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import re
import sys
import json
import hashlib
from favicon import ASSET, HEAD, icon_markup, without_favicon
from release import PUBLISHED, PUBLISHED_SLIDES, STANDALONE_NOTES, PUBLISHED_PDFS, withheld

DIST=Path(__file__).resolve().parents[1]/'dist'
errors=[]
external=set()
class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.refs=[]
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key in {'src','href','poster','data-src'} and value:
                self.refs.append(value)

def check_ref(path,ref):
    parsed=urlsplit(ref)
    if parsed.scheme in {'http','https'} or parsed.netloc:
        external.add(ref);return
    if parsed.scheme in {'mailto','tel','data','javascript','blob'} or not parsed.path:return
    if parsed.scheme or parsed.path.startswith('/'):
        errors.append(f'{path.relative_to(DIST)}: nonportable reference {ref[:180]}');return
    target=(path.parent/unquote(parsed.path)).resolve()
    if not target.is_relative_to(DIST.resolve()):
        errors.append(f'{path.relative_to(DIST)}: outside website {ref}');return
    if target.is_dir():target=target/'index.html'
    if not target.exists():errors.append(f'{path.relative_to(DIST)}: missing {ref}')

if not (DIST/ASSET).is_file() or (DIST/ASSET).read_bytes() != (DIST.parent/ASSET).read_bytes():
    errors.append('Shared tab icon missing or out of sync')
for path in DIST.rglob('*'):
    if not path.is_file():continue
    if withheld(path.relative_to(DIST)):
        errors.append(f'Unreleased course material in output: {path.relative_to(DIST)}')
    if any(part in {'qa', 'archive', '__pycache__'} for part in path.relative_to(DIST).parts) or 'prompt' in path.name.lower():
        errors.append(f'Internal production file in output: {path.relative_to(DIST)}')
    if 'lecture03' in path.parts and path.suffix in {'.html', '.js', '.css', '.md'}:
        if re.search(r'/Users/|file:///|qa/|提示词|核验记录', path.read_text()):
            errors.append(f'Internal record in lecture 3 output: {path.relative_to(DIST)}')
    if path.stat().st_size>=100*1024*1024:errors.append(f'File exceeds GitHub limit: {path.relative_to(DIST)}')
    if path.suffix=='.html':
        head = HEAD.search(path.read_bytes())
        if head and not head[2].endswith(icon_markup(path.relative_to(DIST))):
            errors.append(f'Shared tab icon missing: {path.relative_to(DIST)}')
        if path.parent == DIST/'slides' and 'course-local-layout-guide' in path.read_text():
            errors.append(f'Local layout guide in student slides: {path.name}')
        if path.parent == DIST/'slides' and re.search(r'<aside\b[^>]*class="[^"]*\bnotes\b', path.read_text()):
            errors.append(f'Speaker notes in student slides: {path.name}')
        p=Links();p.feed(path.read_text())
        for ref in p.refs:check_ref(path,ref)
    elif path.suffix=='.css':
        for ref in re.findall(r'url\(\s*[\"\']?([^\)\"\']+)',path.read_text()):check_ref(path,ref)
for required in ['index.html','notes/index.html','.nojekyll'] + [f'downloads/lecture{n:02d}-slides.pdf' for n in PUBLISHED_PDFS] + [f'notes/lecture{n:02d}.html' for n in PUBLISHED] + [f'slides/lecture{n:02d}.html' for n in PUBLISHED_SLIDES]:
    if not (DIST/required).exists():errors.append('Missing entrypoint: '+required)
for item in json.loads((DIST/'notes/search.json').read_text()):
    if withheld(item.get('href', '')):
        errors.append('Unreleased lecture in search: '+item['href'])
classroom_manifest = DIST.parent/'classroom-cloudbase/release-readiness.json'
if classroom_manifest.exists():
    classroom = json.loads(classroom_manifest.read_text())
    if classroom.get('local_browser') != 'passed' or classroom.get('backend_tests') != 'passed':
        errors.append('Classroom local acceptance incomplete')
    expected = set(classroom['public_files'])
    for relative in expected:
        path = DIST/'classroom'/relative
        content = path.read_bytes() if path.is_file() else b''
        if path.suffix == '.html':
            content = without_favicon(content, path.relative_to(DIST))
        if not path.is_file() or hashlib.sha256(content).hexdigest() != classroom['sha256'].get('classroom/'+relative):
            errors.append('Classroom static asset version mismatch: '+relative)
    for path in (DIST/'classroom').rglob('*'):
        if path.is_file() and path.relative_to(DIST/'classroom').as_posix() not in expected:
            errors.append('Unexpected file in public classroom client: '+path.name)
homepage = (DIST/'index.html').read_text()
from lecture_descriptions import load_descriptions, render_description
descriptions = load_descriptions(DIST.parent)
for card in re.findall(r'<article class="lecture">.*?</article>', homepage, re.S):
    number = str(int(re.search(r'<div class="lecture-number"[^>]*>(\d+)</div>', card)[1]))
    introduction = re.search(r'</h3>\s*<p>(.*?)</p>', card, re.S)
    if not introduction or introduction[1] != render_description(descriptions[number]):
        errors.append('Homepage introduction version mismatch: lecture '+number)
recap_config = json.loads((DIST.parent/'publication.json').read_text()).get('classroom_recaps', {})
for number, entry in recap_config.items():
    release = json.loads((DIST.parent/entry['acceptance']).read_text())
    output = DIST/entry['output']
    if not output.is_file() or hashlib.sha256(without_favicon(output.read_bytes(), output.relative_to(DIST))).hexdigest() != release['html_sha256']:
        errors.append('Classroom recap output version mismatch: '+number)
    for relative, expected in release['sources'].items():
        source = DIST.parent/relative
        if not source.is_file() or hashlib.sha256(source.read_bytes()).hexdigest() != expected:
            errors.append('Classroom recap source version mismatch: '+relative)
    if f'href="{entry["output"]}"' not in homepage:
        errors.append('Missing classroom recap homepage entry: '+number)
from material_dates import date_markup
metadata = json.loads((DIST.parent/'lecture-metadata.json').read_text())
for card in re.findall(r'<article class="lecture">.*?</article>', homepage, re.S):
    number = str(int(re.search(r'<div class="lecture-number"[^>]*>(\d+)</div>', card)[1]))
    if card.count('class="lecture-dates"') != 1 or date_markup(metadata, metadata['lectures'][number]) not in card:
        errors.append('Class time and material update metadata mismatch: lecture '+number)
for number in PUBLISHED:
    if f'href="notes/lecture{number:02d}.html"' not in homepage:
        errors.append(f'Missing homepage notes entry: lecture {number}')
for number in PUBLISHED_SLIDES:
    if f'href="slides/lecture{number:02d}.html"' not in homepage:
        errors.append(f'Missing homepage slide entry: lecture {number}')
for number in PUBLISHED_SLIDES - PUBLISHED:
    if f'href="notes/lecture{number:02d}.html"' in homepage:
        errors.append(f'Unreleased notes entry: lecture {number}')
    curriculum = re.search(rf'<li><span class="num">{number:02d}</span>.*?</li>', homepage)
    if not curriculum or '课件已发布' not in curriculum[0]:
        errors.append(f'Incorrect slides-only curriculum status: lecture {number}')
# Partial releases preserve chapter bodies, but must share one current sidebar.
class Sidebar(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.active=[]; self.link=None
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag == 'a' and 'sidebar-link' in attrs.get('class', '').split():
            self.link=[attrs.get('href', ''), '']
            self.links.append(self.link)
            if 'active' in attrs.get('class', '').split():
                self.active.append(attrs.get('href', ''))
                if attrs.get('aria-current') != 'page':
                    errors.append('Active sidebar link lacks aria-current')
    def handle_data(self, text):
        if self.link is not None: self.link[1] += text
    def handle_endtag(self, tag):
        if tag == 'a': self.link=None

canonical=None
for page in sorted((DIST/'notes').glob('*.html')):
    match=re.search(r'<nav\b[^>]*\bid="quarto-sidebar"[^>]*>.*?</nav>', page.read_text(), re.S)
    if not match:
        if page.name in {f'lecture{n:02d}.html' for n in STANDALONE_NOTES}:
            text = page.read_text()
            toc = 'id="TOC"' in text or re.search(r'<aside\b[^>]*class="[^"]*\btoc\b', text)
            if 'class="course-site-return"' not in text or not toc:
                errors.append(f'Missing standalone notes navigation: {page.name}')
            continue
        errors.append(f'Missing notes sidebar: {page.name}'); continue
    sidebar=Sidebar(); sidebar.feed(match[0])
    if canonical is None: canonical=sidebar.links
    elif sidebar.links != canonical:
        errors.append(f'Inconsistent notes sidebar: {page.name}')
    expected=[href for href, _ in sidebar.links if href.removeprefix('./') == page.name]
    if sidebar.active != expected:
        errors.append(f'Incorrect current chapter in sidebar: {page.name}')
if errors:
    print('\n'.join(errors));sys.exit(1)
print(f'PASS: HTML and CSS local references resolve; entrypoints present; files under 100 MiB. {len(external)} external URLs retained (not network-tested).')
