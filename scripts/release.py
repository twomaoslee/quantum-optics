"""Explicit teacher-controlled publication list, independent of source availability."""
from pathlib import Path
import json
import re

CONFIG = json.loads((Path(__file__).resolve().parents[1] / 'publication.json').read_text())
PUBLISHED = set(CONFIG['published_lectures'])
NOTES_ONLY = set(CONFIG.get('notes_only_lectures', []))
PUBLISHED_SLIDES = PUBLISHED - NOTES_ONLY
STANDALONE_NOTES = set(CONFIG.get('standalone_notes_lectures', NOTES_ONLY))
PUBLISHED_PDFS = set(CONFIG.get('published_pdf_lectures', PUBLISHED_SLIDES))
AFTER_CLASS = set(CONFIG['after_class_lectures'])

def withheld(path):
    slide_resource = any(part in {'slides', 'quantum-slides', 'downloads'} for part in Path(path).parts)
    allowed = PUBLISHED_PDFS if 'downloads' in Path(path).parts else (PUBLISHED_SLIDES if slide_resource else PUBLISHED)
    return any(int(n) not in allowed for n in re.findall(r'lecture(\d+)', str(path)))
