#!/usr/bin/env python3
"""Validate the same static output locally and in GitHub Actions."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import re
import sys
import json
from release import PUBLISHED, withheld

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

for path in DIST.rglob('*'):
    if not path.is_file():continue
    if withheld(path.relative_to(DIST)):
        errors.append(f'Unreleased course material in output: {path.relative_to(DIST)}')
    if path.stat().st_size>=100*1024*1024:errors.append(f'File exceeds GitHub limit: {path.relative_to(DIST)}')
    if path.suffix=='.html':
        if path.parent == DIST/'slides' and re.search(r'<aside\b[^>]*class="[^"]*\bnotes\b', path.read_text()):
            errors.append(f'Speaker notes in student slides: {path.name}')
        p=Links();p.feed(path.read_text())
        for ref in p.refs:check_ref(path,ref)
    elif path.suffix=='.css':
        for ref in re.findall(r'url\(\s*[\"\']?([^\)\"\']+)',path.read_text()):check_ref(path,ref)
for required in ['index.html','notes/index.html','.nojekyll'] + [f'downloads/lecture{n:02d}-slides.pdf' for n in PUBLISHED] + [f'{folder}/lecture{n:02d}.html' for folder in ('notes','slides') for n in PUBLISHED]:
    if not (DIST/required).exists():errors.append('Missing entrypoint: '+required)
for item in json.loads((DIST/'notes/search.json').read_text()):
    if withheld(item.get('href', '')):
        errors.append('Unreleased lecture in search: '+item['href'])
if errors:
    print('\n'.join(errors));sys.exit(1)
print(f'PASS: HTML and CSS local references resolve; entrypoints present; files under 100 MiB. {len(external)} external URLs retained (not network-tested).')
