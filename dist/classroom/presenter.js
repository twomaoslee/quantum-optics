(async function(){
 'use strict';
 const api=QOApi,$=id=>document.getElementById(id),params=new URLSearchParams(location.search),questionId=params.get('question')||'l07-q1';
 if(!/^(l07-q[1-6]|l08-q[1-5])$/.test(questionId)){$('message').textContent='题目链接无效。';return;}
 const lectureId=questionId.split('-')[0],feedbackMode=$('feedback-mode'),defaultFeedback='self-check';
 const roomKey='qo-last-room-v1:'+(api.config.envId||'local')+':'+lectureId;
 const coordinator=params.get('coordinator')!=='0',cacheKey='qo-presenter-qr-v1:'+(api.config.envId||'local')+':'+lectureId+':'+(params.get('room')||'daily');let desiredRoom=params.get('room')||'',connected=false;
 let room='',anchor='',switchKind='',state=null,busy=false,polling=false,connecting=false,active=window===parent,epoch=0,parentOrigin='*',expanded=false,comparison=null,analysisBusy=false,chartMode=null;
 const setText=(id,value)=>{const node=$(id);if(node.textContent!==value)node.textContent=value;};
 const message=text=>setText('message',text||'');
 function layout(){
  document.body.classList.toggle('inline-results',expanded);$('join').hidden=expanded;$('results').hidden=!expanded;
  // Keep the parent slide's fixed sidebar in every state; never opt into its
  // legacy full-slide results overlay. Results only replace content in this frame.
  parent.postMessage({type:'qo-classroom-results',expanded:false},parentOrigin);
 }
 function controls(){
  const r=state?.round,remaining=r?Math.max(0,Math.ceil((r.deadline-api.now())/1000)):0,open=r?.status==='open'&&remaining>0;
  const selfCheck=r?.feedbackMode==='self-check',locked=busy||!connected||!!state?.archivedAt;
  $('start').disabled=locked||!room||!!state?.answersReleasedAt||selfCheck;
  $('show').disabled=busy||!r||!connected;
  setText('start',selfCheck?'已发出自查题':r?'再次作答':'开始回答');
  feedbackMode.disabled=locked||!!r;
  setText('feedback-hint',feedbackMode.value==='self-check'?'提交即看解析，答案锁定':'展示结果后看对错与解析');
  $('new-class').disabled=$('new-trial').disabled=busy||!connected||!state?.activeClass;
  $('confirm-class').disabled=$('cancel-class').disabled=busy;
  setText('session-label',state?.archivedAt?'已归档':state?.sessionType==='trial'?'试答场次':state?.sessionType==='class'?'正式课堂':'课堂场次');
  setText('status-caption',open?'剩余时间':'课堂状态');
  setText('timer',!connected?'正在连接…':!r?'等待发题':open?String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0'):r.revealed?'已展示结果':'本轮已结束');
  setText('participation',r?r.total+' 人已答':connected?'发题后 '+(state?.defaultSeconds||60)+' 秒':'');
  $('classroom').classList.toggle('round-open',open);
 }
 function draw(next){
  if(state?.round?.id!==next.round?.id){expanded=false;comparison=null;analysisBusy=false;layout();}
  if(next.round)feedbackMode.value=next.round.feedbackMode||'discussion';
  else if(state?.code!==next.code)feedbackMode.value=defaultFeedback;
  state=next;$('classroom').hidden=false;controls();
 }
 function showConnection(){epoch++;room='';state=null;$('new-confirm').hidden=true;connected=false;expanded=false;layout();$('classroom').hidden=true;$('connection').hidden=false;$('dev-connect').hidden=!api.config.dev;$('connect').hidden=!!api.config.dev;controls();}
 function cachedQR(){
  try{
   const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');
   if(!api.stored()||!cached||!/^[A-F0-9]{12}$/.test(cached.room)||!/^data:image\/png;base64,[A-Za-z0-9+/=]{1,50000}$/.test(cached.image))return;
   const url=new URL('student.html',location.href);url.search='';url.searchParams.set('room',cached.room);
   anchor=cached.room;$('student-link').href=url.href;$('cached-qr').src=cached.image;$('cached-qr').hidden=false;$('qr').hidden=true;
   $('classroom').hidden=false;$('timer').textContent='正在连接…';
  }catch{}
 }
 function connect(){if(coordinator)return enter();parent.postMessage({type:'qo-classroom-connect'},parentOrigin);}
 function handleError(error){
  if(error.code==='AUTH'){showConnection();message('请在课前连接课堂。');if(coordinator)parent.postMessage({type:'qo-classroom-connection-required'},parentOrigin);}
  else{message(error.message);$('retry').hidden=false;}
 }
 async function showQR(code){
  if(code===anchor)return;
  const url=new URL('student.html',location.href);url.search='';url.searchParams.set('room',code);
  await QOQRCode.toCanvas($('qr'),url.href,{width:160,margin:2,errorCorrectionLevel:'M'});
  anchor=code;$('student-link').href=url.href;$('cached-qr').hidden=true;$('qr').hidden=false;
  try{localStorage.setItem(cacheKey,JSON.stringify({room:code,image:$('qr').toDataURL('image/png')}));}catch{}
 }
 async function fetchState(){
  const version=epoch,requested=room,next=await api.call('teacher.state',{questionId},requested);
  if(version!==epoch||requested!==room)return;
  await showQR(next.anchor||requested);
  if(version===epoch&&requested===room)draw(next);
 }
 let autoAnalyzed='';
 async function analyzeClosedSelfCheck(){
  const r=state?.round;
  if(!r||r.feedbackMode!=='self-check'||r.status!=='closed'||!r.total||state.analysis?.status!=='idle'||autoAnalyzed===r.id)return;
  autoAnalyzed=r.id;
  try{await api.call('teacher.analyze',{questionId,roundId:r.id},room);}catch{}
 }
 function drawComparison(){
  if(!comparison)return;const mode=chartMode||(comparison.rounds.length>2?'profile':'bars');
  $('chart-modes').hidden=comparison.rounds.length<3;$('mode-bars').setAttribute('aria-pressed',String(mode==='bars'));$('mode-profile').setAttribute('aria-pressed',String(mode==='profile'));
  QOComparison.drawCompact($('bars'),comparison,{mode});QOComparison.summary($('ai-brief'),comparison.analysis);
 }
 for(const mode of ['bars','profile'])$('mode-'+mode).addEventListener('click',()=>{chartMode=mode;drawComparison();parent.postMessage({type:'qo-classroom-return-focus'},parentOrigin);});
 async function analyze(){
  if(analysisBusy||!comparison||comparison.analysis?.status==='ready'&&state?.analysis?.status==='ready')return;
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
   if(state?.archivedAt&&active&&!params.has('room')){await connect();return;}
   void analyzeClosedSelfCheck();
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
   if(coordinator){
    const pinned=desiredRoom&&await api.call('teacher.state',{questionId},desiredRoom);
    if(!pinned||pinned.archivedAt){
     const entry=await api.call('teacher.classroom',{lectureId,preferred:localStorage.getItem(roomKey)});
     room=entry.code;localStorage.setItem(roomKey,entry.anchor);
    }else if(pinned.activeClass||pinned.standalone){room=pinned.code;}
    else{
     const entry=await api.call('teacher.classroom',{lectureId,preferred:pinned.code});
     room=entry.code;localStorage.setItem(roomKey,entry.anchor);
    }
   }else room=desiredRoom;
   if(!room)return;
   await fetchState();connected=true;$('connection').hidden=true;$('retry').hidden=true;message('');
   if(coordinator)parent.postMessage({type:'qo-classroom-connected',room},parentOrigin);
   if(active)void analyzeClosedSelfCheck();
  }catch(error){handleError(error);}finally{connecting=false;controls();}
 }
 feedbackMode.addEventListener('change',controls);
 $('connect').addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;const password=new FormData(event.target).get('password');event.target.reset();try{api.save(await api.call('teacher.login',{password}));await connect();}catch(error){handleError(error);}finally{button.disabled=false;}});
 $('dev-connect').addEventListener('click',async()=>{try{api.save(await api.call('dev.teacherLogin'));await connect();}catch(error){handleError(error);}});
 $('start').addEventListener('click',async()=>{
  if($('start').disabled)return;busy=true;epoch++;expanded=false;comparison=null;analysisBusy=false;layout();controls();message('');
  try{await api.call('teacher.open',{questionId,roundId:state?.round?.id||null,feedbackMode:feedbackMode.value},room);await fetchState();parent.postMessage({type:'qo-classroom-started'},parentOrigin);}
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
 for(const [id,kind] of [['new-class','class'],['new-trial','trial']])$(id).addEventListener('click',()=>{
  switchKind=kind;
  $('confirm-note').textContent=(kind==='trial'?'进入独立试答场次。':'进入空白的正式课堂。')+'本场记录保留，二维码不变。';
  $('new-confirm').hidden=false;$('confirm-class').focus({preventScroll:true});
 });
 $('cancel-class').addEventListener('click',()=>{
  $('new-confirm').hidden=true;$(switchKind==='trial'?'new-trial':'new-class').focus({preventScroll:true});
 });
 $('confirm-class').addEventListener('click',async()=>{
  if(busy||!state?.activeClass)return;
  busy=true;epoch++;controls();
  try{
   const next=await api.call('teacher.newClass',{lectureId,kind:switchKind},room);
   desiredRoom=next.code;$('new-confirm').hidden=true;
   if(coordinator)await enter();else{await enter();await connect();}
   parent.postMessage({type:'qo-classroom-started'},parentOrigin);
  }catch(error){
   $('new-confirm').hidden=true;
   if(error.code==='ROOM_CHANGED')await connect();else handleError(error);
  }finally{busy=false;controls();}
 });
 $('retry').addEventListener('click',()=>room&&connected?refresh():connect());
 window.addEventListener('message',event=>{
  if(event.source!==parent)return;let trusted=event.origin===location.origin||event.origin==='null';try{trusted||=/^(localhost|127\.0\.0\.1)$/.test(new URL(event.origin).hostname);}catch{}if(!trusted)return;
  parentOrigin=event.origin==='null'?'*':event.origin;
  if(event.data?.type==='qo-classroom-connect'&&coordinator)enter();
  if(event.data?.type==='qo-classroom-connection-required'&&!coordinator)showConnection();
  if(event.data?.type==='qo-classroom-room'&&!coordinator&&/^[A-F0-9]{12}$/.test(event.data.room)&&(desiredRoom!==event.data.room||!connected)){if(desiredRoom!==event.data.room){epoch++;connected=false;$('new-confirm').hidden=true;}desiredRoom=event.data.room;enter();}
  if(event.data?.type==='qo-classroom-results-dismissed'){expanded=false;layout();}
  if(event.data?.type==='qo-classroom-visibility'){active=event.data.active===true;if(active)refresh();}
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});setInterval(refresh,3000);setInterval(controls,250);cachedQR();if(coordinator)await enter();else if(!api.stored())showConnection();
})();
