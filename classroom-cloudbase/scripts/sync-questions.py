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
    explanation = explanation[1] if explanation else {
        '4': r'真空态满足$\langle\hat q\rangle=0$、$\langle\hat q^2\rangle=q_0^2$，因此场坐标方差为$q_0^2>0$。真空又是总能量的本征态，每次测得同一能量，所以能量方差为零。',
        '5': r'两态的$P(0)=P(2)=1/2$，计数分布不变。固定同一本振参照时，场方差从$(3+\sqrt2)q_0^2$变为$(3-\sqrt2)q_0^2$；相对负号改变了交叉项，所以场方差减小。'
    }[str(number)]
    records.append({'question': {'id': f'l07-q{number}', 'title': title, 'stem': stem,
        'math': maths[0], 'mathLines': maths, 'reference': reference,
        'options': [[letter, line.removeprefix('- ')] for letter, line in zip('ABCD', choices)]},
        'answer': {'correct': correct, 'explanation': explanation}})
(backend / 'functions/classroom/questions.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
print('Synced all six questions from lecture07.qmd.')
