const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {question}=require('../functions/classroom/service');
test('backend first question preserves the editable lecture source stem and choices',()=>{
 const file=path.resolve(__dirname,'../../../quantum-slides/lecture07.qmd');
 // Standalone backend checkouts may not contain the course authoring tree.
 if(!fs.existsSync(file))return;
 const qmd=fs.readFileSync(file,'utf8'),part=qmd.slice(qmd.indexOf('## 思考题1：'),qmd.indexOf('## 驻波中的电场与磁场'));
 assert(part.includes('#l07-q1'));
 assert.equal(part.match(/::: stem\n([\s\S]*?)\n:::/)[1].trim(),question.stem);
 assert.deepEqual(part.match(/::: choices\n([\s\S]*?)\n:::/)[1].trim().split('\n').map(line=>line.replace(/^- /,'')),question.options.map(pair=>pair[1]));
 assert(part.includes('correct="C"'));
});
