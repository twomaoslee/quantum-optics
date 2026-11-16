"""Publish the course video recap pages and links."""
from html import escape
import re
import shutil


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
        shutil.copyfile(site / relative, output)

        name = f'lecture{lecture:02d}'
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
