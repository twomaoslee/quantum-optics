"""Regression checks for mathematical fidelity and publication boundaries."""
import json
from pathlib import Path
import tempfile
import unittest
from text_export import extract, make_outputs, math_key, sync_text, validate_text


class TextExportTests(unittest.TestCase):
    def test_math_answers_tables_and_links_survive(self):
        svg = '<mjx-container><svg id="MJX-12">rendered</svg></mjx-container>'
        html = r'''<nav>IGNORE NAV</nav><main><h1>课堂正文</h1>
        <p>''' + '这是公开的正文内容。' * 12 + r'''</p>
        <p>\(a&lt;b\) ''' + svg + r'''</p>
        <script>SECRET_SCRIPT</script><style>SECRET_STYLE</style>
        <table><tr><th>对象</th><th>结果</th></tr><tr><td>真空</td><td>\(1/4\)</td></tr></table>
        <details><summary>选学</summary><p>补充推导</p></details>
        <div hidden>参考答案</div><a href="figure.svg">原图</a>
        <img alt="实验装置" src="data:image/png;base64,SECRET_BYTES">
        <div data-correct="B" data-explain="这是网页的原始解析">题目选项</div>
        <button>SECRET_BUTTON</button></main><footer>IGNORE FOOTER</footer>'''
        _, text = extract(html, 'https://example.org/notes/page.html', {math_key(svg): r'\[\frac{1}{2}\]'})
        for expected in [r'\(a<b\)', r'\[\frac{1}{2}\]', '对象 | 结果', '选学', '补充推导', '参考答案', 'https://example.org/notes/figure.svg', '实验装置', '提交后显示）：B', '这是网页的原始解析']:
            self.assertIn(expected, text)
        for excluded in ['SECRET_', 'IGNORE', 'data:image', 'rendered']:
            self.assertNotIn(excluded, text)

    def test_unknown_svg_fails_instead_of_dropping_formula(self):
        with self.assertRaisesRegex(ValueError, 'no verified TeX'):
            extract('<main><h1>Title</h1><mjx-container>unmapped</mjx-container></main>', 'https://example.org', {})

    def test_rebuild_dates_staleness_and_withdrawal(self):
        with tempfile.TemporaryDirectory() as directory:
            site = Path(directory)
            (site/'dist/notes').mkdir(parents=True)
            (site/'dist/index.html').write_text('<h2 id="usage-title">阅读与使用</h2><div>')
            html = '<main><h1>Lecture</h1><p>' + '公开内容' * 80 + '</p></main>'
            for name in ['outline', 'lecture01', 'lecture02', 'lecture10']:
                (site/'dist/notes'/f'{name}.html').write_text(html)
            sync_text(site, {1, 2})
            first = (site/'dist/text/lecture01.txt').read_bytes()
            sync_text(site, {1, 2})
            self.assertEqual(first, (site/'dist/text/lecture01.txt').read_bytes())
            self.assertFalse((site/'dist/text/lecture10.txt').exists())
            # A lecture withdrawn from publication must disappear on the next build.
            sync_text(site, {1})
            self.assertFalse((site/'dist/text/lecture02.txt').exists())
            self.assertFalse(validate_text(site, {1}))
            source = site/'dist/notes/lecture01.html'
            source.write_text(html.replace('公开内容', '更新内容'))
            self.assertTrue(validate_text(site, {1}))
            manifest = json.loads((site/'dist/text/manifest.json').read_text())
            outputs = make_outputs(site, {1}, {}, manifest, now='2099-01-01T00:00:00+08:00')
            updated = json.loads(outputs['text/manifest.json'])['documents']
            self.assertEqual(updated[0]['updated_at'], manifest['documents'][0]['updated_at'])
            self.assertEqual(updated[1]['updated_at'], '2099-01-01T00:00:00+08:00')


if __name__ == '__main__':
    unittest.main()
