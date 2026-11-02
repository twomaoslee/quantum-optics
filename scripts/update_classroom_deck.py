#!/usr/bin/env python3
"""Update the classroom display layer without publishing unrelated QMD edits.

Input teaching HTML is an explicit, already published Git revision; the bridge
and scoped result styles are current source files in quantum-slides. This is a
bounded release operation, not a substitute for rendering edited lesson content.
"""
from pathlib import Path
import argparse, hashlib, json, re, subprocess

SITE=Path(__file__).resolve().parents[1]
ROOT=SITE.parent

def update(base_ref):
    base=subprocess.check_output(['git','show',f'{base_ref}:dist/slides/lecture07.html'],cwd=SITE).decode()
    bridge=(ROOT/'quantum-slides/assets/classroom/lecture-bridge.js').read_text()
    css=(ROOT/'quantum-slides/lecture07.css').read_text()
    overlay_pattern=r'\.reveal \.qo-classroom-results \.question\{.*?\.reveal \.qo-classroom-results \.classroom-slot iframe\{[^}]*\}'
    inline_pattern=r'\.reveal \.qo-classroom-results \.classroom-slot\{overflow:hidden\}'
    sidebar_pattern=r'/\* Classroom sidebar:.*?/\* End classroom sidebar\. \*/'
    overlay=re.search(sidebar_pattern,css,re.S)[0]
    marker='/* Question-specific controls share a classroom; only the visible frame polls. */'
    changes={'js':0,'css':0}
    def script(match):
        body=match[2]
        if marker not in body:return match[0]
        changes['js']+=1
        return match[1]+body[:body.index(marker)]+bridge+match[3]
    def style(match):
        body=match[2]
        if 'qo-classroom-inline' not in body:return match[0]
        changes['css']+=1
        body=re.sub(overlay_pattern,'',body,flags=re.S)
        body=re.sub(inline_pattern,'',body)
        body=re.sub(sidebar_pattern,'',body,flags=re.S)
        return match[1]+body+'\n'+overlay+'\n'+match[3]
    result=re.sub(r'(<script\b[^>]*>)(.*?)(</script>)',script,base,flags=re.S)
    result=re.sub(r'(<style\b[^>]*>)(.*?)(</style>)',style,result,flags=re.S)
    if changes!={'js':1,'css':1}:raise SystemExit(f'Unexpected classroom source count: {changes}')
    target=SITE/'dist/slides/lecture07.html';target.write_text(result)
    return {'base_ref':base_ref,'base_sha256':hashlib.sha256(base.encode()).hexdigest(),'sha256':hashlib.sha256(result.encode()).hexdigest(),'updated_blocks':changes,'scope':'only classroom bridge and scoped full-height sidebar CSS'}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--base-ref',required=True)
    args=parser.parse_args();print(json.dumps(update(args.base_ref),ensure_ascii=False))
