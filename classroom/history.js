(async function(){
 'use strict';
 const api=QOApi,$=id=>document.getElementById(id),params=new URLSearchParams(location.search);
 let room=params.get('room')||api.stored()?.roomCode;
 let loading=false,authenticated=false;
 function message(text){$('message').textContent=text||'';}
 function link(file,extra={}){const url=new URL(file,location.href);url.search='';if(room)url.searchParams.set('room',room);for(const [key,value]of Object.entries(extra))url.searchParams.set(key,value);return url.href;}
 function richText(element,text){
  element.replaceChildren();for(const part of String(text||'').split(/(\$[^$]+\$)/g)){
   if(part.startsWith('$')&&part.endsWith('$')&&window.katex){const span=document.createElement('span');span.className='math-inline';katex.render(part.slice(1,-1),span,{throwOnError:false,trust:false});element.append(span);}
   else element.append(document.createTextNode(part));
  }
 }
 function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
 function result(round,released){
  if(!round)return {text:'未发题',kind:''};
  if(!round.own)return {text:round.status==='open'?'尚未提交':'未作答',kind:''};
  if(!released||typeof round.own.isCorrect!=='boolean')return {text:'待公布',kind:''};
  return round.own.isCorrect?{text:'答对',kind:'correct'}:{text:'答错',kind:'incorrect'};
 }
 function choiceText(q,choice){return choice?choice+'　'+(q.options.find(option=>option[0]===choice)?.[1]||''):'未作答';}
 function reasonLink(round){
  const a=node('a','',round.own.reason?'修改理由':'补填理由');
  a.href=link('student.html',{reasonRound:round.id});
  return a;
 }
 function questionDetails(q,answer){
  const detail=node('div'),stem=node('p','review-stem');richText(stem,q.stem);detail.append(stem);
  const maths=node('div','review-math');
  for(let math of q.mathLines||[q.math]){if(innerWidth<500)math=String.raw`\begin{gathered}`+math.replace(/,\s*\\(?:qquad|quad)\s*/g,String.raw`\\`)+String.raw`\end{gathered}`;const line=node('div');if(window.katex)katex.render(math,line,{throwOnError:false,displayMode:true,trust:false});else line.textContent=math;maths.append(line);}
  const ref=node('p','fine review-reference');richText(ref,q.reference);detail.append(maths,ref);
  const options=node('ul','review-options');for(const [letter,text]of q.options){const li=node('li'),span=node('span');richText(span,text);li.append(node('strong','',letter),span);options.append(li);}detail.append(options);
  if(answer){const solution=node('section','review-solution'),correct=node('p');richText(correct,'正确答案：'+choiceText(q,answer.correct));const explanation=node('p');richText(explanation,answer.explanation);solution.append(correct,node('h3','','简要解析'),explanation);detail.append(solution);}
  return detail;
 }
 function draw(data){
  const expanded=new Map([...document.querySelectorAll('details[data-key]')].map(el=>[el.dataset.key,el.open]));
  $('classroom-title').textContent=data.title;
  const anyReleased=data.questions.some(item=>item.answer);
  $('release-status').textContent=anyReleased?'可查看已开放的对错与解析。':'讨论题等老师展示结果，自查题提交后可查看对错与解析。';
  let issued=0,submitted=0,correct=0,graded=0;$('records').replaceChildren();
  for(const item of data.questions){
   const q=item.question,round=item.rounds.at(-1),released=!!item.answer,status=result(round,released);
   if(round)issued++;if(round?.own){submitted++;if(typeof round.own.isCorrect==='boolean')graded++;if(round.own.isCorrect===true)correct++;}
   const article=node('article','history-record'),head=node('div','record-head');article.dataset.question=q.id;
   head.append(node('h2','',q.title),node('span','record-badge '+status.kind,status.text));article.append(head);
   const selected=node('p','record-choice');richText(selected,round?'我的选择：'+choiceText(q,round.own?.choice):'本课堂尚未发出这道题。');article.append(selected);
   if(round?.own){const reason=node('p','fine');richText(reason,'我的选择原因：'+(round.own.reason?.text||'未填写')+(round.own.reason?.comment?' 补充：'+round.own.reason.comment:''));reason.append(' · ',reasonLink(round));article.append(reason);}
   if(round){
    const text='课堂第 '+round.number+' 次发题'+(round.own?' · '+new Date(round.own.submittedAt).toLocaleString():'');article.append(node('p','record-round',text));
    const details=node('details');details.dataset.key=q.id;details.open=expanded.get(q.id)||false;
    details.append(node('summary','',item.rounds.length>1?(released?'查看题目、解析与各轮记录':'查看题目与各轮记录'):released?'查看题目与解析':'查看题目与作答记录'),questionDetails(q,released?item.answer:null));
    if(item.analysis?.status==='ready'){const ai=node('section','review-solution');ai.append(node('h3','','全班 AI 小结'),node('p','',item.analysis.summary));details.append(ai);}
    else if(item.analysis?.status==='idle'&&round.own&&round.feedbackMode==='self-check'){
     details.addEventListener('toggle',async()=>{
      if(!details.open)return;
      try{const {analysis}=await api.call('student.summary',{questionId:q.id,roundId:round.id},data.code);if(analysis.status==='ready')await refresh();}catch{}
     });
    }
    if(item.rounds.length>1){const past=node('section');past.append(node('h3','','本题各轮作答'));const list=node('ul','attempts');
     for(const attempt of item.rounds){const li=node('li'),status=result(attempt,released),line=node('span');richText(line,'课堂第 '+attempt.number+' 次发题 · '+choiceText(q,attempt.own?.choice)+' · '+status.text);li.append(line);if(attempt.own?.reason){const why=node('span','attempt-meta');richText(why,'选择原因：'+attempt.own.reason.text+(attempt.own.reason.comment?' 补充：'+attempt.own.reason.comment:''));li.append(why);}if(attempt.own){const meta=node('span','attempt-meta',new Date(attempt.own.submittedAt).toLocaleString());meta.append(' · ',reasonLink(attempt));li.append(meta);}list.append(li);}past.append(list);details.append(past);}
    article.append(details);
   }
   $('records').append(article);
  }
  $('history-summary').textContent='已发题 '+issued+' 题 · 最后一轮已作答 '+submitted+' 题'+(graded?' · 已公布的已答题 '+graded+' 题，其中答对 '+correct+' 题':'');
 }
 function showLogin(){authenticated=false;$('history-workspace').hidden=true;$('history-auth').hidden=false;$('records').replaceChildren();$('profile').textContent='';}
 async function refresh(){
  if(loading||!authenticated||document.hidden)return;loading=true;$('refresh').disabled=true;message('');
  try{draw(await api.call('student.history',{},room));}
  catch(error){message(error.message);if(error.code==='AUTH'||error.code==='FORBIDDEN')showLogin();}
  finally{loading=false;$('refresh').disabled=false;}
 }
 async function listRooms(){
  try{
   const {rooms}=await api.call('student.rooms',{},room),picker=$('history-room');
   picker.replaceChildren(...rooms.map(item=>new Option(item.title+' · '+new Date(item.createdAt).toLocaleString('zh-CN')+(item.sessionType==='trial'?' · 试答':''),item.code)));
   picker.value=room;picker.disabled=rooms.length<2;
  }catch{}
 }
 $('history-room').addEventListener('change',event=>{room=event.target.value;location.assign(link('history.html'));});
 $('history-login').href=link('student.html',{return:'history'});$('live-link').href=link('student.html');$('history-link').href=link('history.html');
 $('environment').hidden=!api.config.dev;
 if(!/^[A-F0-9]{12}$/.test(room||'')){message('请从课堂作答页进入“我的答题”，或扫描老师的课堂二维码。');return;}
 $('refresh').addEventListener('click',refresh);
 $('logout').addEventListener('click',async()=>{try{await api.call('logout');api.save(null);showLogin();message('');}catch(error){message(error.message);}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 if(!api.stored()){showLogin();return;}
 try{const me=await api.call('me');if(me.role!=='student'){showLogin();return;}$('profile').textContent=me.profile.name+' · '+me.profile.studentNumber;authenticated=true;$('history-auth').hidden=true;$('history-workspace').hidden=false;await Promise.all([refresh(),listRooms()]);}
 catch(error){showLogin();message(error.message);}
})();
