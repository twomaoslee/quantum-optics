(async function(){
 'use strict';
 const api=QOApi,$=id=>document.getElementById(id),room=new URLSearchParams(location.search).get('room');
 let state=null,roundId=null,polling=false,busy=false,reasonBusy=false,epoch=0,reasonKey='',reasonRevision='';
 // Signatures of what is already in the DOM, so polls only rewrite what changed.
 let drawnQuestionId='',drawnOptionsKey='',drawnResultKey='';
 function setText(element,value){if(element&&element.textContent!==value)element.textContent=value;}
 function message(text){$('message').textContent=text||'';}
 function environment(){if(api.config.dev){$('environment').hidden=false;$('environment').textContent='本机联调 · 请使用虚拟姓名和学号。云端服务尚未接通。';}}
 environment();
 function controls(){
  const round=state?.round,open=round?.status==='open'&&api.now()<round.deadline;
  $('choices').disabled=!open||busy;
  $('submit').disabled=!open||busy||!document.querySelector('input[name=choice]:checked');
  setText($('submit'),busy&&!reasonBusy?'正在提交…':state?.own?'更新答案':'提交答案');
  setText($('timer'),open?Math.max(0,Math.ceil((round.deadline-api.now())/1000))+' 秒':round?.revealed?'已结束':round?'0 秒':'—');
  setText($('state'),!round?'等待老师发题':open?'第 '+round.number+' 轮 · 正在作答':round.revealed?'第 '+round.number+' 轮 · 已公布统计':'本轮已结束，等待老师公布');
  if($('reason-panel')&&state?.own){
   const pending=document.querySelector('input[name=choice]:checked')?.value!==state.own.choice;
   $('reason-form').hidden=pending;$('reason-choices').disabled=!open||busy;
   const comment=reasonComment(),selectedReason=selectedReasonId()||(comment?'other':null);
   $('save-reason').disabled=!open||busy||!selectedReason;
   setText($('save-reason'),reasonBusy?'正在保存…':'保存原因与补充');
   $('clear-reason').hidden=!state.own.reason;$('clear-reason').disabled=!open||busy;
   if($('other-reason-wrap')){$('other-reason-wrap').hidden=false;$('other-reason-text').disabled=!open||busy;}
   setText($('reason-hint'),pending?'请先更新答案，再为新答案补充原因。':!open?'本轮已结束，原因和补充已锁定。已提交的答案保留。':'选最接近你原本想法的一项，也可以只写自己的理由。不填写也算完成。');
   setText($('reason-receipt'),pending?'':legacyReason()?'先前保存的原因：'+state.own.reason.text+'。原因选项已更新，原记录保留。'+(open?'可重新选择后保存。':''):selectedReason&&(selectedReason!==state.own.reason?.id||comment!==(state.own.reason?.comment||''))?'原因或补充尚未保存。':state.own.reason?'已保存原因与补充。':'');
  }
 }
 function selectedReasonId(){return document.querySelector('input[name=reason]:checked')?.value;}
 function reasonComment(){return ($('other-reason-text')?.value||'').normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g,' ').trim();}
 function legacyReason(){return state?.own?.reason&&state.own.reasonOptionsVersion&&state.own.reason.version!==state.own.reasonOptionsVersion;}
 function richText(element,text){
  element.replaceChildren();
  for(const part of text.split(/(\$[^$]+\$)/g)){
   if(part.startsWith('$')&&part.endsWith('$')&&window.katex){const span=document.createElement('span');katex.render(part.slice(1,-1),span,{throwOnError:false,trust:false});element.append(span);}
   else element.append(document.createTextNode(part));
  }
 }
 function drawReasons(next){
  if(!$('reason-panel'))return;
  const own=next.own,options=own?.reasonOptions||[];
  $('reason-panel').hidden=!own||!options.length;
  if(!own){reasonKey='';reasonRevision='';$('reason-choices').replaceChildren();$('reason-receipt').textContent='';if($('other-reason-text'))$('other-reason-text').value='';return;}
  $('reason-for').textContent='对应已提交答案 '+own.choice+' · 按你提交时的想法填写';
  const key=next.round.id+':'+own.choice+':'+(own.reasonOptionsVersion||''),revision=key+':'+(own.reason?.id||'')+':'+(own.reason?.submittedAt||'');
  if(key!==reasonKey){
   reasonKey=key;$('reason-choices').replaceChildren();
   const legend=document.createElement('legend');legend.className='sr-only';legend.textContent='选择一条主要原因';$('reason-choices').append(legend);
   for(const option of options){
    if(option.id==='unsure'){const hint=document.createElement('p');hint.className='fine reason-general';hint.textContent='不确定／其他情况';$('reason-choices').append(hint);}
    const label=document.createElement('label'),radio=document.createElement('input'),text=document.createElement('span');
    radio.type='radio';radio.name='reason';radio.value=option.id;richText(text,option.text);label.append(radio,text);$('reason-choices').append(label);
   }
  }
  if(revision!==reasonRevision){
   reasonRevision=revision;
   for(const radio of document.querySelectorAll('input[name=reason]'))radio.checked=!legacyReason()&&radio.value===own.reason?.id;
   if($('other-reason-text'))$('other-reason-text').value=own.reason?.comment||'';
  }
  $('reason-receipt').textContent=own.reason?'已保存选择原因。':'';
 }
 function draw(next){
  const justPublished=next.round?.correct&&(!state?.round?.correct||state.round.id!==next.round.id);
  state=next;
  // A question's body never changes for a given id, so rebuild it only when the
  // question changes. Previously every 5s poll re-ran KaTeX on the stem and every
  // formula line, roughly 1200 times per lecture on each student's phone.
  if(drawnQuestionId!==next.question.id){
   drawnQuestionId=next.question.id;
   const number=$('question-number');if(number)number.textContent=next.question.title.match(/^思考题\s*\d+/)?.[0]||'当前题目';
   $('title').textContent=next.question.title;richText($('stem'),next.question.stem);
   richText($('reference'),next.question.reference);$('math').replaceChildren();
   for(let math of next.question.mathLines||[next.question.math]){
    if(innerWidth<500)math=String.raw`\begin{gathered}`+math.replace(/,\s*\\(?:qquad|quad)\s*/g,String.raw`\\`)+String.raw`\end{gathered}`;
    const line=document.createElement('div');line.className='math-line';
    if(window.katex)katex.render(math,line,{throwOnError:false,displayMode:true,trust:false});
    else line.textContent=math;
    $('math').append(line);
   }
  }
  const optionsKey=(next.round?.id||'')+'|'+next.question.id;
  if(optionsKey!==drawnOptionsKey || !$('choices').children.length){
   drawnOptionsKey=optionsKey;roundId=next.round?.id;$('choices').replaceChildren();
   for(const [value,text] of next.question.options){
    const label=document.createElement('label'),radio=document.createElement('input'),span=document.createElement('span');
    radio.type='radio';radio.name='choice';radio.value=value;radio.checked=next.own?.choice===value;
    richText(span,value+'　'+text);label.append(radio,span);$('choices').append(label);
   }
  }
  setText($('receipt'),next.own?'已收到你的答案 '+next.own.choice+'。'+(next.round?.status==='open'?'截止前可修改。':'')+(typeof next.own.isCorrect!=='boolean'?'老师展示结果后，这里会显示对错和解析。':''):'');
  drawReasons(next);
  const result=$('result');result.hidden=!next.round?.revealed&&!next.round?.correct;
  const resultKey=[next.round?.id,next.round?.revealed,next.round?.correct,next.own?.choice,next.own?.isCorrect,next.round?.total,JSON.stringify(next.round?.counts||null)].join('|');
  if(resultKey!==drawnResultKey){
   drawnResultKey=resultKey;result.replaceChildren();
   if(next.round?.correct){
    const ownHeading=document.createElement('h2');ownHeading.textContent=next.own?(next.own.isCorrect?'你答对了':'这次答错了'):'本轮未作答';result.append(ownHeading);
    const selected=document.createElement('p');if(next.own){richText(selected,'你的选择：'+next.own.choice+'　'+next.question.options.find(([key])=>key===next.own.choice)?.[1]);result.append(selected);}
    const correct=document.createElement('p');richText(correct,'正确答案：'+next.round.correct+'　'+next.question.options.find(([key])=>key===next.round.correct)?.[1]);
    const explanation=document.createElement('p');richText(explanation,next.round.explanation);result.append(correct,explanation);
   }
   if(next.round?.revealed){
    const heading=document.createElement('h2');heading.textContent='全班作答 · '+next.round.total+' 人';result.append(heading);
    for(const [letter] of next.question.options){const p=document.createElement('p');p.textContent=letter+'：'+next.round.counts[letter]+' 人';result.append(p);}
   }
  }
  controls();
  $('workspace').classList.add('ready');
  if(justPublished)result.scrollIntoView({block:'start'});
 }
 async function refresh(clearMessage=true){
  if(polling||busy||document.hidden||!api.stored())return;polling=true;
  const version=epoch;
  try{const next=await api.call('student.state',{},room);if(version===epoch){draw(next);if(clearMessage)message('');}}
  catch(e){message(e.message);if(e.code==='AUTH')showLogin();}
  finally{polling=false;}
 }
 function showLogin(){epoch++;document.body.classList.remove('answering');$('login').hidden=false;$('workspace').hidden=true;state=null;roundId=null;drawnQuestionId='';drawnOptionsKey='';drawnResultKey='';$('workspace').classList.remove('ready');$('choices').replaceChildren();$('receipt').textContent='';$('result').replaceChildren();drawReasons({own:null});}
async function enter(profile,firstState=null){
  if(new URLSearchParams(location.search).get('return')==='history'){const url=new URL('history.html',location.href);url.search='';url.searchParams.set('room',room);location.replace(url.href);return;}
  document.body.classList.add('answering');$('profile').textContent=profile.name+' · '+profile.studentNumber;$('login').hidden=true;$('workspace').hidden=false;
  // A returning student already carries a token, so me and student.state can be
  // fetched together instead of one after the other.
  if(firstState)draw(firstState);else await refresh();
}
 $('login-form').addEventListener('submit',async e=>{
  e.preventDefault();const button=e.submitter;button.disabled=true;message('');
  try{const data=Object.fromEntries(new FormData(e.target)),signed=await api.call('student.login',data,room);api.save(signed);await enter(signed.profile);}
  catch(error){message(error.message);}finally{button.disabled=false;}
 });
 $('choices').addEventListener('change',controls);
 $('answer-form').addEventListener('submit',async e=>{
  e.preventDefault();const choice=document.querySelector('input[name=choice]:checked')?.value;if(!choice||busy)return;
  busy=true;epoch++;controls();message('');
  try{
   await api.call('student.submit',{choice,roundId},room);
   draw(await api.call('student.state',{},room));
   if($('reason-panel')&&!$('reason-panel').hidden){$('reason-heading').focus({preventScroll:true});$('reason-panel').scrollIntoView({block:'start'});}
  }
  catch(error){message(error.message);}finally{busy=false;controls();await refresh(false);}
 });
 async function saveReason(reasonId){
  if(busy||!state?.own)return;
  busy=true;reasonBusy=true;epoch++;controls();message('');
  try{
   const comment=reasonId===null?'':reasonComment();
   await api.call('student.reason',{roundId,choice:state.own.choice,reasonId,comment},room);
   draw(await api.call('student.state',{},room));
   if(reasonId===null)$('reason-receipt').textContent='已清除原因，原答案保留。';
  }catch(error){message(error.message);}
  finally{busy=false;reasonBusy=false;controls();await refresh(false);}
 }
 if($('reason-form')){
  $('reason-choices').addEventListener('change',controls);
  $('reason-form').addEventListener('submit',event=>{event.preventDefault();const id=selectedReasonId()||(reasonComment()?'other':null);if(id)saveReason(id);});
  $('clear-reason').addEventListener('click',()=>saveReason(null));
  if($('other-reason-text'))$('other-reason-text').addEventListener('input',controls);
 }
 $('logout').addEventListener('click',async()=>{try{await api.call('logout');api.save(null);showLogin();}catch(error){message(error.message);}});
 if(!room || !/^[A-F0-9]{12}$/.test(room)){message('请扫描老师课件上的课堂二维码进入。');$('login-form').hidden=true;return;}
// Start downloading the SDK and establishing the anonymous session now, while the
// student is still filling in name and number. Failure here is non-fatal, and the
// optional call keeps an older cached api.js from breaking the whole page.
api.warm?.();
 for(const [id,file]of [['live-link','student.html'],['my-answers','history.html']]){const url=new URL(file,location.href);url.search='';url.searchParams.set('room',room);$(id).href=url.href;}
 if(api.stored())try{const [me,first]=await Promise.all([api.call('me'),api.call('student.state',{},room)]);if(me.role==='student')await enter(me.profile,first);else api.save(null);}catch(error){message(error.message);}
 else try{const info=await api.call('room.public',{},room);$('lecture-name').textContent=info.title;}catch(error){message(error.message);}
 setInterval(refresh,5000);setInterval(()=>{if(!document.hidden)controls();},250);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
