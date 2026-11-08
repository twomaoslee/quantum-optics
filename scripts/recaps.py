"""Build authorized classroom recaps from anonymous, auditable source files."""
from pathlib import Path
from html import escape
import json
import hashlib
import re
import shutil


def math(tex, display=False):
    tag = 'div' if display else 'span'
    return f'<{tag} class="formula" data-tex="{escape(tex, quote=True)}" data-display="{str(display).lower()}"></{tag}>'


def rich(value):
    pieces = re.split(r'(\\\(.*?\\\)|\$[^$]+\$)', value, flags=re.S)
    return ''.join(math(s[2:-2] if s.startswith('\\(') else s[1:-1])
                   if s.startswith(('\\(', '$')) else escape(s) for s in pieces)


def render(data, editorial):
    sections = []
    overview = []
    for index, q in enumerate(data['questions'], 1):
        text = editorial[f'q{index}']
        question = f'思考题{index}'
        multiple_rounds = len(q['rounds']) > 1
        overview_bars = []
        panels = []
        tabs = []
        for n, r in enumerate(q['rounds']):
            rate = r['correct'] / r['total'] * 100
            label = (f'<span class="sr-only">{question} </span>{escape(r["label"])}'
                     if multiple_rounds else question)
            overview_bars.append(
                f'<a class="overview-bar" href="#q{index}">'
                f'<span class="overview-bar-label">{label}</span>'
                f'<span class="overview-bar-value">{r["correct"]} 人答对 / {r["total"]} 人提交 <b>{rate:.1f}%</b></span>'
                f'<span class="overview-bar-track" aria-hidden="true"><span style="width:{rate:.2f}%"></span></span></a>'
            )
            bars = []
            for choice, label in q['options']:
                count = r['choices'][choice]
                correct = choice == q['correct']
                bars.append(f'<li class="choice {"correct" if correct else ""}"><div class="choice-label"><b>{choice}</b><span>{rich(label)}</span>'+
                            ('<span class="correct-mark">正确选项</span>' if correct else '')+
                            f'</div><div class="choice-value"><span class="track"><i style="width:{count/r["total"]*100:.2f}%"></i></span><span>{count} 人</span></div></li>')
            panels.append(f'<div id="q{index}-round-{n}" class="round-panel"'+(' hidden' if n else '')+
                          f'><p class="round-summary">{r["label"]} · {r["total"]} 人提交 · {r["correct"]} 人答对</p><ul class="choice-list">'+''.join(bars)+
                          f'</ul><p class="reason-note">原因填写：{r["total"]-r["reasons"].get("missing",0)}/{r["total"]} 人；其中 {r["reasons"].get("unsure",0)} 人选择“直觉或猜测”。</p></div>')
            if multiple_rounds:
                tabs.append(f'<button type="button" class="round-tab" data-panel="q{index}-round-{n}" aria-pressed="{str(n==0).lower()}" aria-controls="q{index}-round-{n}">{r["label"]}</button>')
        group_heading = f'<strong>{question}</strong>' if multiple_rounds else ''
        overview.append(f'<li>{group_heading}{"".join(overview_bars)}</li>')
        check = text['check']
        options = ''.join(f'<label><input type="radio" name="check-{index}" value="{letter}" required><span><b>{letter}</b> {rich(option)}</span></label>' for letter, option in zip('ABC', check['options']))
        paired = ('<p class="paired-note">两轮共同参与的15人：14人保持正确，1人由D改为C。上方两轮提交总人数分别为17和16。</p>' if index == 1 else '')
        sections.append(f'''<section id="q{index}" class="question-section" tabindex="-1" aria-labelledby="q{index}-title">
<div class="section-label">思考题 {index:02d}</div><h2 id="q{index}-title">{escape(text['heading'])}</h2>
<p class="stem">{rich(q['stem'])}</p><div class="question-formulas">{''.join(math(t, True) for t in q['mathLines'])}</div>
<p class="reference">{rich(q['reference'])}</p>
<div class="review-columns"><div class="record"><h3>课堂作答</h3><div class="round-tabs" aria-label="切换作答轮次">{''.join(tabs)}</div>{''.join(panels)}{paired}</div>
<aside class="analysis"><h3>{escape(editorial['analysis_label'])}</h3>{''.join('<p>'+rich(p)+'</p>' for p in text['analysis'])}
<a class="text-link" href="../notes/lecture07.html#l7-quiz-{index}">回到讲义思考题 {index} <span aria-hidden="true">↗</span></a></aside></div>
<div class="key-point"><h3>核对关键关系</h3><p>{rich(text['key'])}</p></div>
<form class="self-check" data-answer="{check['correct']}"><h3>课后自查 {index}</h3><p>{rich(check['stem'])}</p>
<fieldset><legend class="sr-only">选择答案</legend>{options}</fieldset><div class="check-actions"><button class="check-submit" disabled>提交并核对</button><button class="check-reset" type="button" hidden>重新作答</button><span class="check-status" role="status" aria-live="polite">选择后可查看解答</span></div>
<div class="check-feedback" hidden><p><strong>答案 {check['correct']}</strong></p><p>{rich(check['answer'])}</p></div></form>
</section>''')
    findings = editorial['overview']
    points = ''.join(f'<li><h3>{escape(heading)}</h3><p>{rich(body)}</p></li>'
                     for heading, body in findings['points'])
    question_links = ''.join(f'<a href="#q{i}">思考题{i}</a>'
                             for i in range(1, len(data['questions']) + 1))
    return f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="第七讲光场量子化课堂答题情况分析：匿名答题统计、AI辅助复盘、关键关系与课后自查。">
