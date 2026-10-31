(async function(){
 'use strict';const api=QOApi,$=id=>document.getElementById(id);
 const roomKey='qo-last-room-v1:'+(api.config.envId||'local');
 const params=new URLSearchParams(location.search);if(params.get('embedded')==='1')document.body.classList.add('embedded');
 let room=params.get('room')||localStorage.getItem(roomKey)||'',state=null,busy=false,polling=false,showAnalysis=false,active=true;
 window.addEventListener('message',event=>{if(event.source===parent&&event.origin===location.origin&&event.data?.type==='qo-classroom-visibility'){active=event.data.active===true;if(active)refresh();}});
 function message(text){$('message').textContent=text||'';}
 if(api.config.dev){$('environment').hidden=false;$('environment').textContent='本机联调 · 共用正式后端业务代码，尚未连接腾讯云。仅使用虚拟学生数据。';$('dev-login').hidden=false;}
 else if(!api.config.envId){$('environment').hidden=false;$('environment').textContent='答题后台待开通。课件可以正常讲授；CloudBase 部署后即可创建课堂。';$('login-form').hidden=true;}
 function controls(){
  const r=state?.round,open=r?.status==='open'&&api.now()<r.deadline;
  $('open').disabled=busy||open;$('extend').disabled=busy||!open;$('close').disabled=busy||!open;
  $('reveal').disabled=busy||!r||r.revealed;$('analysis').disabled=busy||!r?.revealed;
  $('status').textContent=!r?'学生进入后等待发题。':open?'剩余 '+Math.max(0,Math.ceil((r.deadline-api.now())/1000))+' 秒 · 已提交 '+r.total+' 人':'作答已结束 · 共 '+r.total+' 人提交';
  $('round-label').textContent=r?'第 '+r.number+' 轮'+(r.revealed?' · 统计已公布':' · 统计未公布'):'尚未发题';
 }
 function draw(next){
  if(state?.round?.id!==next.round?.id)showAnalysis=false;
  state=next;$('classroom').hidden=false;$('title').textContent=next.question.title;$('stem').textContent=next.question.stem;
  const r=next.round;$('stats').hidden=!r?.revealed;$('counts').replaceChildren();
  if(r?.revealed){for(const [letter,text] of next.question.options){
   const row=document.createElement('div'),key=document.createElement('strong'),track=document.createElement('div'),fill=document.createElement('div'),count=document.createElement('span');
   row.className='bar-row';key.textContent=letter+'　'+text;track.className='bar-track';fill.className='bar-fill';
   const percent=r.total?Math.round(100*r.counts[letter]/r.total):0;fill.style.width=percent+'%';track.append(fill);count.className='bar-count';count.textContent=r.counts[letter]+'人 '+percent+'%';row.append(key,track,count);$('counts').append(row);
  }}
  $('stats-note').textContent='按实际提交人数统计；修改答案不重复计数。';
  $('explanation').hidden=!showAnalysis;$('explanation').textContent=r?.correct?'答案 '+r.correct+'　'+r.explanation:'';
  $('analysis').textContent=showAnalysis?'隐藏解析':'显示解析';controls();
 }
 function studentURL(){const url=new URL('student.html',location.href);url.search='';url.searchParams.set('room',room);return url.href;}
 async function selectRoom(code){
  room=code;state=null;showAnalysis=false;$('classroom').hidden=!room;localStorage.setItem(roomKey,room);$('rooms').value=room;
  if(!room)return;const url=studentURL();$('student-link').href=url;
  if(api.config.dev)$('student-link').textContent='打开本机学生页';
  await QOQRCode.toCanvas($('qr'),url,{width:210,margin:2,errorCorrectionLevel:'M'});await refresh();
 }
 async function refresh(clearMessage=true){
  if(!room||busy||polling||document.hidden||!active||!api.stored())return;polling=true;
  const requestedRoom=room;
  try{const next=await api.call('teacher.state',{},requestedRoom);if(room===requestedRoom)draw(next);if(clearMessage)message('');}
  catch(error){message(error.message);if(error.code==='AUTH'){$('login').hidden=false;$('workspace').hidden=true;}}
  finally{polling=false;}
 }
 async function enter(){
  const me=await api.call('me');if(me.role!=='teacher')throw new Error('请使用教师身份登录。');
  $('login').hidden=true;$('workspace').hidden=false;
  const result=await api.call('teacher.rooms');$('rooms').replaceChildren(new Option('选择课堂',''));
  result.rooms.forEach(r=>$('rooms').add(new Option(r.title+' · '+new Date(r.createdAt).toLocaleDateString(),r.code)));
  if(!result.rooms.some(r=>r.code===room))room=result.rooms[0]?.code||'';await selectRoom(room);
 }
 async function signIn(action,data={}){try{api.save(await api.call(action,data));await enter();message('');}catch(e){message(e.message);}}
 $('login-form').addEventListener('submit',async e=>{e.preventDefault();e.submitter.disabled=true;await signIn('teacher.login',Object.fromEntries(new FormData(e.target)));e.target.reset();e.submitter.disabled=false;});
 $('dev-login').addEventListener('click',()=>signIn('dev.teacherLogin'));
 $('create').addEventListener('click',async()=>{
  $('create').disabled=true;try{const result=await api.call('teacher.create',{title:'第七讲课堂'});room=result.code;await enter();}catch(e){message(e.message);}finally{$('create').disabled=false;}
 });
 $('rooms').addEventListener('change',e=>selectRoom(e.target.value).catch(e=>message(e.message)));
 for(const [id,action] of [['open','teacher.open'],['extend','teacher.extend'],['close','teacher.close'],['reveal','teacher.reveal']]){
  $(id).addEventListener('click',async()=>{
   if(busy)return;busy=true;controls();message('');
   try{await api.call(action,{seconds:60,roundId:state?.round?.id},room);}
   catch(e){message(e.message);}finally{busy=false;await refresh(false);controls();}
  });
 }
 $('analysis').addEventListener('click',()=>{showAnalysis=!showAnalysis;draw(state);});
 $('copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(studentURL());$('copy-link').textContent='已复制';setTimeout(()=>$('copy-link').textContent='复制学生链接',1500);}catch{message('请从“打开学生页”链接复制地址。');}});
 $('export').addEventListener('click',async()=>{
  $('export').disabled=true;try{
   const result=await api.call('teacher.export',{},room),numbers=new Map(result.rounds.map(r=>[r.id,r.number]));
   const cell=value=>'"'+String(value??'').replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';
   const lines=[['姓名','学号','题目','轮次','答案','提交时间'],...result.rows.map(r=>[r.name,r.studentNumber,r.questionId,numbers.get(r.roundId),r.choice,new Date(r.submittedAt).toISOString()])];
   const blob=new Blob(['\uFEFF'+lines.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='第七讲课堂-'+room+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   $('download-status').textContent='已导出本课堂全部轮次的具名记录。';
  }catch(e){message(e.message);}finally{$('export').disabled=false;}
 });
 $('logout').addEventListener('click',async()=>{try{await api.call('logout');api.save(null);$('workspace').hidden=true;$('login').hidden=false;state=null;}catch(e){message(e.message);}});
 if(api.stored())try{await enter();}catch(e){message(e.message);}
 setInterval(refresh,3000);setInterval(controls,250);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
