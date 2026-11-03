const test=require('node:test'),assert=require('node:assert/strict');
const {createService,passwordHash,questions}=require('../functions/classroom/service');
const {memoryRepository}=require('../scripts/memory.cjs');
const csv=require('../../classroom/export-csv');
// Parse quoted CSV, including embedded commas, newlines and escaped quotes.
function parse(text){
 const rows=[];let row=[],value='',quoted=false;
 for(let i=1;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
  else if(!quoted&&(c===','||c==='\r')){row.push(value);value='';if(c==='\r'){rows.push(row);row=[];i++;}}
  else value+=c;
 }
 row.push(value);rows.push(row);return rows;
}
async function fixture(){
 let time=Date.UTC(2026,10,1,2,0,0);
 const repo=memoryRepository(),service=createService(repo,{teacherPasswordHash:await passwordHash('export-test-password'),now:()=>time});
 let room;const request=(action,data={},token,code=room)=>service.handle({action,data,token,roomCode:code},'export-test');
 const teacher=(await request('teacher.login',{password:'export-test-password'})).data.token;
 const ok=async(action,data={},token=teacher,code=room)=>{const r=await request(action,data,token,code);assert(r.ok,JSON.stringify(r.error));return r.data;};
 room=(await ok('teacher.create',{title:'导出测试'})).code;
 const student=(await ok('student.login',{name:'导出测试甲',studentNumber:'000123'},undefined)).token;
 return {repo,ok,request,teacher,student,room,tick:()=>time+=1000};
}
test('teacher export joins six questions and all retry rounds, grades final choices without releasing student answers',async()=>{
 const f=await fixture();const expected=[];
 for(const [questionId,{answer}]of [...questions].filter(([id])=>id.startsWith('l07-'))){
  await f.ok('teacher.open',{questionId});const r=(await f.ok('teacher.state')).round;
  const wrong=['A','B','C','D'].find(c=>c!==answer.correct);
  await f.ok('student.submit',{roundId:r.id,choice:wrong},f.student);f.tick();
  const choice=expected.length%2?wrong:answer.correct;
  await f.ok('student.submit',{roundId:r.id,choice},f.student);expected.push({questionId,choice,isCorrect:choice===answer.correct});
 }
 await f.ok('teacher.open',{questionId:'l07-q1'});const retry=(await f.ok('teacher.state')).round;
 await f.ok('student.submit',{roundId:retry.id,choice:'A'},f.student);
 const second=(await f.ok('teacher.create')).code;
 await f.ok('teacher.open',{questionId:'l07-q2'},f.teacher,second);const other=(await f.ok('teacher.state',{},f.teacher,second)).round;
 await f.ok('student.submit',{roundId:other.id,choice:'B'},f.student,second);
 const result=await f.ok('teacher.export');
 assert.deepEqual(result.room,{code:f.room,title:'导出测试'});assert.equal(result.rows.length,7);assert.equal(result.rounds.length,7);
 assert.deepEqual(result.rows.slice(0,6).map(({questionId,choice,isCorrect})=>({questionId,choice,isCorrect})),expected);
 assert.equal(result.rows[6].isCorrect,false);assert(result.rows.every(r=>r.studentNumber==='000123'));
 for(const q of result.questions){const original=questions.get(q.id);assert.deepEqual(q,{...original.question,...original.answer});}
 for(const token of [undefined,f.student])assert.equal((await f.request('teacher.export',{},token)).error.code,token?'FORBIDDEN':'AUTH');
 const history=await f.ok('student.history',{},f.student);assert.equal(history.answersReleasedAt,null);
 assert(history.questions.every(q=>!q.answer&&q.rounds.every(r=>!r.own||r.own.isCorrect===undefined)));
 const parsed=parse(csv.create(result)),header=parsed.shift();assert.equal(parsed.length,7);assert(parsed.every(row=>row.length===header.length));
 const rows=parsed.map(row=>Object.fromEntries(header.map((h,i)=>[h,row[i]])));
 assert.equal(rows[0]['学号'],'000123');assert.equal(rows[0]['作答结果'],'答对');assert.equal(rows[1]['作答结果'],'答错');
 assert.equal(rows[0]['最后提交时间（北京时间）'],'2026-11-01 10:00:01');
 assert.equal(rows[6]['轮次'],'7');assert.equal(rows[6]['作答结果'],'答错');
 assert.equal(rows[2]['公式'],questions.get('l07-q3').question.mathLines.join('\n'));
 assert.equal(rows[0]['正确答案内容'],questions.get('l07-q1').question.options.find(([key])=>key==='C')[1]);
});
test('CSV preserves multiline quoted content and neutralizes formula-like cells; empty classroom exports a header',()=>{
 const q={id:'q',title:'题目,"引号"\n下一行',stem:'比较 A,B',options:[['A','+危险'],['B','安全']],correct:'B',explanation:'说明\n第二行'};
 const data={room:{title:' =HYPERLINK("example")',code:'ABC'},questions:[q],rounds:[{id:'r',number:1}],rows:[{roundId:'r',questionId:'q',name:'测试',studentNumber:'001',choice:'A',isCorrect:false,submittedAt:Date.UTC(2026,10,1)}]};
 const output=csv.create(data);assert.equal(output.charCodeAt(0),0xFEFF);
 const [header,row]=parse(output),record=Object.fromEntries(header.map((h,i)=>[h,row[i]]));
 assert.equal(record['题目标题'],q.title);assert.equal(record['题干'],q.stem);assert.equal(record['解析'],q.explanation);
 assert.equal(record['课堂名称'],"'"+data.room.title);assert.equal(record['学生所选内容'],"'+危险");
 assert.equal(parse(csv.create({...data,rows:[]})).length,1);
 assert.throws(()=>csv.create({...data,rows:[{...data.rows[0],isCorrect:undefined}]}),/版本不一致/);
});
