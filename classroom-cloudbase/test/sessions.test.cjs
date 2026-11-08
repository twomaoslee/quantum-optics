const test=require('node:test'),assert=require('node:assert/strict');
const {createService,passwordHash}=require('../functions/classroom/service');
const {memoryRepository}=require('../scripts/memory.cjs');

async function fixture(){
 let time=Date.UTC(2026,10,7,2),calls=[];
 const repo=memoryRepository(),service=createService(repo,{now:()=>time,teacherPasswordHash:await passwordHash('session-test'),analyze:async input=>{
  calls.push(input);
  return {summary:'仍需核对同一模式中频率与能量的关系。',observations:[{text:'可再区分模式与激发数。',evidence:[input.rounds[0].id]}],nextStep:'请说明固定的模式条件。',model:'fixture'};
 }});
 const request=(action,data={},roomCode,token)=>service.handle({action,data,roomCode,token},'sessions-test');
 const teacher=(await request('teacher.login',{password:'session-test'})).data.token;
 const ok=async(action,data={},roomCode,token=teacher)=>{
  const result=await request(action,data,roomCode,token);assert(result.ok,JSON.stringify(result.error));return result.data;
 };
 const classroom=await ok('teacher.classroom',{lectureId:'l07'});
 const login=async(num,room=classroom.code)=>(await ok('student.login',{name:'场次测试学生',studentNumber:num},room,null)).token;
 return {repo,request,ok,teacher,classroom,login,calls,tick:n=>time+=n};
}

test('a fixed QR follows the active class, while an archive stays readable and rejects stale writes',async()=>{
 const f=await fixture(),{code,anchor}=f.classroom,a=await f.login('TEST001');
 const l08=await f.ok('teacher.classroom',{lectureId:'l08'});
 const standalone=await f.ok('teacher.create');
 await f.ok('teacher.open',{questionId:'l07-q1'},code);
 const {round:r}=await f.ok('student.state',{live:true},anchor,a);
 await f.ok('student.submit',{roundId:r.id,choice:'A'},code,a);
 assert.equal((await f.request('teacher.newClass',{lectureId:'l07',kind:'class'},code,a)).error.code,'FORBIDDEN');
 f.tick(1000);
 const trial=await f.ok('teacher.newClass',{lectureId:'l07',kind:'trial'},code);
 assert.equal(trial.anchor,anchor);assert.notEqual(trial.code,code);
 assert.deepEqual(await f.ok('teacher.classroom',{lectureId:'l07'}),trial);
 assert.equal((await f.ok('student.state',{live:true},anchor,a)).round,null);
 assert.equal((await f.ok('student.state',{},code,a)).own.choice,'A');
 assert.equal((await f.ok('room.public',{live:true},standalone.code,null)).code,standalone.code);
 assert.equal((await f.ok('room.public',{live:true},l08.anchor,null)).code,l08.code);
 assert.equal((await f.request('student.submit',{roundId:r.id,choice:'B'},code,a)).error.code,'CLOSED');
 assert.equal((await f.request('student.submit',{roundId:r.id,choice:'B'},trial.code,a)).error.code,'ROUND');
 assert.equal((await f.request('teacher.open',{questionId:'l07-q1'},code,f.teacher)).error.code,'ARCHIVED');
 assert.equal((await f.request('teacher.newClass',{lectureId:'l07',kind:'trial'},code,f.teacher)).error.code,'ROOM_CHANGED');
 await f.ok('teacher.open',{questionId:'l07-q1'},trial.code);
 const trialState=await f.ok('student.state',{live:true},anchor,a);
 await f.ok('student.submit',{roundId:trialState.round.id,choice:'B'},trialState.code,a);
 f.tick(1000);
 const formal=await f.ok('teacher.newClass',{lectureId:'l07',kind:'class'},trial.code);
 assert.equal(formal.anchor,anchor);
 assert.equal((await f.ok('student.state',{live:true},anchor,a)).code,formal.code);
 assert.equal((await f.ok('teacher.export',{},formal.code)).rows.length,0);
 assert.equal((await f.ok('teacher.export',{},trial.code)).rows[0].choice,'B');
 assert.equal((await f.ok('teacher.export',{},code)).rows[0].choice,'A');
 assert.equal((await f.ok('student.history',{},code,a)).questions[0].rounds[0].own.choice,'A');
 assert.deepEqual((await f.ok('student.rooms',{},formal.code,a)).rooms.map(r=>r.code),[formal.code,trial.code,code]);
 assert.deepEqual((await f.ok('student.rooms',{},formal.code,await f.login('TEST002'))).rooms.map(r=>r.code),[formal.code]);
});

