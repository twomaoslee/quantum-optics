"""Export the packaged public notes as small, deterministic UTF-8 documents."""
from dataclasses import dataclass, field
from datetime import datetime
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from zoneinfo import ZoneInfo
import hashlib
import json
import re
import subprocess

BASE = 'https://zimin.li/quantum-optics/'
RAW_BASE = 'https://raw.githubusercontent.com/twomaoslee/quantum-optics/main/dist/'
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())
SKIP = set('script style nav footer button input select textarea template noscript'.split())
SKIP_CLASSES = set('course-site-return course-reading-menu mobile-toc toc sidebar anchorjs-link header-anchor nav-page notes'.split())
BLOCK = set('p div section article main header figure figcaption blockquote form fieldset legend details summary dl dt dd label'.split())
MATH = re.compile(r'<mjx-container\b[^>]*>.*?</mjx-container>', re.S)
ENTRY = '<p data-course-text-entry><a href="text/index.html">纯文本资料 · 供 AI 与文本阅读使用 →</a></p>'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def math_key(svg):
    return digest(re.sub(r'MJX-\d+', 'MJX-ID', svg).encode())


@dataclass
class Node:
    tag: str
    attrs: dict = field(default_factory=dict)
    children: list = field(default_factory=list)


class Tree(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = Node('root')
        self.stack = [self.root]
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, dict(attrs))
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                break

    def handle_data(self, text):
        self.stack[-1].children.append(text)


def nodes(node):
    if isinstance(node, Node):
        yield node
        for child in node.children:
            yield from nodes(child)


def clean(text):
    text = re.sub(r'[ \t\r\f\v]+', ' ', text)
    text = re.sub(r' *\n *', '\n', text)
    return re.sub(r'\n{3,}', '\n\n', text).strip()


def link_url(value, source_url):
    if not value or value.startswith(('data:', 'javascript:', 'blob:', 'file:')):
        return ''
    url = urljoin(source_url, value)
    return url if urlsplit(url).scheme in ('https', 'http', 'mailto') else ''


def render(node, source_url):
    if isinstance(node, str):
        return node
    tag, attrs = node.tag, node.attrs
    classes = set(attrs.get('class', '').split())
    if tag in SKIP or classes & SKIP_CLASSES or attrs.get('id') in ('TOC', 'mobile-toc'):
        return ''
    if tag == 'svg':
        # Inline diagrams have no equivalent geometry in text. Keep a label only.
        label = attrs.get('aria-label') or next((''.join(c for c in n.children if isinstance(c, str)) for n in nodes(node) if n.tag == 'title'), '')
        return '\n[图示' + (': ' + label if label else '，参见原网页') + ']\n'
    if tag in ('img', 'iframe', 'video', 'audio', 'canvas'):
        label = attrs.get('alt') or attrs.get('title') or attrs.get('aria-label') or '图像或互动，参见原网页'
        url = link_url(attrs.get('src', ''), source_url)
        return '\n[' + label + ']' + (' (' + url + ')' if url else '') + '\n'
    if tag == 'table':
        rows = []
        for row in nodes(node):
            if row.tag == 'tr':
                cells = [clean(''.join(render(c, source_url) for c in cell.children)).replace('\n', ' / ') for cell in row.children if isinstance(cell, Node) and cell.tag in ('th', 'td')]
                rows.append(' | '.join(cells))
        caption = ''.join(render(c, source_url) for c in node.children if isinstance(c, Node) and c.tag == 'caption')
        return '\n\n' + caption + '\n'.join(rows) + '\n\n'
    value = ''.join(render(child, source_url) for child in node.children)
    # These public attributes are consumed by the original quiz JavaScript.
    # Include the answer after the options, never execute that JavaScript.
    if attrs.get('data-correct'):
        value += '\n\n参考答案（原网页提交后显示）：' + attrs['data-correct']
        if attrs.get('data-explain'):
            value += '\n解析：' + attrs['data-explain']
    if re.fullmatch(r'h[1-6]', tag):
        return '\n\n' + '#' * int(tag[1]) + ' ' + clean(value) + '\n\n'
    if tag == 'a':
        url = link_url(attrs.get('href', ''), source_url)
        return value + (' (' + url + ')' if url and value.strip() else '')
    if tag == 'br':
        return '\n'
    if tag == 'li':
        return '\n- ' + value.strip() + '\n'
    if tag in ('ul', 'ol'):
        return '\n' + value + '\n'
    if tag == 'sup':
        return '^(' + value + ')'
    if tag == 'sub':
        return '_(' + value + ')'
    if tag in BLOCK:
        return '\n\n' + value.strip() + '\n\n'
    return value


