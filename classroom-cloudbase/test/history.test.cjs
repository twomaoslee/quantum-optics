const test=require('node:test'),assert=require('node:assert/strict');
const {createService,passwordHash}=require('../functions/classroom/service');
const {memoryRepository}=require('../scripts/memory.cjs');
async function fixture(){
 let time=1900000000000;
 const repo=memoryRepository(),service=createService(repo,{teacherPasswordHash:await passwordHash('history-test-password'),now:()=>time});
 let room;const request=(action,data={},token,code=room)=>service.handle({action,data,token,roomCode:code},'history-test');
 const teacher=(await request('teacher.login',{password:'history-test-password'})).data.token;
 room=(await request('teacher.create',{},teacher)).data.code;
 const one=(await request('student.login',{name:'记录测试甲',studentNumber:'hist001'})).data.token;
 const two=(await request('student.login',{name:'记录测试乙',studentNumber:'hist002'})).data.token;
 const ok=async(action,data={},token=teacher,code=room)=>{const r=await request(action,data,token,code);assert(r.ok,JSON.stringify(r.error));return r.data;};
 return {repo,request,teacher,room,one,two,ok,tick:n=>time+=n};
}
const noKey=history=>{
 for(const item of history.questions)if(!item.feedbackAvailable){assert.equal(item.answer,undefined);for(const round of item.rounds)if(round.own)assert.equal(round.own.isCorrect,undefined);}
};
test('history returns only the authenticated student and current classroom; no key or correctness for questions not yet displayed',async()=>{
 const f=await fixture();await f.ok('teacher.open',{questionId:'l07-q1'});const roundId=(await f.ok('teacher.state')).round.id;
 await f.ok('student.submit',{roundId,choice:'C'},f.one);await f.ok('student.submit',{roundId,choice:'A'},f.two);await f.ok('teacher.reveal',{roundId});
 const own=await f.ok('student.history',{userId:'hist002',studentNumber:'hist002',released:true},f.one);
 assert.equal(own.questions.length,6);assert.equal(own.questions[0].rounds[0].own.choice,'C');noKey(own);assert.equal(own.answersReleasedAt,null);
 assert(!JSON.stringify(own).includes('hist002'));assert(!JSON.stringify(own).includes('记录测试乙'));
 const other=await f.ok('student.history',{},f.two);assert.equal(other.questions[0].rounds[0].own.choice,'A');assert.equal(other.questions[0].rounds[0].own.isCorrect,false);noKey(other);
 const second=(await f.ok('teacher.create')).code;await f.ok('teacher.open',{questionId:'l07-q2'},f.teacher,second);
 const isolated=await f.ok('student.history',{},f.one,second);assert.equal(isolated.questions[0].rounds.length,0);assert.equal(isolated.questions[1].rounds[0].own,null);
 for(const token of [undefined,f.teacher])assert.equal((await f.request('student.history',{},token)).error.code,token?'FORBIDDEN':'AUTH');
 assert.equal((await f.request('teacher.releaseAnswers',{released:true},f.one)).error.code,'FORBIDDEN');
});
test('release reveals per-student grades and explanations only for issued questions; missed answers remain null',async()=>{
 const f=await fixture();await f.ok('teacher.open',{questionId:'l07-q1'});let r=(await f.ok('teacher.state')).round;
 await f.ok('student.submit',{roundId:r.id,choice:'C'},f.one);await f.ok('student.submit',{roundId:r.id,choice:'B'},f.two);await f.ok('teacher.reveal',{roundId:r.id});
 await f.ok('teacher.open',{questionId:'l07-q2'});r=(await f.ok('teacher.state')).round;await f.ok('teacher.close',{roundId:r.id});
 await f.ok('teacher.releaseAnswers',{released:true});const h=await f.ok('student.history',{},f.one),bad=await f.ok('student.history',{},f.two);
 assert(h.answersReleasedAt);assert.equal(h.questions[0].answer.correct,'C');assert(h.questions[0].answer.explanation);assert.equal(h.questions[0].rounds[0].own.isCorrect,true);assert.equal(bad.questions[0].rounds[0].own.isCorrect,false);
 assert.equal(h.questions[1].rounds[0].own,null);assert.equal(h.questions[1].answer.correct,'B');assert.equal(h.questions[2].answer,undefined);
 assert.equal((await f.ok('room.public')).round.correct,undefined);assert.equal((await f.ok('student.state',{},f.one)).round.correct,'B');
 const same=await f.ok('teacher.state');assert.equal(same.answersReleasedAt,h.answersReleasedAt);
 await f.ok('teacher.releaseAnswers',{released:true});assert.equal((await f.ok('student.history',{},f.one)).answersReleasedAt,h.answersReleasedAt);
 assert.equal((await f.request('teacher.open',{questionId:'l07-q3'},f.teacher)).error.code,'RELEASED');
 await f.ok('teacher.releaseAnswers',{released:false});noKey(await f.ok('student.history',{},f.one));await f.ok('teacher.open',{questionId:'l07-q3'});
 assert.equal((await f.ok('teacher.export')).rows.length,2);
});
test('all attempts are retained, no inherited choice for a missed retry, and release rejects active or empty classrooms',async()=>{
 const f=await fixture();assert.equal((await f.request('teacher.releaseAnswers',{released:true},f.teacher)).error.code,'ROUND');
 for(const released of ['true',1,null])assert.equal((await f.request('teacher.releaseAnswers',{released},f.teacher)).error.code,'INPUT');
 await f.ok('teacher.open',{questionId:'l07-q4'});let r=(await f.ok('teacher.state')).round;
 assert.equal((await f.request('teacher.releaseAnswers',{released:true},f.teacher)).error.code,'OPEN');
 await f.ok('student.submit',{roundId:r.id,choice:'A'},f.one);await f.ok('teacher.reveal',{roundId:r.id});
 await f.ok('teacher.open',{questionId:'l07-q4'});r=(await f.ok('teacher.state')).round;f.tick(61000);
 await f.ok('teacher.releaseAnswers',{released:true});const history=await f.ok('student.history',{},f.one),attempts=history.questions[3].rounds;
 assert.equal(attempts.length,2);assert.equal(attempts[0].own.choice,'A');assert.equal(attempts[0].own.isCorrect,false);assert.equal(attempts[1].own,null);assert.equal(attempts[1].status,'closed');
 assert.equal((await f.request('student.submit',{roundId:r.id,choice:'B'},f.one)).error.code,'CLOSED');
 const record=await f.repo.get('room_'+f.room);assert(record.round.closedAt);assert(record.answersReleasedAt);
});

test('a history read cannot borrow an old release flag for a question opened concurrently after withdrawal',async()=>{
 const f=await fixture();await f.ok('teacher.open',{questionId:'l07-q1'});const r=(await f.ok('teacher.state')).round;await f.ok('teacher.close',{roundId:r.id});await f.ok('teacher.releaseAnswers',{released:true});
 const list=f.repo.list;let unblock,reached;
 const paused=new Promise(resolve=>{reached=resolve;});
 f.repo.list=async filter=>{if(filter.kind==='round'){f.repo.list=list;reached();await new Promise(resolve=>{unblock=resolve;});}return list(filter);};
 const inFlight=f.ok('student.history',{},f.one);await paused;
 await f.ok('teacher.releaseAnswers',{released:false});await f.ok('teacher.open',{questionId:'l07-q3'});unblock();
 const old=await inFlight;assert.equal(old.questions[2].rounds.length,0);assert.equal(old.questions[2].answer,undefined);
 noKey(await f.ok('student.history',{},f.one));
});
