from pathlib import Path
import runpy

sync = runpy.run_path(str(Path(__file__).with_name('sync-quarto-questions.py')))['sync_lecture']
sync('09', 8)
