(async function(){
 'use strict';const api=QOApi,$=id=>document.getElementById(id);
 const roomKey='qo-last-room-v1:'+(api.config.envId||'local');
 const params=new URLSearchParams(location.search);if(params.get('embedded')==='1')document.body.classList.add('embedded');
 let room=params.get('room')||localStorage.getItem(roomKey)||'',state=null,busy=false,polling=false,showAnalysis=false,active=true,reasonLoading=false,detailLoading=false;
 window.addEventListener('message',event=>{if(event.source===parent&&event.origin===location.origin&&event.data?.type==='qo-classroom-visibility'){active=event.data.active===true;if(active)refresh();}});
 function message(text){$('message').textContent=text||'';}
 if(api.config.dev){$('environment').hidden=false;$('environment').textContent='本机联调 · 共用正式后端业务代码，尚未连接腾讯云。仅使用虚拟学生数据。';$('dev-login').hidden=false;}
 else if(!api.config.envId){$('environment').hidden=false;$('environment').textContent='答题后台待开通。课件可以正常讲授；CloudBase 部署后即可创建课堂。';$('login-form').hidden=true;}
 function controls(){
  const r=state?.round,open=r?.status==='open'&&api.now()<r.deadline;
  $('open').textContent='发题 · '+(state?.defaultSeconds||60)+'秒';
  $('open').disabled=busy||open||!!state?.answersReleasedAt;$('extend').disabled=busy||!open;$('close').disabled=busy||!open;
  $('reveal').disabled=busy||!r||r.revealed;$('analysis').disabled=busy||!r?.revealed;
  $('status').textContent=!r?'学生进入后等待发题。':open?'剩余 '+Math.max(0,Math.ceil((r.deadline-api.now())/1000))+' 秒 · 已提交 '+r.total+' 人':'作答已结束 · 共 '+r.total+' 人提交';
  const released=!!state?.answersReleasedAt;
  $('answers-release').disabled=busy||(!released&&(!r||open));$('release-confirm-yes').disabled=busy||!r||open;
  $('answers-release').textContent=released?'收回答案与解析':'开放答案与解析';
  $('answers-release-status').textContent=released?'已开放。本课堂学生可在“我的答题”查看对错、正确答案和解析。':open?'仍有题目正在作答，结束作答后可开放。':'尚未开放。课件点击“展示结果”会同步开放该题的对错和解析；这里可统一开放其余已发题。';
  $('round-label').textContent=r?'第 '+r.number+' 轮'+(r.revealed?' · 统计已公布':' · 统计未公布'):'尚未发题';
  if($('refresh-reasons'))$('refresh-reasons').disabled=!r||reasonLoading;
  if($('refresh-analysis'))$('refresh-analysis').disabled=!r?.revealed||detailLoading;
 }
 function draw(next){
  if(state?.round?.id!==next.round?.id){showAnalysis=false;$('release-confirm').hidden=true;if($('reason-report')){$('reason-report').open=false;$('reason-summary').replaceChildren();}if($('analysis-report')){$('analysis-report').open=false;$('analysis-detail').replaceChildren();$('comparison-charts').replaceChildren();}}
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
 async function reasonStats(){
  if(reasonLoading||!state?.round)return;
  const requested=room,id=state.round.id,questionId=state.question.id;reasonLoading=true;controls();
  try{
   const data=await api.call('teacher.reasonStats',{questionId,roundId:id},requested);
   if(room!==requested||state?.round?.id!==id)return;
   const container=$('reason-summary');container.replaceChildren();
   const intro=document.createElement('p');intro.className='fine';intro.textContent='本轮 '+data.total+' 人已答。原因是学生自述；未填写单列，不计为答错。';container.append(intro);
   for(const choice of data.choices){
    const heading=document.createElement('h3');heading.textContent=choice.choice+' · '+choice.total+' 人选择，'+choice.submitted+' 人填写原因，'+choice.missing+' 人未填写';container.append(heading);
    if(!choice.total)continue;
    const list=document.createElement('ul');
    for(const reason of choice.reasons){const li=document.createElement('li');li.textContent=reason.count+' 人 · '+reason.text;list.append(li);}container.append(list);
    for(const comment of choice.comments||[]){const p=document.createElement('p');p.className='fine';p.textContent='学生补充：'+comment;container.append(p);}
   }
  }catch(error){if(room===requested&&state?.round?.id===id)message(error.message);}
  finally{reasonLoading=false;controls();}
 }
 async function analysisDetails(generate=false){
  if(detailLoading||!state?.round?.revealed)return;
  const requested=room,id=state.round.id,questionId=state.question.id;detailLoading=true;controls();
  try{
   if(generate)await api.call('teacher.analyze',{questionId,roundId:id},requested);
   const data=await api.call('teacher.analysisDetails',{questionId,roundId:id},requested);
   if(room!==requested||state?.round?.id!==id)return;
   QOComparison.draw($('comparison-charts'),data);QOComparison.summary($('teacher-ai-brief'),data.analysis);
   const container=$('analysis-detail');container.replaceChildren();
   for(const pair of data.transitions){const p=document.createElement('p');p.className='fine';p.textContent='第 '+pair.from+' → '+pair.to+' 轮：两轮均提交 '+pair.paired+' 人，改选 '+pair.changed+' 人；错转对 '+pair.wrongToCorrect+' 人，对转错 '+pair.correctToWrong+' 人。';container.append(p);}
   if(data.details){
    for(const observation of data.details.observations){const p=document.createElement('p');p.className='analysis-observation';p.textContent=observation.text;const evidence=document.createElement('small');evidence.textContent='依据轮次：'+observation.evidence.map(r=>r.replace('round-','第 ')+' 轮').join('、');p.append(evidence);container.append(p);}
    for(const [title,text]of [['建议下一步',data.details.nextStep],['分析边界',data.details.limitations]]){const h=document.createElement('h3'),p=document.createElement('p');h.textContent=title;p.className='analysis-observation';p.textContent=text;container.append(h,p);}
   }
   for(const r of data.reasonRounds){
    const h=document.createElement('h3');h.textContent='第 '+r.ordinal+' 轮原因 · '+r.submitted+'/'+r.total+' 人填写';container.append(h);
    for(const c of r.choices)for(const reason of c.reasons){const p=document.createElement('p');p.className='fine';p.textContent=c.choice+' · '+reason.count+' 人 · '+reason.text;container.append(p);}
    for(const c of r.choices)for(const comment of c.comments){const p=document.createElement('p');p.className='fine';p.textContent=c.choice+' · 学生补充（'+comment.count+'份）：'+comment.text;container.append(p);}
   }
  }catch(error){message(error.message);}finally{detailLoading=false;controls();}
 }
 async function selectRoom(code){
  $('release-confirm').hidden=true;if($('reason-report')){$('reason-report').open=false;$('reason-summary').replaceChildren();}$('download-status').textContent='';room=code;state=null;showAnalysis=false;$('classroom').hidden=!room;localStorage.setItem(roomKey,room);$('rooms').value=room;
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
   try{await api.call(action,{roundId:state?.round?.id},room);}
   catch(e){message(e.message);}finally{busy=false;await refresh(false);controls();}
  });
 }
 async function releaseAnswers(released){
  if(busy||!room)return;const requested=room;busy=true;controls();message('');
  try{await api.call('teacher.releaseAnswers',{released},requested);$('release-confirm').hidden=true;if(room===requested)message(released?'已开放本课堂的答案与解析。':'已收回课后统一开放；课堂已展示的题目仍可查看解析。');}
  catch(error){message(error.message);}finally{busy=false;await refresh(false);controls();}
 }
 $('answers-release').addEventListener('click',()=>{if(state?.answersReleasedAt)releaseAnswers(false);else $('release-confirm').hidden=false;});
 $('release-confirm-yes').addEventListener('click',()=>releaseAnswers(true));
 $('release-cancel').addEventListener('click',()=>{$('release-confirm').hidden=true;});
 $('analysis').addEventListener('click',()=>{showAnalysis=!showAnalysis;draw(state);});
 if($('reason-report')){
  $('reason-report').addEventListener('toggle',()=>{if($('reason-report').open)reasonStats();});
  $('refresh-reasons').addEventListener('click',reasonStats);
 }
 if($('analysis-report')){
  $('analysis-report').addEventListener('toggle',()=>{if($('analysis-report').open)analysisDetails();});
  $('refresh-analysis').addEventListener('click',()=>analysisDetails(true));
 }
 $('copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(studentURL());$('copy-link').textContent='已复制';setTimeout(()=>$('copy-link').textContent='复制学生链接',1500);}catch{message('请从“打开学生页”链接复制地址。');}});
 $('export').addEventListener('click',async()=>{
  $('export').disabled=true;try{
   const result=await api.call('teacher.export',{},room);
   const blob=new Blob([QOExportCSV.create(result)],{type:'text/csv;charset=utf-8'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(state?.title||'量子光学课堂')+'-'+room+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   $('download-status').textContent='已导出本课堂全部轮次的作答明细，包含题目、正确答案、对错、解析与选择原因。每人每轮保留最后一次提交。';
  }catch(e){message(e.message);}finally{$('export').disabled=false;}
 });
 $('logout').addEventListener('click',async()=>{try{await api.call('logout');api.save(null);$('workspace').hidden=true;$('login').hidden=false;state=null;}catch(e){message(e.message);}});
 if(api.stored())try{await enter();}catch(e){message(e.message);}
 setInterval(refresh,3000);setInterval(controls,250);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
