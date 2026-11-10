"""Apply shared tab branding to the already packaged HTML documents."""
from pathlib import Path
import re
import shutil

ASSET = Path('assets/favicon.svg')
HEAD = re.compile(rb'(<head(?:\s[^>]*)?>)(.*?)(</head\s*>)', re.I | re.S)
LEGACY_HOME_ICON = re.compile(rb'<link rel="icon" type="image/svg\+xml" href="data:image/svg\+xml,[^"]+">\n?')


def icon_markup(relative):
    href = '../' * (len(relative.parts) - 1) + ASSET.as_posix()
    return f'<link rel="icon" type="image/svg+xml" href="{href}">\n'.encode()


def without_favicon(content, relative):
    """Recover the accepted classroom/recap bytes before site branding."""
    return HEAD.sub(lambda m: m[1] + m[2].removesuffix(icon_markup(relative)) + m[3],
                    content, count=1)


def sync_favicon(site):
    dist = site / 'dist'
    (dist / ASSET).parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(site / ASSET, dist / ASSET)
    for path in dist.rglob('*.html'):
        relative = path.relative_to(dist)
        content = path.read_bytes()
        icon = icon_markup(relative)

        def brand(match):
            head = match[2]
            if relative == Path('index.html'):
                head = LEGACY_HOME_ICON.sub(b'', head, count=1)
            return match[1] + (head if head.endswith(icon) else head + icon) + match[3]

        # Embeddable HTML fragments have no head and are left unchanged.
        branded = HEAD.sub(brand, content, count=1)
        if branded != content:
            path.write_bytes(branded)
