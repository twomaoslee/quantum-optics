(async function(){
 'use strict';
 const api=QOApi,$=id=>document.getElementById(id),room=new URLSearchParams(location.search).get('room');
 let state=null,roundId=null,polling=false,busy=false;
 function message(text){$('message').textContent=text||'';}
 function environment(){if(api.config.dev){$('environment').hidden=false;$('environment').textContent='本机联调 · 请使用虚拟姓名和学号。云端服务尚未接通。';}}
 environment();
 function controls(){
  const round=state?.round,open=round?.status==='open'&&api.now()<round.deadline;
  $('choices').disabled=!open||busy;
  $('submit').disabled=!open||busy||!document.querySelector('input[name=choice]:checked');
  $('submit').textContent=busy?'正在提交…':state?.own?'更新答案':'提交答案';
  $('timer').textContent=open?Math.max(0,Math.ceil((round.deadline-api.now())/1000))+' 秒':'';
  $('state').textContent=!round?'等待老师发题':open?'第 '+round.number+' 轮 · 正在作答':round.revealed?'第 '+round.number+' 轮 · 已公布统计':'本轮已结束，等待老师公布';
 }
 function richText(element,text){
  element.replaceChildren();
  for(const part of text.split(/(\$[^$]+\$)/g)){
   if(part.startsWith('$')&&part.endsWith('$')&&window.katex){const span=document.createElement('span');katex.render(part.slice(1,-1),span,{throwOnError:false,trust:false});element.append(span);}
   else element.append(document.createTextNode(part));
  }
 }
 function draw(next){
  state=next;$('title').textContent=next.question.title;richText($('stem'),next.question.stem);
  richText($('reference'),next.question.reference);$('math').replaceChildren();
  for(let math of next.question.mathLines||[next.question.math]){
   if(innerWidth<500)math=String.raw`\begin{gathered}`+math.replace(/,\s*\\(?:qquad|quad)\s*/g,String.raw`\\`)+String.raw`\end{gathered}`;
   const line=document.createElement('div');line.className='math-line';
   if(window.katex)katex.render(math,line,{throwOnError:false,displayMode:true,trust:false});
   else line.textContent=math;
   $('math').append(line);
  }
  if(roundId!==next.round?.id || !$('choices').children.length){
   roundId=next.round?.id;$('choices').replaceChildren();
   for(const [value,text] of next.question.options){
    const label=document.createElement('label'),radio=document.createElement('input'),span=document.createElement('span');
    radio.type='radio';radio.name='choice';radio.value=value;radio.checked=next.own?.choice===value;
    richText(span,value+'　'+text);label.append(radio,span);$('choices').append(label);
   }
  }
  $('receipt').textContent=next.own?'已收到你的答案 '+next.own.choice+'。'+(next.round?.status==='open'?'截止前可修改。':''):'';
  const result=$('result');result.hidden=!next.round?.revealed;result.replaceChildren();
  if(next.round?.revealed){
   const heading=document.createElement('h2');heading.textContent='全班作答 · '+next.round.total+' 人';result.append(heading);
   for(const [letter] of next.question.options){const p=document.createElement('p');p.textContent=letter+'：'+next.round.counts[letter]+' 人';result.append(p);}
   if(next.round.correct){const p=document.createElement('p');p.textContent='答案 '+next.round.correct+'：'+next.round.explanation;result.append(p);}
  }
  controls();
 }
 async function refresh(clearMessage=true){
  if(polling||busy||document.hidden||!api.stored())return;polling=true;
  try{draw(await api.call('student.state',{},room));if(clearMessage)message('');}
  catch(e){message(e.message);if(e.code==='AUTH')showLogin();}
  finally{polling=false;}
 }
 function showLogin(){$('login').hidden=false;$('workspace').hidden=true;state=null;roundId=null;$('choices').replaceChildren();$('receipt').textContent='';$('result').replaceChildren();}
 async function enter(profile){
  if(new URLSearchParams(location.search).get('return')==='history'){const url=new URL('history.html',location.href);url.search='';url.searchParams.set('room',room);location.replace(url.href);return;}
  $('profile').textContent=profile.name+' · '+profile.studentNumber;$('login').hidden=true;$('workspace').hidden=false;await refresh();
 }
 $('login-form').addEventListener('submit',async e=>{
  e.preventDefault();const button=e.submitter;button.disabled=true;message('');
  try{const data=Object.fromEntries(new FormData(e.target)),signed=await api.call('student.login',data,room);api.save(signed);await enter(signed.profile);}
  catch(error){message(error.message);}finally{button.disabled=false;}
 });
 $('choices').addEventListener('change',controls);
 $('answer-form').addEventListener('submit',async e=>{
  e.preventDefault();const choice=document.querySelector('input[name=choice]:checked')?.value;if(!choice||busy)return;
  busy=true;controls();message('');
  try{await api.call('student.submit',{choice,roundId},room);state.own={choice};$('receipt').textContent='已收到你的答案 '+choice+'。';}
  catch(error){message(error.message);}finally{busy=false;controls();await refresh(false);}
 });
 $('logout').addEventListener('click',async()=>{try{await api.call('logout');api.save(null);showLogin();}catch(error){message(error.message);}});
 if(!room || !/^[A-F0-9]{12}$/.test(room)){message('请扫描老师课件上的课堂二维码进入。');$('login-form').hidden=true;return;}
 for(const [id,file]of [['live-link','student.html'],['my-answers','history.html']]){const url=new URL(file,location.href);url.search='';url.searchParams.set('room',room);$(id).href=url.href;}
 if(api.stored())try{const me=await api.call('me');if(me.role==='student')await enter(me.profile);else api.save(null);}catch(error){message(error.message);}
 else try{await api.call('room.public',{},room);}catch(error){message(error.message);}
 setInterval(refresh,5000);setInterval(controls,250);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