test('initial connection preserves a legacy QR and uses one active room under concurrent connection',async()=>{
 const f=await fixture();
 const legacy=(await f.ok('teacher.create',{lectureId:'l08'})).code;
 const old=await f.repo.get('room_'+legacy);delete old.standalone;await f.repo.set('room_'+legacy,old);
 const results=await Promise.all(Array.from({length:4},()=>f.ok('teacher.classroom',{lectureId:'l08',preferred:legacy})));
 assert.deepEqual(results,Array(4).fill({code:legacy,anchor:legacy}));
 const next=await f.ok('teacher.newClass',{lectureId:'l08',kind:'class'},legacy);
 assert.equal(next.anchor,legacy);
 assert.equal((await f.ok('room.public',{live:true},legacy,null)).code,next.code);
 assert.equal((await f.ok('room.public',{},legacy,null)).code,legacy);
});

test('self-check locks the first answer, allows optional reasons, and publishes one anonymous AI summary after the deadline',async()=>{
 const f=await fixture(),{code}=f.classroom,a=await f.login('TEST001'),b=await f.login('TEST002'),questionId='l07-q1';
 await f.ok('teacher.open',{questionId,seconds:15,feedbackMode:'self-check'},code);
 const {round:r}=await f.ok('student.state',{},code,a),data={questionId,roundId:r.id};
 assert.equal(r.correct,undefined);
 await f.ok('student.submit',{roundId:r.id,choice:'A'},code,a);
 const submitted=await f.ok('student.state',{},code,a);
 assert.equal(submitted.own.isCorrect,false);assert.equal(submitted.round.correct,'C');assert.equal(submitted.analysis,undefined);
 assert.equal((await f.ok('student.state',{},code,b)).round.correct,undefined);
 assert.equal((await f.ok('student.history',{},code,b)).questions[0].answer,undefined);
 assert.equal((await f.request('student.summary',data,code,a)).error.code,'HIDDEN');
 assert.equal((await f.request('teacher.analyze',data,code,f.teacher)).error.code,'HIDDEN');
 assert.equal((await f.request('student.submit',{roundId:r.id,choice:'C'},code,a)).error.code,'LOCKED');
 assert.equal((await f.request('teacher.open',{...data,feedbackMode:'discussion'},code,f.teacher)).error.code,'FEEDBACK');
 await f.ok('student.reason',{roundId:r.id,choice:'A',reasonId:'other',comment:'答后补充的虚拟材料'},code,a);
 f.tick(15000);
 assert.equal((await f.ok('student.summary',data,code,b)).analysis.status,'idle');assert.equal(f.calls.length,0);
 const [x,y]=await Promise.all([f.ok('student.summary',data,code,a),f.ok('teacher.analyze',data,code)]);
 assert([x.analysis.status,y.analysis.status].includes('ready'));assert.equal(f.calls.length,1);
 assert.equal(f.calls[0].feedbackMode,'self-check');assert(f.calls[0].caveats.some(text=>text.includes('答后反思')));
 const after=await f.ok('student.state',{},code,a);assert.equal(after.analysis.status,'ready');
 assert.deepEqual(Object.keys(after.analysis).sort(),['generatedAt','model','status','summary']);
 assert.equal(after.round.counts,undefined);
 assert.equal((await f.ok('student.history',{},code,a)).questions[0].analysis.summary,after.analysis.summary);
 assert.equal((await f.ok('student.state',{},code,b)).analysis.summary,after.analysis.summary);
 assert.equal((await f.ok('teacher.export',{},code)).rows[0].reason.comment,'答后补充的虚拟材料');
});

test('discussion feedback and AI stay hidden through retries and share the summary after teacher display',async()=>{
 const f=await fixture(),{code}=f.classroom,a=await f.login('TEST001'),questionId='l07-q1';
 await f.ok('teacher.open',{questionId},code);
 let {round}=await f.ok('student.state',{},code,a);
 await f.ok('student.submit',{roundId:round.id,choice:'A'},code,a);
 await f.ok('teacher.open',{questionId,roundId:round.id},code);
 ({round}=await f.ok('student.state',{},code,a));const data={questionId,roundId:round.id};
 await f.ok('student.submit',{roundId:round.id,choice:'C'},code,a);
 f.tick(61000);
 const before=await f.ok('student.state',{},code,a);assert.equal(before.own.isCorrect,undefined);assert.equal(before.analysis,undefined);
 assert.equal((await f.request('student.summary',data,code,a)).error.code,'HIDDEN');
 await f.ok('teacher.reveal',data,code);
 assert.equal((await f.ok('student.state',{},code,a)).own.isCorrect,true);
 await f.ok('teacher.analyze',data,code);
 const after=await f.ok('student.state',{},code,a);assert.equal(after.analysis.status,'ready');
 assert.equal(f.calls[0].rounds.length,2);assert.equal(after.own.choice,'C');
});
