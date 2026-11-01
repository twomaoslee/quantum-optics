(async function(){
 'use strict';
 const api=QOApi,$=id=>document.getElementById(id),params=new URLSearchParams(location.search);
 const roomKey='qo-last-room-v1:'+(api.config.envId||'local');
 let room='',state=null,busy=false,polling=false,connecting=false,active=window===parent,epoch=0,parentOrigin='*';
 const sameDay=(time)=>new Date(time).toLocaleDateString()===new Date().toLocaleDateString();
 function message(text){$('message').textContent=text||'';}
 function controls(){
  const r=state?.round,remaining=r?Math.max(0,Math.ceil((r.deadline-api.now())/1000)):0;
  const open=r?.status==='open'&&remaining>0;
  $('start').disabled=busy||!room||open;$('show').disabled=busy||!r||r.revealed;
  $('start').textContent=open?'作答中':r?'再答 · 60秒':'开始 · 60秒';
  $('show').textContent=r?.revealed?'已展示':open?'收题展示':'展示回答';
  $('timer').textContent=!r?'等待发题':open?String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0'):r.revealed?'本轮已结束':'时间到';
  $('participation').textContent=r?'已作答 '+r.total+' 人':'首次登记姓名学号';
 }
 function draw(next){
  state=next;const r=next.round;
  $('join').hidden=!!r?.revealed;$('results').hidden=!r?.revealed;$('timer').hidden=!!r?.revealed;$('participation').hidden=!!r?.revealed;
  $('bars').replaceChildren();
  if(r?.revealed)for(const [letter] of next.question.options){
   const row=document.createElement('div'),label=document.createElement('div'),key=document.createElement('strong'),count=document.createElement('span'),track=document.createElement('div'),fill=document.createElement('div');
   row.className='bar';label.className='bar-label';key.textContent=letter;
   const percent=r.total?Math.round(100*r.counts[letter]/r.total):0;
   count.textContent=r.counts[letter]+'人 '+percent+'%';track.className='bar-track';fill.className='bar-fill';fill.style.width=percent+'%';
   label.append(key,count);track.append(fill);row.append(label,track);$('bars').append(row);
  }
  controls();
 }
 function showConnection(){
  room='';state=null;$('classroom').hidden=true;$('connection').hidden=false;
  $('dev-connect').hidden=!api.config.dev;$('connect').hidden=!!api.config.dev;
 }
 function handleError(error){
  if(error.code==='AUTH'){showConnection();message('请在课前连接课堂。');}
  else{$('join').hidden=true;$('results').hidden=true;message(error.message);$('retry').hidden=false;}
 }
 async function fetchState(){
  const version=epoch,requested=room;const next=await api.call('teacher.state',{},requested);
  if(version===epoch&&requested===room)draw(next);
 }
 async function refresh(){
  if(!room||busy||polling||document.hidden||!active)return;polling=true;
  try{await fetchState();message('');$('retry').hidden=true;}catch(error){handleError(error);}finally{polling=false;}
 }
 async function enter(){
  if(connecting)return;connecting=true;
  try{
   if(!api.stored()){showConnection();return;}
   const me=await api.call('me');if(me.role!=='teacher'){showConnection();return;}
   const {rooms}=await api.call('teacher.rooms'),explicit=params.get('room');
   const today=rooms.filter(r=>r.title==='第七讲课堂'&&sameDay(r.createdAt));
   const saved=localStorage.getItem(roomKey);
   room=(explicit&&rooms.find(r=>r.code===explicit)?.code)||today.find(r=>r.code===saved)?.code||today[0]?.code||'';
   if(!room)room=(await api.call('teacher.create',{title:'第七讲课堂'})).code;
   localStorage.setItem(roomKey,room);
   const url=new URL('student.html',location.href);url.search='';url.searchParams.set('room',room);$('student-link').href=url.href;
   await QOQRCode.toCanvas($('qr'),url.href,{width:160,margin:2,errorCorrectionLevel:'M'});
   await fetchState();$('connection').hidden=true;$('classroom').hidden=false;$('retry').hidden=true;message('');
  }catch(error){handleError(error);}finally{connecting=false;controls();}
 }
 $('connect').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.submitter;button.disabled=true;
  const password=new FormData(event.target).get('password');event.target.reset();
  try{api.save(await api.call('teacher.login',{password}));await enter();}catch(error){handleError(error);}finally{button.disabled=false;}
 });
 $('dev-connect').addEventListener('click',async()=>{
  try{api.save(await api.call('dev.teacherLogin'));await enter();}catch(error){handleError(error);}
 });
 for(const [id,action]of [['start','teacher.open'],['show','teacher.reveal']])$(id).addEventListener('click',async()=>{
  if(busy||!room)return;busy=true;epoch++;controls();message('');
  try{await api.call(action,{seconds:60,roundId:state?.round?.id},room);await fetchState();
   parent.postMessage({type:action==='teacher.open'?'qo-classroom-started':'qo-classroom-return-focus'},parentOrigin);
  }
  catch(error){handleError(error);}finally{busy=false;controls();}
 });
 $('retry').addEventListener('click',()=>room?refresh():enter());
 window.addEventListener('message',event=>{
  if(event.source!==parent||event.data?.type!=='qo-classroom-visibility')return;
  let trusted=event.origin===location.origin||event.origin==='null';
  try{trusted ||= /^(localhost|127\.0\.0\.1)$/.test(new URL(event.origin).hostname);}catch{}
  if(!trusted)return;parentOrigin=event.origin==='null'?'*':event.origin;active=event.data.active===true;if(active)refresh();
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 setInterval(refresh,3000);setInterval(controls,250);await enter();
})();
