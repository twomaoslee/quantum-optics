(async function(){
 'use strict';
 const api=QOApi,$=id=>document.getElementById(id),params=new URLSearchParams(location.search),questionId=params.get('question')||'l07-q1';
 if(!/^(l07-q[1-6]|l08-q[1-5])$/.test(questionId)){$('message').textContent='题目链接无效。';return;}
 const lectureId=questionId.split('-')[0],lectureTitle=lectureId==='l08'?'第八讲课堂':'第七讲课堂';
 const roomKey='qo-last-room-v1:'+(api.config.envId||'local')+':'+lectureId,sameDay=t=>new Date(t).toLocaleDateString()===new Date().toLocaleDateString();
 const coordinator=params.get('coordinator')!=='0',cacheKey='qo-presenter-qr-v1:'+(api.config.envId||'local')+':'+lectureId+':'+(params.get('room')||'daily');let desiredRoom=params.get('room')||'',connected=false;
 let room='',state=null,busy=false,polling=false,connecting=false,active=window===parent,epoch=0,parentOrigin='*',expanded=false,comparison=null,analysisBusy=false,chartMode=null;
 const message=text=>{$('message').textContent=text||'';};
 function layout(){
  document.body.classList.toggle('inline-results',expanded);$('join').hidden=expanded;$('results').hidden=!expanded;
  // Keep the parent slide's fixed sidebar in every state; never opt into its
  // legacy full-slide results overlay. Results only replace content in this frame.
  parent.postMessage({type:'qo-classroom-results',expanded:false},parentOrigin);
 }
 function controls(){
  const r=state?.round,remaining=r?Math.max(0,Math.ceil((r.deadline-api.now())/1000)):0,open=r?.status==='open'&&remaining>0;
  $('start').disabled=busy||!room||!connected||!!state?.answersReleasedAt;$('show').disabled=busy||!r||!connected;
  $('start').textContent=r?'再次作答':'开始回答';$('show').textContent='展示结果';
  $('timer').textContent=!connected?'正在连接…':!r?'等待发题':open?String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0'):r.revealed?'已展示结果':'本轮已结束';
  $('participation').textContent=r?(open?'本轮作答中 · ':'')+r.total+' 人已答':'';
 }
 function draw(next){
  if(state?.round?.id!==next.round?.id){expanded=false;comparison=null;analysisBusy=false;layout();}
  state=next;$('classroom').hidden=false;controls();
 }
 function showConnection(){room='';state=null;connected=false;expanded=false;layout();$('classroom').hidden=true;$('connection').hidden=false;$('dev-connect').hidden=!api.config.dev;$('connect').hidden=!!api.config.dev;controls();}
 function cachedQR(){
  try{
   const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');
   if(!api.stored()||!cached||!sameDay(cached.createdAt)||!/^[A-F0-9]{12}$/.test(cached.room)||desiredRoom&&desiredRoom!==cached.room||!/^data:image\/png;base64,[A-Za-z0-9+/=]{1,50000}$/.test(cached.image))return;
   const url=new URL('student.html',location.href);url.search='';url.searchParams.set('room',cached.room);
   $('student-link').href=url.href;$('cached-qr').src=cached.image;$('cached-qr').hidden=false;$('qr').hidden=true;
   $('classroom').hidden=false;$('timer').textContent='正在连接…';
  }catch{}
 }
 function connect(){if(coordinator)return enter();parent.postMessage({type:'qo-classroom-connect'},parentOrigin);}
 function handleError(error){
  if(error.code==='AUTH'){showConnection();message('请在课前连接课堂。');if(coordinator)parent.postMessage({type:'qo-classroom-connection-required'},parentOrigin);}
  else{message(error.message);$('retry').hidden=false;}
 }
 async function fetchState(){const version=epoch,requested=room,next=await api.call('teacher.state',{questionId},requested);if(version===epoch&&requested===room)draw(next);}
 function drawComparison(){
  if(!comparison)return;const mode=chartMode||(comparison.rounds.length>2?'profile':'bars');
  $('chart-modes').hidden=comparison.rounds.length<3;$('mode-bars').setAttribute('aria-pressed',String(mode==='bars'));$('mode-profile').setAttribute('aria-pressed',String(mode==='profile'));
  QOComparison.drawCompact($('bars'),comparison,{mode});QOComparison.summary($('ai-brief'),comparison.analysis);
 }
 for(const mode of ['bars','profile'])$('mode-'+mode).addEventListener('click',()=>{chartMode=mode;drawComparison();parent.postMessage({type:'qo-classroom-return-focus'},parentOrigin);});
 async function analyze(){
  if(analysisBusy||!comparison||comparison.analysis?.status==='ready')return;
  const version=epoch,requested=room,roundId=state.round.id;analysisBusy=true;comparison.analysis={status:'pending'};drawComparison();
  try{
   const next=await api.call('teacher.analyze',{questionId,roundId},requested);
   if(version===epoch&&requested===room&&state?.round?.id===roundId){comparison=next;drawComparison();}
  }catch(error){if(version===epoch&&comparison){comparison.analysis={status:'failed',message:error.message};drawComparison();}}
  finally{if(version===epoch)analysisBusy=false;}
 }
 async function refresh(){
  if(!room||busy||polling||document.hidden||!active)return;polling=true;const version=epoch;
  try{
   await fetchState();
   if(expanded&&comparison?.analysis?.status==='pending'){
    const next=await api.call('teacher.analysisStatus',{questionId,roundId:state.round.id,fingerprint:comparison.fingerprint},room);
    if(version===epoch&&comparison){comparison.analysis=next.analysis;QOComparison.summary($('ai-brief'),next.analysis);}
   }
  }catch(error){handleError(error);}finally{polling=false;}
 }
 async function enter(){
  if(connecting)return;connecting=true;
  try{
   if(!api.stored()){showConnection();if(coordinator)parent.postMessage({type:'qo-classroom-connection-required'},parentOrigin);return;}
   const me=await api.call('me');if(me.role!=='teacher'){showConnection();if(coordinator)parent.postMessage({type:'qo-classroom-connection-required'},parentOrigin);return;}
   const {rooms}=await api.call('teacher.rooms'),explicit=desiredRoom,today=rooms.filter(r=>(r.lectureId||'l07')===lectureId&&r.title===lectureTitle&&sameDay(r.createdAt)),saved=localStorage.getItem(roomKey);
   if(explicit&&!rooms.some(r=>r.code===explicit&&(r.lectureId||'l07')===lectureId))throw new Error('课堂链接与本讲不一致。');
   room=(explicit&&rooms.find(r=>r.code===explicit)?.code)||today.find(r=>r.code===saved)?.code||today[0]?.code||'';
   if(!room){if(!coordinator)throw new Error('课堂连接尚未完成，请重试。');room=(await api.call('teacher.create',{title:lectureTitle,lectureId})).code;}
   localStorage.setItem(roomKey,room);const url=new URL('student.html',location.href);url.search='';url.searchParams.set('room',room);$('student-link').href=url.href;
   await QOQRCode.toCanvas($('qr'),url.href,{width:160,margin:2,errorCorrectionLevel:'M'});
   $('cached-qr').hidden=true;$('qr').hidden=false;
   try{localStorage.setItem(cacheKey,JSON.stringify({room,image:$('qr').toDataURL('image/png'),createdAt:Date.now()}));}catch{}
   $('connection').hidden=true;$('classroom').hidden=false;
   if(coordinator)parent.postMessage({type:'qo-classroom-connected',room},parentOrigin);
   await fetchState();connected=true;$('retry').hidden=true;message('');
  }catch(error){handleError(error);}finally{connecting=false;controls();}
 }
 $('connect').addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;const password=new FormData(event.target).get('password');event.target.reset();try{api.save(await api.call('teacher.login',{password}));await connect();}catch(error){handleError(error);}finally{button.disabled=false;}});
 $('dev-connect').addEventListener('click',async()=>{try{api.save(await api.call('dev.teacherLogin'));await connect();}catch(error){handleError(error);}});
 $('start').addEventListener('click',async()=>{
  if(busy||!room)return;busy=true;epoch++;expanded=false;comparison=null;analysisBusy=false;layout();controls();message('');
  try{await api.call('teacher.open',{questionId,roundId:state?.round?.id||null},room);await fetchState();parent.postMessage({type:'qo-classroom-started'},parentOrigin);}
  catch(error){handleError(error);}finally{busy=false;controls();}
 });
 $('show').addEventListener('click',async()=>{
  if(busy||!room||!state?.round)return;busy=true;epoch++;analysisBusy=false;controls();message('');const version=epoch;
  try{
   if(!state.round.revealed)await api.call('teacher.reveal',{questionId,roundId:state.round.id},room);
   await fetchState();comparison=await api.call('teacher.comparison',{questionId,roundId:state.round.id},room);
   if(version!==epoch)return;expanded=true;drawComparison();layout();parent.postMessage({type:'qo-classroom-return-focus'},parentOrigin);
  }catch(error){handleError(error);}finally{busy=false;controls();}
  if(version===epoch&&expanded)analyze();
 });
 $('retry').addEventListener('click',()=>room&&connected?refresh():connect());
 window.addEventListener('message',event=>{
  if(event.source!==parent)return;let trusted=event.origin===location.origin||event.origin==='null';try{trusted||=/^(localhost|127\.0\.0\.1)$/.test(new URL(event.origin).hostname);}catch{}if(!trusted)return;
  parentOrigin=event.origin==='null'?'*':event.origin;
  if(event.data?.type==='qo-classroom-connect'&&coordinator)enter();
  if(event.data?.type==='qo-classroom-connection-required'&&!coordinator)showConnection();
  if(event.data?.type==='qo-classroom-room'&&!coordinator&&/^[A-F0-9]{12}$/.test(event.data.room)&&(desiredRoom!==event.data.room||!connected)){desiredRoom=event.data.room;enter();}
  if(event.data?.type==='qo-classroom-results-dismissed'){expanded=false;layout();}
  if(event.data?.type==='qo-classroom-visibility'){active=event.data.active===true;if(active)refresh();}
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});setInterval(refresh,3000);setInterval(controls,250);cachedQR();if(coordinator)await enter();else if(!api.stored())showConnection();
})();
