(() => {
  const D=ControlBloch,$=id=>document.getElementById(id),params=new URLSearchParams(location.search);
  const mode=params.get('mode')||'control',omega=2*Math.PI*.005,suffix='_{\\mathrm I}';
  const defaults={phase:0,time:50,progress:1,target:params.get('target')==='plus'};
  let state={...defaults},raf=0,last=0;
  const svg=(id,cls='')=>'<svg id="'+id+'" class="'+cls+'" viewBox="0 0 660 500" role="img" aria-label="相互作用绘景中的布洛赫球"></svg>';
  const row=(id,n)=>'<div class="prob-row"><div class="prob-label"><span data-math="P_'+n+'"></span><output id="'+id+'-value"></output></div><div class="track"><div id="'+id+'-bar" class="bar '+(n?'secondary':'')+'"></div></div></div>';
  const preset=(attr,v,tex)=>'<button '+attr+'="'+v+'" data-math="'+tex+'"></button>';
  $('slide').classList.add(mode);
  if(mode==='compare'){
    $('title').textContent='同样各半，不同相位';$('reset').hidden=true;
    $('content').innerHTML='<div class="frame-note">相互作用绘景</div>'+svg('left-sphere')+svg('right-sphere')+
      '<div id="left-state" class="state-label"></div><div id="right-state" class="state-label"></div>'+
      ['left','right'].map(side=>'<div class="half-prob '+side+'"><span data-math="P_0=\\tfrac12"></span><div class="half-track"><i></i><b></b></div><span data-math="P_1=\\tfrac12"></span></div>').join('');
  }else if(mode==='analysis'){
    $('title').textContent='同一个分析脉冲，区分两个叠加态';
    $('content').innerHTML='<div class="frame-note">相互作用绘景</div><div class="meta" data-math="\\phi_{\\mathrm d}=\\pi/2\\quad\\Omega/(2\\pi)=5\\,\\mathrm{MHz}"></div>'+
      '<div id="input-plus" class="row-label"><span data-math="|+\\rangle"></span><small>输入</small></div>'+
      '<div id="input-minus" class="row-label"><span data-math="|-\\rangle"></span><small>输入</small></div>'+
      '<div class="separator"></div>'+svg('plus-sphere','analysis-sphere')+svg('minus-sphere','analysis-sphere')+
      ['plus','minus'].map(key=>'<div class="readout" id="'+key+'-readout">'+row(key+'-p0',0)+row(key+'-p1',1)+'<div class="output-state" id="'+key+'-state"></div></div>').join('')+
      '<div class="controls"><button id="play">播放</button><label for="progress">分析脉冲进度</label><input id="progress" type="range" min="0" max="1" step=".005" value="1"><output id="progress-value"></output><div id="analysis-angle"></div></div>';
  }else{
    $('title').textContent='改变驱动相位，改变旋转方向';
    $('content').innerHTML='<div class="frame-note">相互作用绘景</div><div class="meta">初态 <span data-math="|0\\rangle"></span> · <span data-math="\\Omega/(2\\pi)=5\\,\\mathrm{MHz}"></span></div>'+
      svg('phase-sphere')+'<div id="angle-output"></div><div class="axis-key">灰色：旋转轴 <span data-math="\\mathbf n"></span></div>'+
      '<div class="state-panel"><h2>当前末态</h2><div id="state-formula"></div>'+row('p0',0)+row('p1',1)+
      '<div id="relative-phase"></div><div class="target-line"><button id="target-toggle">显示目标态</button><span class="target-caption" id="target-caption"></span></div></div>'+
      '<div class="controls"><div class="control-group"><div class="control-row"><label for="phase">驱动相位 <span data-math="\\phi_{\\mathrm d}"></span></label><input id="phase" type="range" min="0" max="360" step="1" value="0"><output id="phase-value"></output></div><div class="presets">'+
      [[0,'0'],[90,'\\pi/2'],[180,'\\pi'],[270,'3\\pi/2']].map(p=>preset('data-phase',...p)).join('')+
      '</div></div><div class="control-group"><div class="control-row"><label for="duration">脉冲时长</label><input id="duration" type="range" min="0" max="200" step="1" value="50"><output id="duration-value"></output></div><div class="presets">'+
      [[50,'\\pi/2'],[100,'\\pi'],[200,'2\\pi']].map(p=>preset('data-time',...p)).join('')+'<button id="play">播放</button></div></div></div>';
  }
  function probability(id,p){p=Math.max(0,Math.min(1,p));$(id+'-value').textContent=(p*100).toFixed(1)+'%';$(id+'-bar').style.width=p*100+'%';}
  function nicePi(q){for(const [n,tex] of [[0,'0'],[.5,'\\pi/2'],[1,'\\pi'],[1.5,'3\\pi/2'],[2,'2\\pi']])if(Math.abs(q-n)<1e-9)return tex;return q.toFixed(3)+'\\pi';}
  const vec=(phase,t)=>{const d=phase*Math.PI/180,g=omega*t;return[-Math.sin(d)*Math.sin(g),-Math.cos(d)*Math.sin(g),Math.cos(g)];};
  function axis(svg,n){const p=D.project(n.map(x=>1.1*x)),m=D.project(n.map(x=>-1.06*x));D.line(svg,m,D.project([0,0,0]),D.gray,2.5,'6 5');D.arrow(svg,D.project([0,0,0]),p,D.gray,3);D.label(svg,p[0]+20,p[1]-12,'\\mathbf n',46,25);}
  function draw(){
    if(mode==='compare'){
      D.drawSphere($('left-sphere'),{vector:[0,-1,0],suffix});D.drawSphere($('right-sphere'),{vector:[1,0,0],suffix});
      D.math($('left-state'),'\\dfrac{|0\\rangle-i|1\\rangle}{\\sqrt2}');D.math($('right-state'),'\\dfrac{|0\\rangle+|1\\rangle}{\\sqrt2}');
      window.phaseLabState={mode,vectors:[[0,-1,0],[1,0,0]],probabilities:[.5,.5]};return;
    }
    if(mode==='analysis'){
      const angle=state.progress*Math.PI/2,c=Math.cos(angle/2),s=Math.sin(angle/2),results=[];
      for(const [key,sign] of [['plus',1],['minus',-1]]){
        const a=(c+sign*s)/Math.sqrt(2),b=(sign*c-s)/Math.sqrt(2),v=[2*a*b,0,a*a-b*b];
        const trace=Array.from({length:101},(_,j)=>{const g=angle*j/100;return[sign*Math.cos(g),0,sign*Math.sin(g)];});
        D.drawSphere($(key+'-sphere'),{vector:v,trace,suffix});
        probability(key+'-p0',a*a);probability(key+'-p1',b*b);
        const tex=state.progress===1?(sign===1?'|0\\rangle':'-|1\\rangle'):state.progress===0?(sign===1?'|+\\rangle':'|-\\rangle'):a.toFixed(3)+'|0\\rangle'+(b<0?'-':'+')+Math.abs(b).toFixed(3)+'|1\\rangle';
        D.math($(key+'-state'),tex);results.push({input:sign,a,b,vector:v,p0:a*a,p1:b*b});
      }
      $('progress').value=state.progress;$('progress-value').textContent=Math.round(100*state.progress)+'%';
      D.math($('analysis-angle'),'\\Omega s='+nicePi(state.progress/2)+'\\quad s='+(50*state.progress).toFixed(1)+'\\,\\mathrm{ns}');
      window.phaseLabState={mode,...state,angle,results};return;
    }
    const d=state.phase*Math.PI/180,g=omega*state.time,a=Math.cos(g/2),sin=Math.sin(g/2),br=-Math.sin(d)*sin,bi=-Math.cos(d)*sin,v=vec(state.phase,state.time),n=[Math.cos(d),-Math.sin(d),0];
    D.drawSphere($('phase-sphere'),{vector:v,trace:state.time?Array.from({length:161},(_,j)=>vec(state.phase,state.time*j/160)):[],suffix});
    axis($('phase-sphere'),n);
    if(state.target){const p=D.project([1,0,0]);D.el($('phase-sphere'),'circle',{cx:p[0],cy:p[1],r:12,fill:'none',stroke:D.gray,'stroke-width':3});}
    let tex;
    const phaseB=((-.5-state.phase/180)%2+2)%2;
    if(state.time===50&&state.phase%90===0){const factors=['-i','-','+i','+'];tex='\\dfrac{|0\\rangle'+factors[(state.phase/90)%4]+'|1\\rangle}{\\sqrt2}';}
    else if(Math.abs(sin)<1e-9)tex=(a<0?'-':'')+'|0\\rangle';
    else if(Math.abs(a)<1e-9)tex='e^{i'+nicePi(phaseB)+'}|1\\rangle';
    else tex=a.toFixed(3)+'|0\\rangle'+(phaseB===0?'+':'+e^{i'+nicePi(phaseB)+'}')+Math.abs(sin).toFixed(3)+'|1\\rangle';
    D.math($('state-formula'),tex);
    probability('p0',a*a);probability('p1',sin*sin);
    const rel=(Math.atan2(v[1],v[0])+2*Math.PI)%(2*Math.PI);
    if(Math.hypot(v[0],v[1])<1e-9)$('relative-phase').textContent='相对相位：—';
    else D.math($('relative-phase'),'\\varphi_{\\mathrm I}='+nicePi(rel/Math.PI));
    D.math($('angle-output'),'\\gamma=\\Omega\\tau='+nicePi(state.time/100));
    D.math($('phase-value'),nicePi(state.phase/180));$('duration-value').textContent=state.time.toFixed(0)+' ns';
    $('phase').value=state.phase;$('duration').value=state.time;
    $('target-toggle').textContent=state.target?'隐藏目标态':'显示目标态';$('target-toggle').setAttribute('aria-pressed',String(state.target));
    if(state.target)D.math($('target-caption'),'\\circ\\ |+\\rangle');else $('target-caption').textContent='';
    document.querySelectorAll('[data-phase]').forEach(e=>e.setAttribute('aria-pressed',String(+e.dataset.phase===state.phase)));
    document.querySelectorAll('[data-time]').forEach(e=>e.setAttribute('aria-pressed',String(+e.dataset.time===state.time)));
    window.phaseLabState={mode,...state,a,bReal:br,bImag:bi,vector:v,axis:n,p0:a*a,p1:sin*sin,relativePhase:Math.hypot(v[0],v[1])<1e-9?null:rel,gamma:g};
  }
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;last=0;if($('play'))$('play').textContent='播放';}
  function setState(s){stop();state={...s};draw();}
  function tick(now){if(!last)last=now;const dt=now-last;last=now;
    if(mode==='analysis')state.progress=Math.min(1,state.progress+dt/4500);else state.time=Math.min(200,state.time+dt/40);
    draw();if(mode==='analysis'?state.progress===1:state.time===200)stop();else raf=requestAnimationFrame(tick);
  }
  if($('play'))$('play').addEventListener('click',()=>{if(raf){stop();return;}if(mode==='analysis'&&state.progress===1)state.progress=0;if(mode==='control'&&state.time===200)state.time=0;$('play').textContent='暂停';raf=requestAnimationFrame(tick);});
  if(mode==='control'){
    $('phase').addEventListener('input',()=>setState({...state,phase:+$('phase').value}));
    $('duration').addEventListener('input',()=>setState({...state,time:+$('duration').value}));
    $('target-toggle').addEventListener('click',()=>setState({...state,target:!state.target}));
    document.querySelectorAll('[data-phase]').forEach(e=>e.addEventListener('click',()=>setState({...state,phase:+e.dataset.phase})));
    document.querySelectorAll('[data-time]').forEach(e=>e.addEventListener('click',()=>setState({...state,time:+e.dataset.time})));
  }
  if(mode==='analysis')$('progress').addEventListener('input',()=>setState({...state,progress:+$('progress').value}));
  $('reset').addEventListener('click',()=>setState(defaults));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)stop();});addEventListener('pagehide',stop);
  D.controls();draw();installFigurePrint({getState:()=>({...state}),setState,defaults,fit:D.fit});
  document.fonts.ready.then(()=>window.figureReady=true);
})();
