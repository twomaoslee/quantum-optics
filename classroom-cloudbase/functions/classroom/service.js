'use strict';
const crypto = require('node:crypto');
const {promisify} = require('node:util');
const scrypt = promisify(crypto.scrypt);
const DAY = 86400000;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const random = () => crypto.randomBytes(32).toString('base64url');
const catalog = require('./questions.json');
const reasons = require('./reasons.json');
const timing = require('./timing.json');
const {snapshot,validateAnalysis}=require('./comparison');
const questions = new Map(catalog.map(record => [record.question.id, record]));
const question = questions.get('l07-q1').question;
function questionFor(id) {
  requireThat(typeof id === 'string' && questions.has(id), 'QUESTION', '没有找到这道思考题。');
  return questions.get(id).question;
}
function roomLecture(room){return room.lectureId || 'l07';}
function roomQuestion(room,id){
  const q=questionFor(id || room.round?.questionId || roomLecture(room)+'-q1');
  requireThat(q.id.startsWith(roomLecture(room)+'-'),'QUESTION','题目与课堂讲次不一致。');
  return q;
}
function reasonOptions(questionId,choice) {
  return reasons.questions[questionId]?.[choice] || [];
}
function ownAnswer(row) {
  return row ? {choice:row.choice,updatedAt:row.updatedAt,reason:row.reason || null,
    reasonOptions:reasonOptions(row.questionId || question.id,row.choice),reasonOptionsVersion:reasons.version} : null;
}
class AppError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
function requireThat(ok, code, message) { if (!ok) throw new AppError(code, message); }
function identity(data) {
  const name = typeof data.name === 'string' ? data.name.normalize('NFKC').trim().replace(/\s+/g, ' ') : '';
  const studentNumber = typeof data.studentNumber === 'string' ? data.studentNumber.normalize('NFKC').trim() : '';
  requireThat(/^[\p{L}\p{M} ·.'’-]{1,40}$/u.test(name) && /\p{L}/u.test(name), 'INPUT', '请填写有效姓名。');
  requireThat(/^[A-Za-z0-9_-]{3,32}$/.test(studentNumber), 'INPUT', '请填写有效学号，保留开头的零。');
  return {name, studentNumber};
}
async function passwordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${key.toString('hex')}`;
}
async function checkPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 200) return false;
  const parts = (encoded || '').split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt' || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return false;
  const key = await scrypt(password, parts[1], 64);
  return crypto.timingSafeEqual(key, Buffer.from(parts[2], 'hex'));
}
function createService(repo, {teacherPasswordHash = '', now = Date.now, analyze = null, analysisNamespace = ''} = {}) {
  async function limited(scope, count, period = 60000) {
    const id = 'limit_' + hash(scope);
    await repo.transaction(async tx => {
      const old = await tx.get(id), time = now();
      const entry = old && old.resetAt > time ? old : {kind: 'limit', count: 0, resetAt: time + period};
      requireThat(entry.count < count, 'RATE_LIMIT', '操作过于频繁，请稍后再试。');
      entry.count++; await tx.set(id, entry);
    });
  }
  async function issue(role, userId) {
    const token = random(), expiresAt = now() + (role === 'teacher' ? DAY / 2 : 120 * DAY);
    await repo.set('session_' + hash(token), {kind: 'session', role, userId, expiresAt});
    return {token, expiresAt};
  }
  async function authenticate(token, role) {
    requireThat(typeof token === 'string' && /^[\w-]{43}$/.test(token), 'AUTH', '请重新登录。');
    const session = await repo.get('session_' + hash(token));
    requireThat(session && session.expiresAt > now(), 'AUTH', '登录已过期，请重新登录。');
    requireThat(!role || session.role === role, 'FORBIDDEN', '此操作需要教师登录。');
    return session;
  }
  function roomKey(code) {
    requireThat(typeof code === 'string' && /^[A-F0-9]{12}$/.test(code), 'ROOM', '课堂链接无效。');
    return 'room_' + code;
  }
  async function getRoom(code, tx = repo) {
    const room = await tx.get(roomKey(code));
    requireThat(room, 'ROOM', '没有找到这间课堂，请核对二维码。'); return room;
  }
  function publicRound(round) {
    if (!round) return null;
    const open = !round.closedAt && now() < round.deadline;
    return {id: round.id, number: round.number, questionId: round.questionId || question.id,
      openedAt: round.openedAt, deadline: round.deadline,
      status: open ? 'open' : 'closed', revealed: !!round.revealed,
      ...(round.revealed ? {counts: round.counts, total: round.total} : {})};
  }
  async function mutateRoom(code, fn) {
    return repo.transaction(async tx => {
      const room = await getRoom(code, tx);
      await fn(room, tx);
      await tx.set(roomKey(code), room);
      return {ok: true};
    });
  }
  async function selectedRound(room, questionId, source = repo) {
    roomQuestion(room,questionId);
    if (room.round && (room.round.questionId || question.id) === questionId) return room.round;
    const id = room.questionRounds?.[questionId];
    return id ? source.get('round_' + id) : null;
  }
  async function mutateRound(code, data, fn) {
    return mutateRoom(code, async (room, tx) => {
      const id = roomQuestion(room,data.questionId).id;
      const round = await selectedRound(room, id, tx);
      requireThat(round && data.roundId === round.id, 'ROUND', '轮次已变化，请刷新后操作。');
      await fn(round, tx);
      if (room.round?.id === round.id) room.round = round;
      await tx.set('round_' + round.id, {kind: 'round', roomCode: code, ...round});
    });
  }
  async function countsFor(roundId) {
    const entries = await Promise.all(['A','B','C','D'].map(async choice => [choice, await repo.count({kind:'answer',roundId,choice})]));
    const counts = Object.fromEntries(entries);
    return {counts,total:Object.values(counts).reduce((sum,n)=>sum+n,0)};
  }
  async function comparisonFor(roomCode,data){
    const room=await getRoom(roomCode),selected=roomQuestion(room,data.questionId);
    const round=await selectedRound(room,selected.id);
    requireThat(round&&data.roundId===round.id,'ROUND','轮次已变化，请重新展示结果。');
    requireThat(round.revealed,'HIDDEN','请先展示结果，再查看各轮对比和AI分析。');
    const rounds=(await repo.list({kind:'round',roomCode})).filter(r=>(r.questionId || question.id)===selected.id&&r.number<=round.number);
    requireThat(rounds.every(r=>r.closedAt||now()>=r.deadline),'OPEN','仍有轮次正在作答。');
    return snapshot(questions.get(selected.id),rounds,await repo.list({kind:'answer',roomCode}),analysisNamespace);
  }
  const analysisKey=(roomCode,questionId)=>'analysis_'+roomCode+'_'+questionId;
  function publicAnalysis(row,fingerprint){
    if(!row||row.fingerprint!==fingerprint)return {status:'idle'};
    if(row.status==='pending'&&row.leaseUntil<=now())return {status:'failed',message:'AI分析超时，可再次点击展示结果重试。'};
    return {status:row.status,...(row.status==='ready'?{summary:row.result.summary,model:row.result.model,generatedAt:row.generatedAt}:{}),
      ...(row.status==='failed'?{message:'AI小结暂未生成，可再次点击展示结果重试。'}:{})};
  }
  const gateKey = (roundId,bucket) => 'gate_' + roundId + '_' + bucket;
  async function closeGates(round,tx) {
    // Write the same gates that submissions write. Reading the room alone is
    // insufficient under snapshot isolation: an in-flight answer could otherwise
    // commit after publication and be missing from the frozen distribution.
    for(let bucket=0;bucket<16;bucket++)await tx.set(gateKey(round.id,bucket),{kind:'gate',closed:true,version:0});
  }
  async function run(event, caller = 'unknown') {
    requireThat(event && typeof event === 'object' && !Array.isArray(event), 'INPUT', '请求格式错误。');
    const {action, token, roomCode} = event;
    const data = event.data || {};
    requireThat(typeof data === 'object' && !Array.isArray(data), 'INPUT', '请求格式错误。');
    if (action === 'teacher.login') {
      requireThat(teacherPasswordHash, 'CONFIG', '教师账户尚未配置。');
      await limited('teacher-login:' + caller, 8);
      requireThat(await checkPassword(data.password, teacherPasswordHash), 'AUTH', '教师口令不正确。');
      return {...await issue('teacher', 'teacher'), role: 'teacher'};
    }
    if (action === 'student.login') {
      const who = identity(data), room = await getRoom(roomCode);
      await limited('student-login:' + caller, 20);
      const userId = 'student_' + hash(who.studentNumber);
      await repo.transaction(async tx => {
        const existing = await tx.get(userId);
        requireThat(!existing || existing.name === who.name, 'IDENTITY', '姓名与该学号已有记录不一致，请联系老师核对。');
        await tx.set(userId, {kind: 'student', ...who, createdAt: existing?.createdAt || now()});
      });
      // A class link allows identity registration, never teacher privileges.
      return {...await issue('student', userId), role: 'student', profile: who, roomCode: room.code};
    }
    if (action === 'room.public') {
      const room = await getRoom(roomCode);
      return {code: room.code, title: room.title, question: roomQuestion(room), round: publicRound(room.round)};
    }
    const session = await authenticate(token);
    if (action === 'logout') { await repo.remove('session_' + hash(token)); return {ok: true}; }
    if (action === 'me') {
      const profile = session.role === 'student' ? await repo.get(session.userId) : null;
      return {role: session.role, expiresAt: session.expiresAt,
        profile: profile ? {name: profile.name, studentNumber: profile.studentNumber} : null};
    }
    if (action === 'student.state') {
      requireThat(session.role === 'student', 'FORBIDDEN', '请使用学生身份。');
      const room = await getRoom(roomCode);
      const own = room.round ? await repo.get('answer_' + room.round.id + '_' + session.userId) : null;
      const selected=questions.get(roomQuestion(room).id),feedback=!!room.round && (!!room.round.revealed || !!room.answersReleasedAt);
      return {code: room.code, title: room.title, question:selected.question,
        round:room.round?{...publicRound(room.round),...(feedback?selected.answer:{})}:null,
        own:own?{...ownAnswer(own),...(feedback?{isCorrect:own.choice===selected.answer.correct}:{})}:null};
    }
    if (action === 'student.history') {
      requireThat(session.role === 'student', 'FORBIDDEN', '请使用学生身份。');
      const room = await getRoom(roomCode);
      // Both filters are server-controlled. Client-supplied student IDs never
      // select whose history is returned, and answers are never a public query.
      // Keep this response within the room version read above. A concurrent
      // withdrawal followed by a new question must not borrow an older release.
      const rounds = (await repo.list({kind:'round',roomCode})).filter(r=>r.number<room.nextRound);
      const rows = await repo.list({kind:'answer',roomCode,userId:session.userId});
      const ownByRound = new Map(rows.map(row=>[row.roundId,row]));
      const released = !!room.answersReleasedAt;
      return {code:room.code,title:room.title,answersReleasedAt:room.answersReleasedAt || null,
        questions:catalog.filter(({question:q})=>q.id.startsWith(roomLecture(room)+'-')).map(({question:selected,answer})=>{
          const attempts = rounds.filter(r=>r.questionId===selected.id).sort((a,b)=>a.number-b.number);
          const feedbackAvailable=attempts.length>0 && (released || attempts.some(r=>r.revealed));
          return {question:selected,feedbackAvailable,rounds:attempts.map(r=>{
            const own=ownByRound.get(r.id);
            return {id:r.id,number:r.number,openedAt:r.openedAt,deadline:r.deadline,
              status:!r.closedAt && now()<r.deadline?'open':'closed',
              own:own?{choice:own.choice,submittedAt:own.updatedAt,reason:own.reason || null,
                ...(feedbackAvailable?{isCorrect:own.choice===answer.correct}:{})}:null};
          }),...(feedbackAvailable?{answer}:{})};
        })};
    }
    if (action === 'student.submit') {
      requireThat(session.role === 'student', 'FORBIDDEN', '请使用学生身份。');
      requireThat(['A','B','C','D'].includes(data.choice) && typeof data.roundId === 'string', 'INPUT', '请选择一个选项。');
      await repo.transaction(async tx => {
        const room = await getRoom(roomCode,tx);
        const round = room.round;
        requireThat(round && round.id === data.roundId, 'ROUND', '老师已切换轮次，请刷新后作答。');
        requireThat(questionFor(round.questionId || question.id).options.some(([choice])=>choice===data.choice),'INPUT','请选择本题的选项。');
        requireThat(!round.closedAt && now() < round.deadline && !round.revealed, 'CLOSED', '本轮已结束，无法再提交。');
        const gateId=gateKey(round.id,parseInt(hash(session.userId).slice(0,2),16)%16),gate=await tx.get(gateId);
        requireThat(gate && !gate.closed && now()<round.deadline,'CLOSED','本轮已结束，无法再提交。');
        const id = 'answer_' + round.id + '_' + session.userId, old = await tx.get(id);
        await tx.set(id, {kind:'answer', roomCode, roundId:round.id, questionId:round.questionId || question.id,
          userId:session.userId, choice:data.choice, updatedAt:now(), firstSubmittedAt:old?.firstSubmittedAt || now(),
          reason:old?.choice===data.choice ? old.reason || null : null});
        await tx.set(gateId,{...gate,version:gate.version+1});
      });
      return {ok:true, choice:data.choice};
    }
    if (action === 'student.reason') {
      requireThat(session.role==='student','FORBIDDEN','请使用学生身份。');
      requireThat(typeof data.roundId==='string' && ['A','B','C','D'].includes(data.choice) &&
        (data.reasonId===null || typeof data.reasonId==='string' && data.reasonId.length<=30),'INPUT','请选择一条原因。');
      let saved;
      await repo.transaction(async tx=>{
        const room=await getRoom(roomCode,tx),round=room.round;
        requireThat(round && round.id===data.roundId,'ROUND','老师已切换轮次，请刷新后作答。');
        requireThat(!round.closedAt && now()<round.deadline && !round.revealed,'CLOSED','本轮已结束，原因未保存；已提交的答案保留。');
        const gateId=gateKey(round.id,parseInt(hash(session.userId).slice(0,2),16)%16),gate=await tx.get(gateId);
        requireThat(gate && !gate.closed && now()<round.deadline,'CLOSED','本轮已结束，原因未保存；已提交的答案保留。');
        const id='answer_'+round.id+'_'+session.userId,own=await tx.get(id);
        requireThat(own,'ANSWER','请先提交答案，再补充选择原因。');
        requireThat(own.choice===data.choice,'CHOICE','答案已改变，请刷新后为当前答案补充原因。');
        const option=reasonOptions(round.questionId || question.id,own.choice).find(r=>r.id===data.reasonId);
        requireThat(data.reasonId===null || option,'INPUT','原因与当前所选答案不匹配。');
        requireThat(data.comment===undefined||typeof data.comment==='string','INPUT','请填写有效的原因补充。');
        const comment=(data.comment||'').normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g,' ').trim();
        requireThat([...comment].length<=300 && (!comment||option),'INPUT','请先选择原因或使用“其他”，补充最多300字。');
        saved=option?{id:option.id,text:option.text,version:reasons.version,submittedAt:now(),...(comment?{comment}:{})}:null;
        // A reason update neither re-submits the answer nor changes its timestamp.
        await tx.set(id,{...own,reason:saved});
        await tx.set(gateId,{...gate,version:gate.version+1});
      });
      return {ok:true,reason:saved};
    }
    await authenticate(token, 'teacher');
    if(action==='teacher.analysisStatus'){
      const room=await getRoom(roomCode),round=await selectedRound(room,questionFor(data.questionId).id);
      requireThat(round?.id===data.roundId&&round.revealed,'ROUND','轮次已变化，请重新展示结果。');
      return {analysis:publicAnalysis(await repo.get(analysisKey(roomCode,data.questionId)),data.fingerprint)};
    }
    if (action === 'teacher.create') {
      const code = crypto.randomBytes(6).toString('hex').toUpperCase();
      const title = typeof data.title === 'string' ? data.title.trim().slice(0,60) : '第七讲课堂';
      await repo.set(roomKey(code), {kind:'room', code, lectureId:data.lectureId==='l08'?'l08':'l07', title:title || '第七讲课堂', createdAt:now(), nextRound:1, round:null, questionRounds:{}});
      return {code};
    }
    if (action === 'teacher.rooms') {
      const rooms = await repo.list({kind:'room'});
      return {rooms:rooms.sort((a,b)=>b.createdAt-a.createdAt).map(r=>({code:r.code,title:r.title,lectureId:roomLecture(r),createdAt:r.createdAt}))};
    }
    if (action === 'teacher.state') {
      const room = await getRoom(roomCode), selected = roomQuestion(room,data.questionId);
      const round = await selectedRound(room, selected.id);
      const stats = round ? (round.revealed ? {counts:round.counts,total:round.total} : await countsFor(round.id)) : {};
      return {code:room.code,title:room.title,answersReleasedAt:room.answersReleasedAt || null,question:selected,defaultSeconds:timing[selected.id] || 60,round:round ? {...publicRound(round),...stats,...(round.revealed?questions.get(selected.id).answer:{})} : null};
    }
    if (action === 'teacher.reasonStats') {
      const room=await getRoom(roomCode),selected=roomQuestion(room,data.questionId);
      const round=await selectedRound(room,selected.id);
      requireThat(round && round.id===data.roundId,'ROUND','轮次已变化，请刷新后查看原因统计。');
      const rows=await repo.list({kind:'answer',roomCode,roundId:round.id});
      return {questionId:selected.id,roundId:round.id,total:rows.length,
        choices:selected.options.map(([choice])=>{
          const answers=rows.filter(row=>row.choice===choice),counts=new Map();
          for(const r of reasonOptions(selected.id,choice))counts.set(JSON.stringify([r.id,r.text]),{...r,count:0});
          for(const row of answers)if(row.reason){
            const key=JSON.stringify([row.reason.id,row.reason.text]);
            if(!counts.has(key))counts.set(key,{id:row.reason.id,text:row.reason.text,count:0});
            counts.get(key).count++;
          }
          const submitted=answers.filter(row=>row.reason).length;
          return {choice,total:answers.length,submitted,missing:answers.length-submitted,reasons:[...counts.values()],
            comments:answers.filter(row=>row.reason?.comment).map(row=>row.reason.comment)};
        })};
    }
    if(['teacher.comparison','teacher.analyze','teacher.analysisDetails'].includes(action)){
      const snap=await comparisonFor(roomCode,data),key=analysisKey(roomCode,snap.public.questionId);
      if(action==='teacher.analyze'){
        requireThat(analyze,'AI_CONFIG','AI模型尚未配置，柱状图仍可正常展示。');
        requireThat(snap.public.rounds.some(r=>r.total>0),'EMPTY','本题暂无已提交答案，暂不生成AI小结。');
        let claimed=false,leaseId=random();
        await repo.transaction(async tx=>{
          const old=await tx.get(key);
          if(old?.fingerprint===snap.fingerprint&&(old.status==='ready'||old.status==='pending'&&old.leaseUntil>now()))return;
          await tx.set(key,{kind:'analysis',roomCode,questionId:snap.public.questionId,fingerprint:snap.fingerprint,status:'pending',leaseId,leaseUntil:now()+70000});claimed=true;
        });
        if(claimed){
          try{
            await limited('ai-analysis:'+roomCode,10,60000);
            const generated=await analyze(snap.input),validated=validateAnalysis(generated,snap.input);
            await repo.transaction(async tx=>{const old=await tx.get(key);if(old?.leaseId===leaseId)await tx.set(key,{...old,status:'ready',generatedAt:now(),result:{...validated,model:String(generated.model||'configured-model').slice(0,80)}});});
          }catch(error){
            const diagnostic=String(error.code||error.name||'AI_FAILED').replace(/[^A-Za-z0-9_.-]/g,'').slice(0,80);
            const explanation=String(error.message||'').replace(/Bearer\s+\S+|(?:secret|token|key)\s*[:=]\s*\S+/gi,'[已隐藏]').slice(0,200);
            await repo.transaction(async tx=>{const old=await tx.get(key);if(old?.leaseId===leaseId)await tx.set(key,{...old,status:'failed',diagnostic,explanation,...(error.candidate?{candidate:error.candidate}:{})});});
          }
        }
      }
      const stored=await repo.get(key),analysis=publicAnalysis(stored,snap.fingerprint);
      return {...snap.public,fingerprint:snap.fingerprint,analysis,
        ...(action==='teacher.analysisDetails'?{reasonRounds:snap.input.reasonRounds,...(analysis.status==='failed'?{diagnostic:stored?.diagnostic,explanation:stored?.explanation,candidate:stored?.candidate}:{}),
          ...(analysis.status==='ready'?{details:stored.result}:{})}: {})};
    }
    if (action === 'teacher.open') {
      if (data.questionId !== undefined) questionFor(data.questionId);
      return mutateRoom(roomCode, async (room,tx) => {
        requireThat(!room.answersReleasedAt, 'RELEASED', '本课堂已开放答案，请先在课后管理页收回答案，或新建课堂。');
        const selected = roomQuestion(room,data.questionId);
        const seconds = data.seconds === undefined ? timing[selected.id] || 60 : data.seconds;
        requireThat(Number.isInteger(seconds) && seconds >= 15 && seconds <= 300, 'INPUT', '答题时间须为15—300秒。');
        if(Object.hasOwn(data,'roundId')){
          const previous=await selectedRound(room,selected.id,tx);
          requireThat((previous?.id || null)===(data.roundId || null),'ROUND','轮次已变化，请刷新后再次作答。');
        }
        room.questionRounds ||= {};
        if (room.round) {
          room.questionRounds[room.round.questionId || question.id] = room.round.id;
          const switching = (room.round.questionId || question.id) !== selected.id;
          requireThat(switching || room.round.closedAt || now() >= room.round.deadline || Object.hasOwn(data,'roundId'), 'OPEN', '本题仍在作答，请先展示回答。');
          if (!room.round.closedAt) {
            room.round.closedAt = now();
            await closeGates(room.round,tx);
            await tx.set('round_' + room.round.id,{kind:'round',roomCode,...room.round});
          }
        }
        const round = {id:crypto.randomUUID(),number:room.nextRound++,questionId:selected.id,
          openedAt:now(),deadline:now()+seconds*1000,closedAt:null,revealed:false,counts:{A:0,B:0,C:0,D:0},total:0};
        room.round = round; room.questionRounds[selected.id] = round.id; await tx.set('round_'+round.id,{kind:'round',roomCode,...round});
        for(let bucket=0;bucket<16;bucket++)await tx.set(gateKey(round.id,bucket),{kind:'gate',closed:false,version:0});
      });
    }
    if (action === 'teacher.reveal') {
      // Close the selected round before publishing an immutable aggregate.
      // Old-question review must never replace the currently active question.
      await mutateRound(roomCode,data,async (round,tx)=>{
        round.closedAt = round.closedAt || now();
        await closeGates(round,tx);
      });
      const stats = await countsFor(data.roundId);
      return mutateRound(roomCode,data,async round=>{Object.assign(round,stats,{revealed:true});});
    }
    if (['teacher.close','teacher.extend'].includes(action)) {
      return mutateRound(roomCode,data,async (round,tx)=>{
        if (action === 'teacher.close') {round.closedAt=round.closedAt||now();await closeGates(round,tx);}
        if (action === 'teacher.extend') {
          requireThat(!round.closedAt && now()<round.deadline && !round.revealed,'CLOSED','已结束的轮次不能延长，请重新发题。');
          requireThat(round.deadline-round.openedAt<300000,'INPUT','本轮已达到最长作答时间。');
          round.deadline=Math.min(round.deadline+30000,round.openedAt+300000);
        }
      });
    }
    if (action === 'teacher.releaseAnswers') {
      requireThat(typeof data.released==='boolean','INPUT','请明确选择开放或收回答案。');
      return mutateRoom(roomCode,async(room,tx)=>{
        if(data.released){
          requireThat(room.round,'ROUND','本课堂尚未发题。');
          requireThat(room.round.closedAt || now()>=room.round.deadline,'OPEN','还有题目正在作答，请先结束作答，再开放答案。');
          // An expired round may still have open submission gates. Close them
          // atomically with release so in-flight writes cannot cross publication.
          if(!room.round.closedAt){
            room.round.closedAt=now();await closeGates(room.round,tx);
            await tx.set('round_'+room.round.id,{kind:'round',roomCode,...room.round});
          }
          room.answersReleasedAt=room.answersReleasedAt || now();
        }else room.answersReleasedAt=null;
      });
    }
    if (action === 'teacher.export') {
      const room = await getRoom(roomCode);
      const rounds = await repo.list({kind:'round',roomCode});
      const rows = await repo.list({kind:'answer',roomCode});
      const students = new Map();
      for (const row of rows) if (!students.has(row.userId)) students.set(row.userId, await repo.get(row.userId));
      // Answer keys and grades belong to this authenticated teacher response only.
      // Student answer release remains a separate, explicit classroom action.
      const roundQuestions = new Map(rounds.map(r=>[r.id,r.questionId || question.id]));
      return {room:{code:room.code,title:room.title},question,
        questions:catalog.map(record=>({...record.question,...record.answer})),
        rounds:rounds.sort((a,b)=>a.number-b.number).map(r=>({id:r.id,questionId:r.questionId || question.id,number:r.number,openedAt:r.openedAt,deadline:r.deadline,closedAt:r.closedAt,total:rows.filter(row=>row.roundId===r.id).length})),
        rows:rows.map(r=>{
          const questionId=r.questionId || roundQuestions.get(r.roundId) || question.id;
          return {roundId:r.roundId,questionId,choice:r.choice,
            isCorrect:r.choice===questions.get(questionId).answer.correct,
            submittedAt:r.updatedAt,reason:r.reason || null,
            name:students.get(r.userId)?.name || '', studentNumber:students.get(r.userId)?.studentNumber || ''};
        })};
    }
    throw new AppError('ACTION','不支持的操作。');
  }
  return {async handle(event,caller) {
    try { return {ok:true, data:await run(event,caller), serverTime:now()}; }
    catch(error) {
      // Do not return SDK errors, credentials, input, or stack traces to clients.
      return {ok:false,error:{code:error instanceof AppError ? error.code : 'SERVER',
        message:error instanceof AppError ? error.message : '服务暂时不可用，请稍后重试。'},serverTime:now()};
    }
  }};
}
module.exports = {createService, passwordHash, question, questions};
