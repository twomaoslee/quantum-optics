"""Explicit teacher-controlled publication list, independent of source availability."""
from pathlib import Path
import json
import re

CONFIG = json.loads((Path(__file__).resolve().parents[1] / 'publication.json').read_text())
PUBLISHED = set(CONFIG['published_lectures'])
AFTER_CLASS = set(CONFIG['after_class_lectures'])

def withheld(path):
    return any(int(n) not in PUBLISHED for n in re.findall(r'lecture(\d+)', str(path)))
