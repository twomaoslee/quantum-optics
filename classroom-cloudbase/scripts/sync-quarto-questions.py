"""Update Quarto question banks while preserving other lectures."""
import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def block(section,name):
 lines=section.splitlines();start=next((i for i,x in enumerate(lines) if re.fullmatch(r':{3,} (?:'+name+r'|\{\.'+name+r'\})',x)),None)
 if start is None:return ''
 stack=[len(lines[start].split()[0])];out=[]
 for x in lines[start+1:]:
  m=re.fullmatch(r'(:{3,})(.*)',x)
  if m:
   if m[2].strip():stack.append(len(m[1]))
   elif len(m[1])==stack[-1]:
    stack.pop()
    if not stack:break
   continue
  out.append(re.sub(r'<br\s*/?>', ' ', x.replace('**',''), flags=re.I).rstrip())
 assert not stack,name
 return '\n'.join(out).strip()
def mobile_reference(text):
 lines=text.splitlines();headers=None;out=[]
 for line in lines:
  if line.startswith('|'):
   cells=[v.strip() for v in line.strip('|').split('|')]
   if headers is None:headers=cells
   elif all(re.fullmatch(r'[-: ]+',v) for v in cells):continue
   else:
    if headers[0]=='光源':out.append('光源'+cells[0]+'：'+'；'.join(h+' '+v for h,v in zip(headers[1:],cells[1:]))+'。')
    elif headers[0]=='过程':out.append(cells[0]+'：'+'；'.join(h+' '+v for h,v in zip(headers[1:],cells[1:]))+'。')
    else:out.append('；'.join(h+'：'+v for h,v in zip(headers,cells))+'。')
  else:out.append(line)
 return '\n'.join(out).strip()
def sync_lecture(number, count):
 source=root.parent.parent/f'quantum-slides/lectures/lecture{number}/lecture{number}.qmd'
 records=[]
 for sec in re.split(r'(?m)(?=^## )',source.read_text()):
  head=sec.split('\n')[0];m=re.search(rf'#(l{number}-q[1-9]\d*)\b',head)
  if not m:continue
  ref=block(sec,'reference');math=re.findall(r'\$\$(.*?)\$\$',ref,re.S)
  correct=re.search(r'correct="([A-D])"',sec)[1]
  records.append({'question':{'id':m[1],'title':head[3:].split(' {')[0],'stem':mobile_reference(block(sec,'stem')),'math':math[0] if math else '', 'mathLines':math,'reference':mobile_reference(re.sub(r'\$\$.*?\$\$','',ref,flags=re.S)), 'options':[[c,x[2:]] for c,x in zip('ABCD',block(sec,'choices').splitlines())]},'answer':{'correct':correct,'explanation':re.sub(r'^[A-D]。','',block(sec,'result'))}})
 assert [r['question']['id'] for r in records]==[f'l{number}-q{i}' for i in range(1,count+1)]
 assert all(r['answer']['correct'] in dict(r['question']['options']) for r in records)
 p=root/'functions/classroom/questions.json';old=json.loads(p.read_text());kept=[r for r in old if not r['question']['id'].startswith(f'l{number}-')]
 p.write_text(json.dumps(kept+records,ensure_ascii=False,indent=2)+'\n')

if __name__ == '__main__':
 import argparse
 parser=argparse.ArgumentParser()
 parser.add_argument('--lecture',choices=['09','10'])
 selected=parser.parse_args().lecture
 for number,count in [('09',8),('10',9)]:
  if selected in (None,number):
   sync_lecture(number,count)
