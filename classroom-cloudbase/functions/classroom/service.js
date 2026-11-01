'use strict';
const crypto = require('node:crypto');
const {promisify} = require('node:util');
const scrypt = promisify(crypto.scrypt);
const DAY = 86400000;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const random = () => crypto.randomBytes(32).toString('base64url');
const catalog = require('./questions.json');
const questions = new Map(catalog.map(record => [record.question.id, record]));
const question = questions.get('l07-q1').question;
function questionFor(id) {
  requireThat(typeof id === 'string' && questions.has(id), 'QUESTION', '没有找到这道思考题。');
  return questions.get(id).question;
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
function createService(repo, {teacherPasswordHash = '', now = Date.now} = {}) {
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
    questionFor(questionId);
    if (room.round && (room.round.questionId || question.id) === questionId) return room.round;
    const id = room.questionRounds?.[questionId];
    return id ? source.get('round_' + id) : null;
  }
  async function mutateRound(code, data, fn) {
    return mutateRoom(code, async (room, tx) => {
      const id = data.questionId || room.round?.questionId || question.id;
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
      return {code: room.code, title: room.title, question: questionFor(room.round?.questionId || question.id), round: publicRound(room.round)};
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
      return {code: room.code, title: room.title, question: questionFor(room.round?.questionId || question.id), round: publicRound(room.round),
        own: own ? {choice: own.choice, updatedAt: own.updatedAt} : null};
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
        questions:catalog.map(({question:selected,answer})=>{
          const attempts = rounds.filter(r=>r.questionId===selected.id).sort((a,b)=>a.number-b.number);
          return {question:selected,rounds:attempts.map(r=>{
            const own=ownByRound.get(r.id);
            return {id:r.id,number:r.number,openedAt:r.openedAt,deadline:r.deadline,
              status:!r.closedAt && now()<r.deadline?'open':'closed',
              own:own?{choice:own.choice,submittedAt:own.updatedAt,
                ...(released?{isCorrect:own.choice===answer.correct}:{})}:null};
          }),...(released && attempts.length?{answer}:{})};
        })};
    }
    if (action === 'student.submit') {
      requireThat(session.role === 'student', 'FORBIDDEN', '请使用学生身份。');
      requireThat(['A','B','C','D'].includes(data.choice) && typeof data.roundId === 'string', 'INPUT', '请选择一个选项。');
      await repo.transaction(async tx => {
        const room = await getRoom(roomCode,tx);
        const round = room.round;
        requireThat(round && round.id === data.roundId, 'ROUND', '老师已切换轮次，请刷新后作答。');
        requireThat(!round.closedAt && now() < round.deadline && !round.revealed, 'CLOSED', '本轮已结束，无法再提交。');
        const gateId=gateKey(round.id,parseInt(hash(session.userId).slice(0,2),16)%16),gate=await tx.get(gateId);
        requireThat(gate && !gate.closed && now()<round.deadline,'CLOSED','本轮已结束，无法再提交。');
        const id = 'answer_' + round.id + '_' + session.userId, old = await tx.get(id);
        await tx.set(id, {kind:'answer', roomCode, roundId:round.id, questionId:round.questionId || question.id,
          userId:session.userId, choice:data.choice, updatedAt:now(), firstSubmittedAt:old?.firstSubmittedAt || now()});
        await tx.set(gateId,{...gate,version:gate.version+1});
      });
      return {ok:true, choice:data.choice};
    }
    await authenticate(token, 'teacher');
    if (action === 'teacher.create') {
      const code = crypto.randomBytes(6).toString('hex').toUpperCase();
      const title = typeof data.title === 'string' ? data.title.trim().slice(0,60) : '第七讲课堂';
      await repo.set(roomKey(code), {kind:'room', code, title:title || '第七讲课堂', createdAt:now(), nextRound:1, round:null, questionRounds:{}});
      return {code};
    }
    if (action === 'teacher.rooms') {
      const rooms = await repo.list({kind:'room'});
      return {rooms:rooms.sort((a,b)=>b.createdAt-a.createdAt).map(r=>({code:r.code,title:r.title,createdAt:r.createdAt}))};
    }
    if (action === 'teacher.state') {
      const room = await getRoom(roomCode), selected = questionFor(data.questionId || room.round?.questionId || question.id);
      const round = await selectedRound(room, selected.id);
      const stats = round ? (round.revealed ? {counts:round.counts,total:round.total} : await countsFor(round.id)) : {};
      return {code:room.code,title:room.title,answersReleasedAt:room.answersReleasedAt || null,question:selected,round:round ? {...publicRound(round),...stats,...(round.revealed?questions.get(selected.id).answer:{})} : null};
    }
    if (action === 'teacher.open') {
      const seconds = data.seconds === undefined ? 60 : data.seconds;
      requireThat(Number.isInteger(seconds) && seconds >= 15 && seconds <= 300, 'INPUT', '答题时间须为15—300秒。');
      if (data.questionId !== undefined) questionFor(data.questionId);
      return mutateRoom(roomCode, async (room,tx) => {
        requireThat(!room.answersReleasedAt, 'RELEASED', '本课堂已开放答案，请先在课后管理页收回答案，或新建课堂。');
        const selected = questionFor(data.questionId || room.round?.questionId || question.id);
        room.questionRounds ||= {};
        if (room.round) {
          room.questionRounds[room.round.questionId || question.id] = room.round.id;
          const switching = (room.round.questionId || question.id) !== selected.id;
          requireThat(switching || room.round.closedAt || now() >= room.round.deadline, 'OPEN', '本题仍在作答，请先展示回答。');
          if (switching && !room.round.closedAt) {
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
      await getRoom(roomCode);
      const rounds = await repo.list({kind:'round',roomCode});
      const rows = await repo.list({kind:'answer',roomCode});
      const students = new Map();
      for (const row of rows) if (!students.has(row.userId)) students.set(row.userId, await repo.get(row.userId));
      return {question,questions:catalog.map(record=>record.question),rounds:rounds.sort((a,b)=>a.number-b.number).map(r=>({id:r.id,questionId:r.questionId || question.id,number:r.number,openedAt:r.openedAt,deadline:r.deadline,closedAt:r.closedAt,total:rows.filter(row=>row.roundId===r.id).length})),
        rows:rows.map(r=>({roundId:r.roundId,questionId:r.questionId,choice:r.choice,
          submittedAt:r.updatedAt, name:students.get(r.userId)?.name || '', studentNumber:students.get(r.userId)?.studentNumber || ''}))};
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
