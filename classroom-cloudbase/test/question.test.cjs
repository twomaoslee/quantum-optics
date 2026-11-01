const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {questions}=require('../functions/classroom/service');
test('all six backend question stems, choices, equations and answer letters preserve the editable lecture source',()=>{
 const file=path.resolve(__dirname,'../../../quantum-slides/lecture07.qmd');
 if(!fs.existsSync(file))return;
 const qmd=fs.readFileSync(file,'utf8');assert.equal(questions.size,6);
 for(const [id,{question,answer}]of questions){
  const heading=qmd.indexOf('#'+id+' '),start=qmd.lastIndexOf('\n## ',heading),end=qmd.indexOf('\n## ',heading),part=qmd.slice(start,end);
  assert.equal(part.match(/::: stem\n([\s\S]*?)\n:::/)[1].trim(),question.stem);
  assert.deepEqual(part.match(/::: choices\n([\s\S]*?)\n:::/)[1].trim().split('\n').map(line=>line.replace(/^- /,'')),question.options.map(pair=>pair[1]));
  const ref=part.split(' reference\n')[1].split('::: choices')[0];
  assert.deepEqual([...ref.matchAll(/\$\$([\s\S]*?)\$\$/g)].map(m=>m[1]),question.mathLines);
  assert(part.includes('correct="'+answer.correct+'"'));
 }
});