def extract(html, source_url, math_map):
    def restore(match):
        key = math_key(match[0])
        if key not in math_map:
            raise ValueError('Published SVG formula has no verified TeX: ' + source_url)
        return escape(math_map[key])
    tree = Tree(MATH.sub(restore, html))
    mains = [n for n in nodes(tree.root) if n.tag == 'main']
    if len(mains) != 1:
        raise ValueError('Expected one main element: ' + source_url)
    title = next((clean(render(n, source_url)).lstrip('# ') for n in nodes(mains[0]) if n.tag == 'h1'), '')
    body = clean(render(mains[0], source_url)) + '\n'
    if not title or len(body) < 100:
        raise ValueError('Empty document: ' + source_url)
    return title, body


def source_pages(site, published):
    return [(name, site/'dist/notes'/f'{name}.html') for name in ['outline'] + [f'lecture{n:02d}' for n in sorted(published)]]


def refresh_math_map(site, pages, source_root):
    registry = site/'text-math.json'
    mapping = json.loads(registry.read_text()) if registry.exists() else {}
    required = {math_key(m[0]) for _, p in pages for m in MATH.finditer(p.read_text())}
    missing = required - mapping.keys()
    if missing:
        originals = [source_root/'quantum-notes/drafts'/f'{name}-study'/f'{name}.html' for name, p in pages if MATH.search(p.read_text())]
        originals = [p for p in originals if p.is_file()]
        if originals:
            recovered = json.loads(subprocess.check_output(['node', str(site/'scripts/recover_text_math.cjs'), *map(str, originals)], text=True))
            mapping.update({key: value for key, value in recovered.items() if key in required})
        if required - mapping.keys():
            raise ValueError('Cannot recover all published formulas; preserve original TeX when packaging notes.')
    mapping = {key: mapping[key] for key in sorted(required)}
    registry.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + '\n')
    return mapping


def make_outputs(site, published, math_map, previous=None, now=None):
    previous = previous or {}
    now = now or datetime.now(ZoneInfo('Asia/Shanghai')).isoformat(timespec='seconds')
    output, documents = {}, []
    for name, path in source_pages(site, published):
        source_url = BASE + 'notes/' + path.name
        html = path.read_text()
        title, body = extract(html, source_url, math_map)
        body_hash = digest(body.encode())
        old = next((d for d in previous.get('documents', []) if d['id'] == name), {})
        updated = old.get('updated_at', now) if old.get('text_sha256') == body_hash else now
        intro = (f'{title}\n原网页：{source_url}\n文本更新时间：{updated}\n正文版本：{body_hash[:16]}\n'
                 '格式：UTF-8纯文本，数学公式保留LaTeX。含原文选学与答案；图片和互动仅保留说明及可用链接，完整图示见原网页。\n\n')
        filename = 'text/' + name + '.txt'
        # Some static hosts omit charset for .txt. A UTF-8 BOM prevents browsers
        # from guessing a legacy Chinese encoding; the content remains text/plain.
        output[filename] = '\ufeff' + intro + body
        documents.append(dict(id=name, title=title, source='notes/'+path.name, source_sha256=digest(path.read_bytes()), text=filename, text_sha256=body_hash, file_sha256=digest(output[filename].encode()), updated_at=updated))
    updated = max(d['updated_at'] for d in documents)
    manifest = dict(format_version=1, updated_at=updated, documents=documents)
    output['text/manifest.json'] = json.dumps(manifest, ensure_ascii=False, indent=2) + '\n'
    index = ('# 量子光学课程：纯文本资料\n\n中南大学，应用物理专业大三；与量子力学同步学习。14次授课与1次课题汇报，每次90分钟。\n'
             f'资料更新时间：{updated}\n\n从当前公开网页自动提取。先读取全课程目录，再按需读取讲义。未来讲次仅列在目录中，正文仅含已发布讲次。\n'
             '文档头包含正文版本与更新时间；搜索摘要可能滞后。图片、视频和交互不能由纯文本完整替代。\n\n')
    index += '\n'.join(f'- [{d["title"]}]({BASE}{d["text"]}) · [GitHub原始文本]({RAW_BASE}{d["text"]})' for d in documents)
    index += f'\n\n[版本清单]({BASE}text/manifest.json)\n[网页资料入口]({BASE}text/index.html)\n'
    output['llms.txt'] = '\ufeff' + index
    gpt_index = ('# 量子光学课程：GPT读取入口\n\n'
                 f'文本更新时间：{updated}\n'
                 '以下是课程公开讲义的自动同步纯文本副本，直接使用GitHub原始文件地址。\n'
                 '若课程域名无法读取，请直接打开下面的链接，无需跳转到原网页。先读课程目录，再按需读取各讲；长文应继续读取后续段落，不能仅以工具首段预览声称通读。\n'
                 '文本保留公式、选学与参考答案；图片和互动仍以原网页为准。\n\n')
    gpt_index += '\n'.join(f'- [{d["title"]}]({RAW_BASE}{d["text"]})' for d in documents)
    gpt_index += f'\n\n[当前版本清单]({RAW_BASE}text/manifest.json)\n'
    output['text/gpt.txt'] = '\ufeff' + gpt_index
    links = ''.join(f'<li><a href="{d["id"]}.txt">{escape(d["title"])}</a></li>' for d in documents)
    output['text/index.html'] = ('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>纯文本资料 · 量子光学</title><style>body{font:18px/1.8 system-ui,sans-serif;max-width:850px;margin:40px auto;padding:0 20px;color:#193653}a{color:#075aa3}li{margin:12px 0}</style></head><body><main>'
        '<p><a href="../index.html">← 课程首页</a></p><h1>纯文本资料</h1><p>供 AI 工具与文本阅读使用。与网站公开的大纲和讲义同步，保留正文、公式、选学与答案。完整图示及互动请阅读原网页。</p>'
        f'<p>资料更新时间：{updated}</p><p><a href="{RAW_BASE}text/gpt.txt">给 GPT 的读取入口（GitHub 原始文本）</a></p><p><a href="../llms.txt">网站纯文本总入口</a> · <a href="manifest.json">版本清单</a></p><ul>{links}</ul></main></body></html>')
    return output


