/* Classroom-sized composition. Formulas use the same conventions as the full labs;
   check_lecture03_focus.cjs cross-checks them against those independent renderers. */
(() => {
  'use strict';
  const D=ControlBloch,$=id=>document.getElementById(id),pi=Math.PI;
  const mode=new URLSearchParams(location.search).get('mode')||'rabi';
  const detuned=['detuning','tilted','repair'].includes(mode);
  const spherical=['phase','target','tilted','equator'].includes(mode);
  const defaults={time:mode==='rabi'||mode==='phase'||mode==='target'?50:mode==='tilted'?100/Math.sqrt(2):100,strength:5,ratio:1,phase:0};
  let state={...defaults},raf=0,last=0;
  const math=(tex)=>'<span data-math="'+tex+'"></span>';
  const row=(id,label,min,max,step)=>'<div class="control-row"><label for="'+id+'">'+label+'</label><input id="'+id+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'"><output id="'+id+'-value"></output></div>';
  const btn=(key,v,text)=>'<button data-set="'+key+'" data-value="'+v+'">'+text+'</button>';
  const nice=q=>{for(const [x,t] of [[0,'0'],[.5,'\\pi/2'],[1,'\\pi'],[1.5,'3\\pi/2'],[2,'2\\pi']])if(Math.abs(q-x)<1e-8)return t;return q.toFixed(2)+'\\pi';};
  const percent=p=>(100*Math.max(0,Math.min(1,p))).toFixed(1)+'%';
  function equatorStateTex(degrees){
    const d=((degrees%360)+360)%360;
    let coefficient={0:'+',90:'+i',180:'-',270:'-i'}[d];
    if(coefficient===undefined){
      const gcd=(a,b)=>b?gcd(b,a%b):a,g=gcd(d,180),n=d/g,q=180/g;
      const angle=q===1?(n===1?'\\pi':n+'\\pi'):'\\frac{'+(n===1?'\\pi':n+'\\pi')+'}{'+q+'}';
      coefficient='+e^{i'+angle+'}';
    }
    return '|\\psi\\rangle=\\frac{|0\\rangle'+coefficient+'|1\\rangle}{\\sqrt2}';
  }
  function values(s,t=s.time){
    const omega=2*pi*s.strength/1000,delta=detuned?s.ratio:0,f=Math.hypot(1,delta),g=omega*f*t;
    if(mode==='equator')return{vector:[Math.cos(s.phase*pi/180),Math.sin(s.phase*pi/180),0],p1:.5,p0:.5,axis:null,gamma:0,firstPeak:100,maximum:1};
    if(detuned){const p1=Math.sin(g/2)**2/(f*f);return{vector:[delta*(1-Math.cos(g))/(f*f),-Math.sin(g)/f,(delta*delta+Math.cos(g))/(f*f)],p1,p0:1-p1,axis:[1/f,0,delta/f],gamma:g,firstPeak:pi/(omega*f),maximum:1/(f*f)};}
    const d=s.phase*pi/180,p1=Math.sin(g/2)**2;
    return{vector:[-Math.sin(d)*Math.sin(g),-Math.cos(d)*Math.sin(g),Math.cos(g)],p1,p0:1-p1,axis:[Math.cos(d),-Math.sin(d),0],gamma:g,firstPeak:pi/omega,maximum:1};
  }
  function controls(){
    let html='';
    if(mode==='equator'){
      html=row('phase','方位角 '+math('\\varphi'),0,360,1)+'<div class="presets">'+[[0,'0'],[90,'\\pi/2'],[180,'\\pi'],[270,'3\\pi/2']].map(([v,t])=>btn('phase',v,math(t))).join('')+'</div>';
    }else if(mode==='phase'||mode==='target'){
      html=row('phase','驱动相位 '+math('\\phi_{\\mathrm d}'),0,360,1)+row('time','脉冲时长',0,200,1);$('controls').classList.add('two-controls');
    }else if(mode==='strength'){
      html=row('strength',math('\\Omega/(2\\pi)'),2.5,10,.5)+row('time','脉冲时长',0,250,1);$('controls').classList.add('two-controls');
    }else if(mode==='detuning'){
      html=row('ratio','失谐 '+math('\\Delta/\\Omega'),-2,2,.01)+'<div class="presets">'+[-1,0,1,2].map(v=>btn('ratio',v,v===0?'0 · 共振':String(v))).join('')+'</div>';
    }else if(mode==='tilted'||mode==='repair'){
      html=row('ratio','失谐 '+math('\\Delta/\\Omega'),-2,2,.01)+row('time','作用时间',0,250,.001);$('controls').classList.add('two-controls');
    }else{
      html=row('time','脉冲时长 '+math('\\tau'),0,250,1)+'<div class="presets">'+btn('time',50,'50 ns · 各半')+btn('time',100,'100 ns · 翻转')+btn('time',200,'200 ns · 返回')+'</div>';
    }
    $('controls').innerHTML=html;
    if(['strength','tilted','repair'].includes(mode)){
      const b=document.createElement('button');b.id='peak';b.textContent='首峰';b.addEventListener('click',()=>setState({...state,time:values(state).firstPeak}));$('time').parentElement.append(b);
      if(mode==='repair'||mode==='tilted'){
        const z=document.createElement('button');z.textContent='共振';z.id='resonance';z.addEventListener('click',()=>setState({...state,ratio:0}));$('ratio').parentElement.append(z);
      }
    }
    if(mode==='phase'||mode==='target'){
      const b=document.createElement('button');b.id='phase-step';D.math(b,'+\\pi/2');b.setAttribute('aria-label','驱动相位增加二分之π');b.addEventListener('click',()=>setState({...state,phase:(state.phase+90)%360}));$('phase').parentElement.append(b);
    }
    if(['rabi','phase','target','tilted','repair'].includes(mode)){
      const b=document.createElement('button');b.id='play';b.textContent='播放';
      b.setAttribute('aria-label','播放或暂停脉冲时长扫描');
      b.title='自动改变脉冲时长；每个时长对应重新制备初态后的实验';
      b.addEventListener('click',()=>{if(raf){stop();return;}if(state.time>=+$('time').max)state.time=0;last=0;b.textContent='暂停';raf=requestAnimationFrame(tick);});$('time').parentElement.append(b);
    }
    const reset=document.createElement('button');reset.id='reset';reset.textContent='重置';
    reset.addEventListener('click',()=>setState(defaults));$('controls').querySelector('.control-row').append(reset);
    for(const id of ['time','strength','ratio','phase'])if($(id))$(id).addEventListener('input',()=>setState({...state,[id]:+$(id).value}));
    document.querySelectorAll('[data-set]').forEach(b=>b.addEventListener('click',()=>setState({...state,[b.dataset.set]:+b.dataset.value})));
    document.querySelectorAll('[data-math]').forEach(n=>D.math(n,n.dataset.math));
  }
  function text(svg,x,y,content,attrs={}){return D.el(svg,'text',{x,y,...attrs},content);}
  function plot(v){
    const svg=$('plot');svg.replaceChildren();svg.setAttribute('viewBox','0 0 780 375');
    const left=66,right=750,top=53,base=314,x=t=>left+(right-left)*t/250,y=p=>base-(base-top)*p;
    text(svg,left,25,'测得1的概率');
    for(const p of [0,.5,1]){D.line(svg,[left,y(p)],[right,y(p)]);text(svg,left-15,y(p)+8,String(p),{'text-anchor':'end'});}
    D.line(svg,[left,top],[left,base],D.gray);D.line(svg,[left,base],[right,base],D.gray);
    for(const t of [0,50,100,150,200,250])text(svg,x(t),base+30,String(t),{'text-anchor':'middle'});
    text(svg,right,base+59,'脉冲时长（ns）',{'text-anchor':'end'});
    const points=s=>Array.from({length:501},(_,k)=>[x(k/2),y(values(s,k/2).p1)]);
    if(detuned||mode==='strength'){
      const ref={...state,ratio:0,strength:5};D.path(svg,points(ref),D.gray,3,'8 7');
      D.line(svg,[405,19],[440,19],D.gray,3,'8 7');text(svg,450,27,detuned?'共振参照':'5 MHz 参照');
    }
    D.path(svg,points(state),D.blue,4.5);
    D.line(svg,[x(state.time),top],[x(state.time),base],D.blue,2,'5 5');
    D.el(svg,'circle',{cx:x(state.time),cy:y(v.p1),r:9,fill:D.blue,stroke:'white','stroke-width':2.5});
    if(mode==='strength'||detuned){
      const xp=x(v.firstPeak),yp=y(v.maximum);D.el(svg,'circle',{cx:xp,cy:yp,r:8,fill:'white',stroke:D.blue,'stroke-width':3});
      if(detuned)D.line(svg,[left,yp],[right,yp],D.gray,1.8,'4 6');
    }
    const labelX=Math.max(left+30,Math.min(right-70,x(state.time)+17));
    text(svg,labelX,Math.max(top+28,y(v.p1)-17),percent(v.p1),{style:'font-size:28px;fill:#0070c0;font-weight:600'});
  }
  function sphere(v){
    const svg=$('sphere'),trace=mode==='equator'?[]:Array.from({length:201},(_,j)=>values(state,state.time*j/200).vector);
    D.drawSphere(svg,{vector:v.vector,trace,suffix:mode==='equator'?'':detuned?'_{\\mathrm R}':'_{\\mathrm I}'});
    // State-vector emphasis is shared with every other Bloch illustration.
    const shaft=svg.querySelector('.bloch-state-vector');
    if(mode==='tilted'){
      const full=D.path(svg,Array.from({length:361},(_,j)=>D.project(values(state,2*v.firstPeak*j/360).vector)),'#9fc5e2',3);
      full.id='reachable-orbit';svg.insertBefore(full,svg.querySelector('path[stroke="'+D.blue+'"]')||shaft);
    }
    const a=D.project([0,0,0]);
    if(v.axis){
      const n=v.axis,tip=D.project(n.map(x=>1.12*x));D.line(svg,D.project(n.map(x=>-1.1*x)),a,D.gray,3,'6 5');D.arrow(svg,a,tip,D.gray,4);
    }
    if(mode==='target'){const p=D.project([1,0,0]);D.el(svg,'circle',{cx:p[0],cy:p[1],r:15,fill:'none',stroke:D.gray,'stroke-width':3});}
    if(mode==='equator'){
      const phi=state.phase*pi/180;D.path(svg,Array.from({length:121},(_,k)=>D.project([.43*Math.cos(phi*k/120),.43*Math.sin(phi*k/120),0])),D.gray,3);
      const p=D.project([.65*Math.cos(phi/2),.65*Math.sin(phi/2),0]);if(phi>0)D.label(svg,p[0],p[1]+15,'\\varphi',55,30);
    }
    svg.querySelectorAll('foreignObject').forEach(f=>{f.setAttribute('height','70');f.firstElementChild.style.fontSize='34px';});
    if(mode==='equator'){
      $('sphere-readout').innerHTML='<span class="term">当前量子态</span><div class="equation">'+math('\\displaystyle '+equatorStateTex(state.phase))+'</div>';
      $('sphere-readout').querySelectorAll('[data-math]').forEach(n=>D.math(n,n.dataset.math));
      return;
    }
    const rel=Math.hypot(v.vector[0],v.vector[1])<1e-8?null:(Math.atan2(v.vector[1],v.vector[0])+2*pi)%(2*pi);
    let top=detuned?'<div class="term">绕倾斜轴转动</div>'+math('\\mathbf n_{\\mathrm R}\\parallel(\\Omega,0,\\Delta)'):'<div class="term">旋转角</div>'+math('\\gamma=\\Omega\\tau='+nice(v.gamma/pi));
    if(!detuned)top+='<div class="term" style="margin-top:20px">末态相对相位</div>'+(rel===null?'—':math('\\varphi_{\\mathrm I}='+nice(rel/pi)));
    $('sphere-readout').innerHTML='<div class="equation">'+top+'</div><div><div class="term">测得1的概率</div><div class="value">'+percent(v.p1)+'</div><div class="mini-track"><i style="width:'+100*v.p1+'%"></i></div></div>';
    $('sphere-readout').querySelectorAll('[data-math]').forEach(n=>D.math(n,n.dataset.math));
  }
  function render(){
    const v=values(state);
    if(spherical)sphere(v);else plot(v);
    $('context').innerHTML=mode==='equator'?'赤道 · '+math('\\theta=\\pi/2'):detuned?'初态 '+math('|0\\rangle')+' · '+math('\\Omega/(2\\pi)=5\\,\\mathrm{MHz}'):spherical?'相互作用绘景 · 初态 '+math('|0\\rangle'):'共振 · 初态 '+math('|0\\rangle');
    if(mode==='phase'||mode==='target')$('context').innerHTML='共振 · I坐标 · 初态 '+math('|0\\rangle')+' · '+math('\\Omega/(2\\pi)=5\\,\\mathrm{MHz}');
    if(mode==='rabi')$('context').innerHTML='理想模型 · '+$('context').innerHTML+' · '+math('\\Omega/(2\\pi)=5\\,\\mathrm{MHz}');
    $('context').querySelectorAll('[data-math]').forEach(n=>D.math(n,n.dataset.math));
    for(const key of ['time','phase','ratio','strength'])if($(key)){
      $(key).value=state[key];const out=$(key+'-value');
      if(key==='phase')D.math(out,nice(state.phase/180));
      else out.textContent=key==='time'?state.time.toFixed(Number.isInteger(state.time)?0:1)+' ns':key==='strength'?state.strength+' MHz':state.ratio.toFixed(2);
    }
    document.querySelectorAll('[data-set]').forEach(b=>b.setAttribute('aria-pressed',String(state[b.dataset.set]===+b.dataset.value)));
    let status='';
    if(mode==='rabi')status=v.p1<1e-8?(state.time===0?'初态：测得0':'回到初态：测得0'):v.p1>1-1e-8?'完成翻转：测得1':Math.abs(v.p1-.5)<1e-8?'两种结果各半':'概率随驱动时长往复变化';
    if(mode==='target')status=v.vector[0]>1-1e-8?'已到达目标态':'末态尚未到达目标';
    if(mode==='repair')status=v.p1>1-1e-8?'已完成翻转':Math.abs(state.ratio)<1e-8?'已共振：再点“首峰”':Math.abs(v.p1-v.maximum)<1e-8?'峰值不足1：需校准频率':'先点击“首峰”';
    const data={mode,...state,...v,probability:percent(v.p1),maximum:percent(v.maximum),maximumValue:v.maximum,firstPeak:v.firstPeak.toFixed(1)+' ns',firstPeakNs:v.firstPeak,status,angle:nice(v.gamma/pi).replaceAll('\\pi','π')};
    window.focusLabState=data;parent.postMessage({type:'lecture03-focus',data},'*');
  }
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;last=0;if($('play'))$('play').textContent='播放';}
  function tick(now){if(!last)last=now;state.time=Math.min(+$('time').max,state.time+(now-last)/40);last=now;render();if(state.time>=+$('time').max)stop();else raf=requestAnimationFrame(tick);}
  function setState(s){stop();state={...s};render();}
  function fit(){const el=$('focus-canvas'),s=Math.min(innerWidth/780,innerHeight/525);el.style.transform='scale('+s+')';el.style.left=(innerWidth-780*s)/2+'px';el.style.top=(innerHeight-525*s)/2+'px';}
  $('focus-canvas').classList.add(mode);if(spherical)$('focus-canvas').classList.add('sphere-mode');
  controls();render();fit();
  addEventListener('resize',fit);document.addEventListener('fullscreenchange',fit);
  addEventListener('message',event=>{if(event.source!==parent||event.data?.type!=='lecture03')return;if(event.data.action==='reset')setState(defaults);if(event.data.action==='sync')render();if(event.data.action==='pause')stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});addEventListener('pagehide',stop);
  document.addEventListener('keydown',event=>{if(['INPUT','BUTTON'].includes(event.target.tagName))return;if(['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','PageDown','PageUp',' '].includes(event.key)){event.preventDefault();parent.postMessage({type:'lecture03-navigation',key:event.key},'*');}});
  installFigurePrint({getState:()=>({...state}),setState,defaults,fit});
  document.fonts.ready.then(()=>{fit();window.figureReady=true;window.classroomReady=true;render();});
})();
