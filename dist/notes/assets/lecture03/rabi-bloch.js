(() => {
  const D=ControlBloch,$=id=>document.getElementById(id),mode=new URLSearchParams(location.search).get('mode');
  const observation=mode==='observation',continuous=observation||mode==='continuous';
  const omega=2*Math.PI*.005,defaults={tauNs:continuous&&!observation?50:100},end=250,x0=75,x1=observation?1120:490;
  let state={...defaults};
  const xp=t=>x0+(x1-x0)*t/end,p1=t=>Math.sin(omega*t/2)**2;
  const vector=t=>[0,-Math.sin(omega*t),Math.cos(omega*t)];
  function stateTex(t){
    const a=Math.cos(omega*t/2),s=Math.sin(omega*t/2);
    if(Math.abs(s)<1e-10)return a<0?'-|0\\rangle':'|0\\rangle';
    if(Math.abs(a)<1e-10)return s>0?'-i|1\\rangle':'i|1\\rangle';
    if(t===50)return '\\dfrac{|0\\rangle-i|1\\rangle}{\\sqrt2}';
    return a.toFixed(3)+'|0\\rangle'+(s<0?'+':'-')+Math.abs(s).toFixed(3)+'i|1\\rangle';
  }
  function chart(){
    const svg=$('rabi-chart'),t=state.tauNs,base=observation?350:292,height=observation?315:continuous?245:185;svg.replaceChildren();
    svg.dataset.xMin=x0;svg.dataset.xMax=x1;svg.dataset.tMax=end;
    if(!continuous){
      D.el(svg,'text',{x:55,y:24,style:'font-size:21px'},'包络');
      D.el(svg,'path',{d:'M'+x0+',78 V'+(t>0?48:78)+' H'+xp(t)+' V78 H'+x1,fill:'none',stroke:D.blue,'stroke-width':2.5});
      D.el(svg,'text',{x:325,y:24,style:'font-size:20px'},'持续驱动');D.line(svg,[273,17],[308,17],D.gray,2.5,'7 6');
    }
    D.label(svg,20,base-height-7,'P_1',48,25);
    for(const p of [0,.5,1]){const y=base-height*p;D.line(svg,[x0,y],[x1,y]);D.el(svg,'text',{x:x0-12,y:y+7,'text-anchor':'end',style:'font-size:20px'},String(p));}
    D.line(svg,[x0,base-height],[x0,base],D.gray,1.3);D.line(svg,[x0,base],[x1,base],D.gray,1.3);
    for(const v of [0,50,100,150,200,250]){D.line(svg,[xp(v),base],[xp(v),base+5],D.gray);D.el(svg,'text',{x:xp(v),y:base+27,'text-anchor':'middle',style:'font-size:19px'},String(v));}
    D.label(svg,observation?1080:466,base+53,(observation?'\\tau':'t')+'\\ (\\mathrm{ns})',102,22);
    const points=fn=>Array.from({length:501},(_,j)=>[xp(j/2),base-height*fn(j/2)]);
    if(!continuous)D.path(svg,points(p1),D.gray,2.5,'7 6');
    const actual=D.path(svg,points(u=>p1(continuous?u:Math.min(u,t))),D.blue,4);actual.id='actual-probability';
    D.line(svg,[xp(t),continuous?base-height:45],[xp(t),base],D.blue,1.5,'4 5');
    D.el(svg,'circle',{cx:xp(t),cy:base-height*p1(t),r:6,fill:D.blue,stroke:'white','stroke-width':2});
  }
  function draw(){
    const t=state.tauNs,gamma=omega*t,a=Math.cos(gamma/2),bImag=-Math.sin(gamma/2);
    const trace=t>0?Array.from({length:201},(_,j)=>vector(t*j/200)):[];
    if(!observation)D.drawSphere($('rabi-sphere'),{vector:vector(t),trace,suffix:'_{\\mathrm I}',rotationAxis:'x'});
    chart();$('duration').value=t;$('duration-value').value=t+' ns';
    const g=t===0?'0':t===50?'\\pi/2':t===100?'\\pi':t===200?'2\\pi':(t/100).toFixed(2)+'\\pi';
    D.math($('angle-output'),'\\gamma=\\Omega '+(continuous?'t':'\\tau')+'='+g);
    D.math($('state-output'),'|\\psi_{\\mathrm I}\\rangle='+stateTex(t));
    D.math($('prob-output'),'P_1='+p1(t).toFixed(3));
    document.querySelectorAll('[data-time]').forEach(e=>e.setAttribute('aria-pressed',String(+e.dataset.time===t)));
    $('duration').setAttribute('aria-valuetext',t+'纳秒，测得1的概率'+p1(t).toFixed(3));
    window.rabiLabState={mode:observation?'observation':continuous?'continuous':'pulse',tauNs:t,timeNs:t,omegaPerNs:omega,aReal:a,bImag,p1:p1(t),p0:1-p1(t),afterOffP1:continuous?null:p1(t),vector:vector(t),gamma};
  }
  function setState(s){state={...s};draw();}
  $('title').textContent=observation?'照得更久，就更接近1吗？':continuous?'拉比振荡与球面旋转':'关断时刻决定末态';
  $('time-label').textContent=observation?'脉冲时长':continuous?'作用时间':'关断时刻';
  $('duration').setAttribute('aria-label',(observation?'脉冲时长':continuous?'作用时间':'关断时刻')+'，纳秒');
  D.math($('time-symbol'),continuous&&!observation?'t':'\\tau');
  if(observation){
    $('slide').classList.add('observation');
    $('slide').setAttribute('aria-label','脉冲时长与测得1的概率');
    $('rabi-chart').setAttribute('viewBox','0 0 1170 415');
    document.querySelector('.rabi-meta').prepend('共振 · ');
    document.querySelectorAll('[data-time]').forEach(e=>{e.removeAttribute('data-math');e.textContent=e.dataset.time+' ns';});
  }
  $('duration').addEventListener('input',()=>setState({tauNs:+$('duration').value}));
  document.querySelectorAll('[data-time]').forEach(e=>e.addEventListener('click',()=>setState({tauNs:+e.dataset.time})));
  $('reset').addEventListener('click',()=>setState(defaults));
  D.controls();draw();installFigurePrint({getState:()=>({...state}),setState,defaults,fit:D.fit});
  document.fonts.ready.then(()=>window.figureReady=true);
})();
