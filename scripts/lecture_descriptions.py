"""Keep each homepage introduction tied to its editable, lecture-specific source."""
from pathlib import Path
from html import escape
import json
import re


def load_descriptions(site):
    site = Path(site)
    data = json.loads((site / 'lecture-descriptions.json').read_text())
    config = json.loads((site / 'publication.json').read_text())
    numbers = set(config['published_lectures']) | set(config.get('slides_only_lectures', []))
    for number in numbers:
        if not isinstance(data.get(str(number)), str) or not data[str(number)].strip():
            raise ValueError(f'Write the content and new concepts/tools introduction for Lecture {number}.')
    return data


def render_description(text):
    return '<br>\n'.join(escape(line) for line in text.split('\n'))


def sync_descriptions(site):
    site = Path(site)
    descriptions = load_descriptions(site)
    homepage = site / 'dist/index.html'
    def update(match):
        card = match[0]
        number = str(int(re.search(r'<div class="lecture-number"[^>]*>(\d+)</div>', card)[1]))
        description = render_description(descriptions[number])
        card, count = re.subn(r'(</h3>\s*<p>).*?(</p>)', lambda m: m[1] + description + m[2], card, count=1, flags=re.S)
        if count != 1:
            raise ValueError('Missing introduction position for Lecture ' + number)
        return card
    homepage.write_text(re.sub(r'<article class="lecture">.*?</article>', update, homepage.read_text(), flags=re.S))