def sync_text(site, published, source_root=None):
    site = Path(site)
    pages = source_pages(site, published)
    mapping = refresh_math_map(site, pages, Path(source_root) if source_root else site.parent)
    manifest = site/'dist/text/manifest.json'
    previous = json.loads(manifest.read_text()) if manifest.exists() else {}
    outputs = make_outputs(site, published, mapping, previous)
    destination = site/'dist/text'
    destination.mkdir(exist_ok=True)
    for path in destination.iterdir():
        if path.is_file() and 'text/'+path.name not in outputs:
            path.unlink()
    for relative, content in outputs.items():
        (site/'dist'/relative).write_text(content)
    homepage = site/'dist/index.html'
    html = homepage.read_text()
    if 'data-course-text-entry' not in html:
        marker = '<h2 id="usage-title">阅读与使用</h2><div>'
        if marker not in html:
            raise ValueError('Missing homepage reading section')
        homepage.write_text(html.replace(marker, marker+ENTRY, 1))


def validate_text(site, published):
    site = Path(site)
    try:
        manifest = json.loads((site/'dist/text/manifest.json').read_text())
        mapping = json.loads((site/'text-math.json').read_text())
        expected = make_outputs(site, published, mapping, manifest)
        errors = []
        for relative, value in expected.items():
            path = site/'dist'/relative
            actual = path.read_text() if path.exists() else ''
            # Favicon injection is a shared packaging step for HTML only.
            if relative.endswith('.html'):
                from favicon import without_favicon
                actual = without_favicon(actual.encode(), Path(relative)).decode()
            if actual != value:
                errors.append('Plain-text export missing or stale: '+relative)
            if re.search(r'/Users/|file:///|data:[^\s]+;base64|<script\b|<mjx-container\b', actual):
                errors.append('Internal or executable payload in text export: '+relative)
        actual_files = {'text/'+p.name for p in (site/'dist/text').iterdir() if p.is_file()}
        if actual_files != {name for name in expected if name.startswith('text/')}:
            errors.append('Unexpected or unreleased plain-text file')
        if 'data-course-text-entry' not in (site/'dist/index.html').read_text():
            errors.append('Missing plain-text homepage entry')
        return errors
    except (ValueError, KeyError, OSError) as error:
        return ['Plain-text validation failed: '+str(error)]
