"""Apply the course reading layout to rendered Quarto chapters."""
from html import escape, unescape
import json
import re
from urllib.parse import quote

READING_LECTURES = frozenset(range(1, 8))
MAIN = re.compile(r'(<main\b[^>]*>)(.*?)(</main>)', re.S)
HEADING = re.compile(
    r'(<h([234])\b(?=[^>]*\b(?:data-anchor-id|id)="([^"]+)")([^>]*)>)(.*?)(</h\2>)',
    re.S,
)
TAG = re.compile(r'<[^>]+>')
PREFIX = re.compile(
    r'^(?:<span class="header-section-number">[^<]+</span>\s*'
    r'|\d+\.(?:\d+(?:\.\d+)?)?\s+|[一二三四五六七八九十]+、)'
)


def plain(markup):
    markup = re.sub(r'<(?:script|style|svg)\b[^>]*>.*?</(?:script|style|svg)>', '', markup, flags=re.S)
    return ' '.join(unescape(TAG.sub('', markup)).split())


def section_headings(body):
    """Take real section headings, including the label for an existing introduction."""
    ids = {m[1] for m in re.finditer(r'<section\b[^>]*\bid="([^"]+)"[^>]*>', body)
           if 'callout-body' not in m[0]}
    ids.add('course-reading-intro')
    return [m for m in HEADING.finditer(body) if m[3] in ids]


def number_headings(body, lecture):
    if lecture not in (2, 4):
        return body
    pieces = []
    previous = 0
    counts = [0, 0, 0]
    for heading in section_headings(body):
        level = int(heading[2]) - 2
        if 'unnumbered' in heading[4] or any(count == 0 for count in counts[:level]):
            continue
        counts[level] += 1
        counts[level + 1:] = [0] * (2 - level)
        number = '.'.join(map(str, counts[:level + 1])) + ('.' if level == 0 else '')
        label = PREFIX.sub('', heading[5], count=1)
        pieces.extend((body[previous:heading.start()], heading[1],
                       f'<span class="header-section-number">{number}</span> ', label, heading[6]))
        previous = heading.end()
    return ''.join(pieces) + body[previous:]


def style_chapter(html, lecture, css, script):
    # Reapplying to a released chapter refreshes the shared shell without nesting it.
    html = re.sub(r'\n<!-- course-reading:(?:head|bar|toc|menu|script) -->.*?'
                  r'<!-- /course-reading -->\n', '', html, flags=re.S)
    match = MAIN.search(html)
    if not match or html.count('id="quarto-content"') != 1:
        raise ValueError(f'Expected Quarto reading layout in lecture {lecture}')
    body = match[2]
    body = re.sub(r'(<h1\b[^>]*>(?:<span\b[^>]*>)*)(第[一二三四五六七]讲)([　 ]+)',
                  r'\1<span class="course-reading-kicker">\2</span> ', body, count=1)
    if lecture in (1, 2) and 'id="course-reading-intro"' not in body:
        body = body.replace('</header>', '</header>\n<h2 id="course-reading-intro" '
                            'class="course-reading-guide unnumbered">本讲导读</h2>', 1)
    body = number_headings(body, lecture)
    headings = section_headings(body)
    if not headings:
        raise ValueError(f'Missing chapter headings in lecture {lecture}')
    links = ''.join(
        f'<a href="#{quote(unescape(m[3]))}" data-level="{m[2]}">{escape(plain(m[5]))}</a>\n'
        for m in headings
    )

    def block(name, markup):
        return f'\n<!-- course-reading:{name} -->\n{markup}\n<!-- /course-reading -->\n'

    toc = block('toc', '<aside class="course-reading-toc"><div class="course-reading-toc-title">本讲目录</div>'
                '<nav class="course-reading-nav" aria-label="本讲目录">\n' + links + '</nav></aside>')
    menu = block('menu', '<details class="course-reading-menu"><summary>本讲目录</summary>'
                 '<nav class="course-reading-nav" aria-label="本讲目录">\n' + links + '</nav></details>')
    bar = block('bar', '<header class="course-reading-bar"><div class="course-reading-bar-inner">'
                '<a class="course-reading-brand" href="../index.html">量子光学 · 课程首页</a>'
                '<a href="index.html">全课程目录与搜索</a></div></header>')
    html = html[:match.start()] + toc + match[1] + menu + body + match[3] + html[match.end():]
    html = re.sub(r'(<body class=")(?!course-reading\b)', r'\1course-reading ', html, count=1)
    html = re.sub(r'(<body\b[^>]*>)', lambda m: m[0] + bar, html, count=1)
    html = html.replace('</head>', block('head', '<style>\n' + css + '</style>') + '</head>', 1)
    html = html.replace('</body>', block('script', '<script>\n' + script + '</script>') + '</body>', 1)
    return html, body


def sync_reading_style(site, lectures):
    notes = site / 'dist/notes'
    assets = site / 'assets/notes'
    css = (assets / 'reading.css').read_text()
    script = (assets / 'reading.js').read_text()
    search = notes / 'search.json'
    items = json.loads(search.read_text())
    for lecture in sorted(READING_LECTURES & set(lectures)):
        name = f'lecture{lecture:02d}.html'
        page = notes / name
        html, body = style_chapter(page.read_text(), lecture, css, script)
        if lecture in (2, 4):
            # These chapters gained visible numbering. Refresh their section records
            # from the release, discarding stale entries for renamed/removed anchors.
            title = plain(re.search(r'<title>(.*?)</title>', html, re.S)[1])
            headings = section_headings(body)
            records = []
            start = headings[0].start()
            if start:
                records.append(dict(objectID=name, href=name, title=title, section='', text=plain(body[:start])))
            for index, heading in enumerate(headings):
                end = headings[index + 1].start() if index + 1 < len(headings) else len(body)
                href = name + '#' + unescape(heading[3])
                records.append(dict(objectID=href, href=href, title=title, section=plain(heading[5]),
                                    text=plain(body[heading.end():end])))
            first = next((i for i, item in enumerate(items) if item['href'].split('#')[0] == name), len(items))
            items = [item for item in items if item['href'].split('#')[0] != name]
            items[first:first] = records
        page.write_text(html)
    updated = json.dumps(items, ensure_ascii=False)
    if search.read_text() != updated:
        search.write_text(updated)
