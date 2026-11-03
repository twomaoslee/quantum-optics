"""Copy the six published quiz questions from their sole editable QMD source."""
import json
import re
from pathlib import Path

backend = Path(__file__).resolve().parents[1]
source = backend.parent.parent / 'quantum-slides/lecture07.qmd'
text = source.read_text()
records = []
for number in range(1, 7):
    section = re.search(r'^## (思考题' + str(number) + r'：[^\n]+)\n(.*?)(?=^## |\Z)', text, re.M | re.S)
    title, body = section.groups()
    title = title.split(' {')[0]
    stem = re.search(r'::: stem\n(.*?)\n:::', body, re.S)[1].strip()
    reference = body.split(' reference\n', 1)[1].split('::: choices', 1)[0]
    maths = re.findall(r'\$\$(.*?)\$\$', reference, re.S)
    reference = re.sub(r'\$\$.*?\$\$', '', reference, flags=re.S)
    reference = '\n'.join(line for line in reference.splitlines() if line.strip() and not line.startswith(':::'))
    choices = re.search(r'::: choices\n(.*?)\n:::', body, re.S)[1].strip().splitlines()
    correct = re.search(r'correct="([A-D])"', section[0])[1]
    explanation = re.search(r'答案 ' + correct + r'　([^\n]+)', body)
    # Q4 and Q5 keep the original delayed solution after their lab, not in the question.
    detailed = {
        '4': r'真空态满足$\langle\hat q\rangle=0$、$\langle\hat q^2\rangle=q_0^2$，因此场坐标方差为$q_0^2>0$。真空又是总能量的本征态，每次测得同一能量，所以能量方差为零。',
        '5': r'两态的$P(0)=P(2)=1/2$，计数分布不变。固定同一本振参照时，场方差从$(3+\sqrt2)q_0^2$变为$(3-\sqrt2)q_0^2$；相对负号改变了交叉项，所以场方差减小。'
    }
    explanation = detailed.get(str(number)) or explanation[1]
    records.append({'question': {'id': f'l07-q{number}', 'title': title, 'stem': stem,
        'math': maths[0], 'mathLines': maths, 'reference': reference,
        'options': [[letter, line.removeprefix('- ')] for letter, line in zip('ABCD', choices)]},
        'answer': {'correct': correct, 'explanation': explanation}})

source8 = backend.parent.parent / 'quantum-slides/lectures/lecture08/lecture08.qmd'
text8 = source8.read_text()
for section in re.split(r'(?=^## )', text8, flags=re.M):
    head = section.split('\n')[0]
    match = re.search(r'#(l08-q[1-5])\b', head)
    if not match: continue
    def block(name):
        m = re.search(r'::: \{\.' + name + r'\}\n(.*?)\n:::', section, re.S)
        return m[1].strip() if m else ''
    reference = block('reference')
    maths = re.findall(r'\$\$(.*?)\$\$', reference, re.S)
    choices = block('choices').splitlines()
    correct = re.search(r'correct="([A-D])"', section)[1]
    explanation = re.sub(r'^答案 [A-D]。', '', block('result'))
    records.append({'question': {'id':match[1], 'title':head[3:].split(' {')[0],
        'stem':block('stem'), 'math': maths[0] if maths else '', 'mathLines':maths,
        'reference':re.sub(r'\$\$.*?\$\$', '', reference, flags=re.S).strip(),
        'options': [[letter,line.removeprefix('- ')] for letter,line in zip('ABCD', choices)]},
        'answer':{'correct':correct, 'explanation':explanation}})
assert len(records) == 11
(backend / 'functions/classroom/questions.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
print('Synced 6 lecture-seven and 5 lecture-eight questions from QMD.')
