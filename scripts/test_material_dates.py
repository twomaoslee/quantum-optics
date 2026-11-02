"""Check class-time invariance, publication changes and idempotent rendering."""
from pathlib import Path
from tempfile import TemporaryDirectory
from datetime import datetime
import json, shutil
from material_dates import sync_dates, material_digest
site=Path(__file__).resolve().parents[1]
with TemporaryDirectory() as directory:
    root=Path(directory); (root/'dist/slides').mkdir(parents=True)
    shutil.copy2(site/'lecture-metadata.json',root/'lecture-metadata.json')
    (root/'dist/slides/lecture06.html').write_text('version 1')
    config=json.loads((root/'lecture-metadata.json').read_text())
    config['lectures']={'6':config['lectures']['6']}
    config['lectures']['6']['materials_updated']='2026-10-26'
    config['lectures']['6']['published_materials_sha256']=material_digest(root,6)
    (root/'lecture-metadata.json').write_text(json.dumps(config))
    (root/'dist/index.html').write_text('<article class="lecture"><div class="lecture-number">06</div><p class="revision">资料更新：2026-10-26</p></article>')
    t1=datetime.fromisoformat('2026-11-01T12:00:00+08:00')
    sync_dates(root,now=t1)
    first=(root/'lecture-metadata.json').read_text()
    assert json.loads(first)['lectures']['6']['materials_updated']=='2026-10-26'
    (root/'dist/slides/lecture06.html').touch()
    sync_dates(root,now=t1)
    assert first==(root/'lecture-metadata.json').read_text()
    (root/'dist/slides/lecture06.html').write_text('version 2')
    sync_dates(root,now=t1)
    entry=json.loads((root/'lecture-metadata.json').read_text())['lectures']['6']
    assert entry['materials_updated']=='2026-11-01T12:00+08:00'
    assert entry['class_start']=='2026-10-26T10:00:00+08:00'
    assert entry['class_end']=='2026-10-26T11:40:00+08:00'
    sync_dates(root,now=t1)
    html=(root/'dist/index.html').read_text()
    assert html.count('class="lecture-dates"')==1
    assert '上课时间' not in html and 'class-time' not in html
    assert '资料更新时间：' in html
    # Another task may have an uncommitted deck in dist during a targeted release.
    config=json.loads((root/'lecture-metadata.json').read_text())
    config['lectures']['7']=dict(config['lectures']['6'])
    untouched=dict(config['lectures']['7'])
    (root/'lecture-metadata.json').write_text(json.dumps(config))
    (root/'dist/index.html').write_text(html+html.replace('>06<','>07<'))
    (root/'dist/slides/lecture07.html').write_text('another task draft')
    sync_dates(root,updated_numbers={6},now=t1)
    assert json.loads((root/'lecture-metadata.json').read_text())['lectures']['7']==untouched
print('Publication dates: no-op, mtime-only, content change, class-time invariance, idempotence and targeted-release isolation passed.')