<title>{escape(editorial['title'])} · 量子光学</title><link rel="stylesheet" href="review.css?v=scroll-chart"><link rel="stylesheet" href="../classroom/vendor/katex/katex.min.css">
<script defer src="../classroom/vendor/katex/katex.min.js"></script><script defer src="review.js?v=scroll-chart"></script></head><body>
<a class="skip-link" href="#main">跳到正文</a><header><div class="topbar"><a class="brand" href="../index.html"><img src="../assets/csu-logo.png" alt="中南大学"><span>量子光学</span></a><nav aria-label="课程资料"><a href="../notes/lecture07.html">讲义</a><a href="../slides/lecture07.html">课件</a><a href="../downloads/lecture07-slides.pdf">PDF</a></nav></div></header>
<main id="main"><section class="opening"><p class="eyebrow">2026 秋季 · 11 月 2 日</p><h1>{escape(editorial['title'])}</h1><p class="subtitle">{escape(editorial['subtitle'])}</p><p class="intro">{escape(editorial['intro'])}</p>
<ul class="scope"><li>{data['participants']} 个账号参与</li><li>{data['submissions']} 份答案计入统计</li><li>{data['roundCount']} 轮作答</li><li>思考题 1—4</li></ul>
</section>
<nav class="section-nav" aria-label="课堂答题分析目录"><a href="#overview" aria-current="location">总览</a>{question_links}</nav>
<div id="overview" tabindex="-1">
<section class="overview" aria-label="整体分析">
<div><p class="section-label">整体分析</p><h2>{escape(findings['heading'])}</h2><p>{rich(findings['summary'])}</p><ul class="overview-points">{points}</ul></div>
<div class="overview-results"><h3>各题正确率</h3><p class="chart-hint">点击柱条，查看对应题目的分析。</p>
<ul class="overview-bars" aria-label="各题各轮正确率">{''.join(overview)}</ul>
<div class="overview-axis" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>
<p class="fine">正确率以各轮实际提交人数为分母。每人每轮保留最后一次保存的答案。</p></div>
</section>
<p class="analysis-description">{escape(editorial['analysis_label'])}：{escape(editorial['analysis_scope'])}</p>
<details class="data-note"><summary>统计与分析说明</summary><p>来源为2026年11月2日第七讲课堂导出，选取本次课堂的5轮作答。19为实际提交账号的去重数。原因由学生从预设选项中自选；84次提交中有64次填写原因，15次选择“直觉或猜测”。</p><p>第1题的配对比较使用两轮均提交的15个账号，各轮总体分布使用该轮全部提交。AI辅助复盘依据这些记录提出复习建议；建议实施情况和后续学习效果需结合新的作答继续记录。自查题在本页核对，作答不上传服务器。</p></details>
</div>
{''.join(sections)}
<section id="continue" class="continue"><p class="section-label">继续复习</p><h2>把数态与场测量联系起来</h2><p>思考题5、6本次没有课堂作答记录，可继续在讲义中完成：比较相对符号对场方差的影响，再用三光子数态检查能量、算符次序和场方差。</p>
<div class="continue-links"><a href="../notes/lecture07.html#l7-quiz-5">思考题5：相对符号与场方差 ↗</a><a href="../notes/lecture07.html#l7-quiz-6">思考题6：三光子数态 ↗</a></div></section>
</main><footer><span>量子光学 · 中南大学</span><a href="../index.html">返回课程网站 ↑</a></footer></body></html>'''


def sync_recaps(site):
    site = Path(site)
    config = json.loads((site / 'publication.json').read_text())
    for number, entry in config.get('classroom_recaps', {}).items():
        if int(number) not in config['published_lectures']:
            raise ValueError('Classroom recap requires an authorized lecture')
        data = json.loads((site / entry['data']).read_text())
        editorial = json.loads((site / entry['editorial']).read_text())
        release = json.loads((site / entry['acceptance']).read_text())
        required = {'understanding', 'physics', 'data', 'visuals', 'browser_operation'}
        if set(release['dimensions']) != required or any(v != 'passed' for v in release['dimensions'].values()):
            raise ValueError('Classroom recap acceptance is incomplete')
        for relative, expected in release['sources'].items():
            if hashlib.sha256((site / relative).read_bytes()).hexdigest() != expected:
                raise ValueError('Reviewed recap source changed: ' + relative)
        html = render(data, editorial)
        if hashlib.sha256(html.encode()).hexdigest() != release['html_sha256']:
            raise ValueError('Reviewed recap output changed')
        output = site / 'dist' / entry['output']
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(html)
        for name in ['review.css', 'review.js']:
            shutil.copy2(site / 'recaps' / name, output.parent / name)
        home = site / 'dist/index.html'
        text = home.read_text()
        label = escape(editorial['title'])
        pattern = rf'<article class="lecture">(?:(?!</article>).)*href="notes/lecture{int(number):02d}\.html".*?</article>'
        def insert_card(match):
            card = re.sub(r'<a\b[^>]*class="action recap-link"[^>]*>.*?</a>', '', match[0])
            link = (f'<a class="action recap-link" style="grid-column:1/-1" href="{entry["output"]}" '
                    f'target="_blank" rel="noopener">{label}</a>')
            download = card.find('<a class="download"')
            if download != -1:
                return card[:download] + link + card[download:]
            return card.replace('</div></article>', link + '</div></article>')
        text, count = re.subn(pattern, insert_card, text, flags=re.S)
        if count != 1:
            raise ValueError('Recap homepage entry not found')
        home.write_text(text)
        notes = site / f'dist/notes/lecture{int(number):02d}.html'
        text = notes.read_text()
        for q in data['questions']:
            i = int(q['id'].split('q')[-1])
            pattern = rf'<form\b[^>]*id="l7-quiz-{i}".*?</form>'
            def insert_quiz(match):
                form = re.sub(r'<p class="classroom-recap-link">.*?</p>', '', match[0])
                link = f'<p class="classroom-recap-link"><a style="display:inline-block" href="../{entry["output"]}#q{i}">{label}</a></p>'
                form, inserted = re.subn(r'(<div\b[^>]*class="quiz-feedback"[^>]*>)', lambda m: m[1] + link, form, count=1)
                if inserted != 1:
                    raise ValueError(f'Recap feedback container not found: {i}')
                return form
            text, count = re.subn(pattern, insert_quiz, text, flags=re.S)
            if count != 1:
                raise ValueError(f'Recap quiz anchor not found: {i}')
        notes.write_text(text)
        search = site / 'dist/notes/search.json'
        if search.exists():
            href = '../' + entry['output']
            items = [item for item in json.loads(search.read_text()) if item.get('href', '').split('#')[0] != href]
            items.append({'objectID': href, 'href': href, 'title': editorial['title'], 'section': '答题概览',
                          'text': editorial['overview']['summary']})
            for i in range(1, len(data['questions']) + 1):
                part = editorial[f'q{i}']
                items.append({'objectID': f'{href}#q{i}', 'href': f'{href}#q{i}', 'title': editorial['title'],
                              'section': f'思考题{i}：' + part['heading'], 'text': ' '.join(part['analysis'])})
            search.write_text(json.dumps(items, ensure_ascii=False))
