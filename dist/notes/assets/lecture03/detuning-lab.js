(() => {
  const D=ControlBloch,$=id=>document.getElementById(id),mode=new URLSearchParams(location.search).get('mode')||'bloch',omega=2*Math.PI*.005;
  const defaults={ratio:1,time:mode==='bloch'?100/Math.sqrt(2):100};
  let state={...defaults},raf=0,last=0;
  if(mode==='curves'){$('slide').classList.add('curves');$('title').textContent='频率偏了，原来的翻转脉冲还有效吗？';$('frame-note').textContent='固定强度，比较不同脉冲时长';}
  if(mode==='repair')$('title').textContent='调整时长，还是调回共振？';
  const values=(r,t)=>{const f=Math.hypot(1,r),q=omega*f*t,s=Math.sin(q/2),c=Math.cos(q/2);
    return{uReal:c,uImag:-r*s/f,vReal:0,vImag:-s/f,vector:[r*(1-Math.cos(q))/(f*f),-Math.sin(q)/f,(r*r+Math.cos(q))/(f*f)],p1:s*s/(f*f),max:1/(f*f),firstPeak:100/f,omegaR:omega*f};};
  function chart(){
    const svg=$('detuning-chart');svg.replaceChildren();
    const wide=mode==='curves',W=wide?900:530,H=wide?440:390,x0=62,x1=W-27,top=62,base=H-78,h=base-top;
    svg.setAttribute('viewBox','0 0 '+W+' '+H);
    const xp=t=>x0+(x1-x0)*t/250,yp=p=>base-h*p;
    D.line(svg,[x0,top],[x0,base],D.gray);D.line(svg,[x0,base],[x1,base],D.gray);
    for(const p of [0,.5,1]){D.line(svg,[x0,yp(p)],[x1,yp(p)]);D.el(svg,'text',{x:x0-12,y:yp(p)+7,'text-anchor':'end',style:'font-size:21px'},p);}
    D.label(svg,22,top-10,'P_1',44,25);
    for(const t of [0,50,100,150,200,250]){D.line(svg,[xp(t),base],[xp(t),base+5],D.gray);D.el(svg,'text',{x:xp(t),y:base+29,'text-anchor':'middle',style:'font-size:20px'},t);}
    D.label(svg,W-90,H-13,'t\\ (\\mathrm{ns})',150,23);
    D.line(svg,[x0,23],[x0+33,23],D.blue,3);D.el(svg,'text',{x:x0+43,y:30,style:'font-size:22px'},'当前失谐');
    D.line(svg,[x0+183,23],[x0+216,23],D.gray,2.5,'7 6');D.el(svg,'text',{x:x0+226,y:30,style:'font-size:22px'},'共振');
    const points=r=>Array.from({length:601},(_,j)=>[xp(j*250/600),yp(values(r,j*250/600).p1)]);
    D.path(svg,points(0),D.gray,2.5,'7 6');
    const p=D.path(svg,points(state.ratio),D.blue,3.5);p.id='detuned-probability';
    const current=values(state.ratio,state.time);
    if(wide){D.line(svg,[xp(100),top],[xp(100),base],D.gray,1.6,'4 5');D.el(svg,'text',{x:xp(100)+10,y:top+27,style:'font-size:21px'},'原翻转时刻');}
    else D.line(svg,[xp(state.time),top],[xp(state.time),base],D.blue,1.5,'4 5');
    D.el(svg,'circle',{cx:xp(state.time),cy:yp(current.p1),r:6,fill:D.blue,stroke:'white','stroke-width':2});
  }
  function draw(){
    const s=values(state.ratio,state.time),f=Math.hypot(1,state.ratio),n=[1/f,0,state.ratio/f];
    if(mode!=='curves'){
      const trace=state.time?Array.from({length:241},(_,j)=>values(state.ratio,state.time*j/240).vector):[];
      D.drawSphere($('detuning-sphere'),{vector:s.vector,trace,suffix:'_{\\mathrm R}'});
      const tip=D.project(n.map(x=>1.13*x));
      D.line($('detuning-sphere'),D.project(n.map(x=>-1.06*x)),D.project([0,0,0]),D.gray,2.5,'6 5');
      D.arrow($('detuning-sphere'),D.project([0,0,0]),tip,D.gray,3);
      D.label($('detuning-sphere'),tip[0]-22,tip[1]-15,'\\mathbf n_{\\mathrm R}',65,24);
    }
    chart();$('detuning').value=state.ratio;$('duration').value=state.time;
    $('detuning-value').textContent=state.ratio.toFixed(2);$('duration-value').textContent=state.time.toFixed(1)+' ns';
    D.math($('current-prob'),(mode==='curves'?'P_1(100\\,\\mathrm{ns})':'P_1')+'='+s.p1.toFixed(3));
    D.math($('max-prob'),'P_{1,\\max}='+s.max.toFixed(3));
    D.math($('peak-time'),'t_{\\max}='+s.firstPeak.toFixed(1)+'\\,\\mathrm{ns}');
    document.querySelectorAll('[data-ratio]').forEach(e=>e.setAttribute('aria-pressed',String(+e.dataset.ratio===state.ratio)));
    window.detuningLabState={mode,...state,...s,axis:n,p0:1-s.p1};
  }
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;last=0;$('play').textContent='播放';}
  function setState(s){stop();state={...s};draw();}
  function tick(now){if(!last)last=now;state.time=Math.min(250,state.time+(now-last)/32);last=now;draw();if(state.time===250)stop();else raf=requestAnimationFrame(tick);}
  $('detuning').addEventListener('input',()=>setState({...state,ratio:+$('detuning').value}));
  $('duration').addEventListener('input',()=>setState({...state,time:+$('duration').value}));
  document.querySelectorAll('[data-ratio]').forEach(e=>e.addEventListener('click',()=>setState({...state,ratio:+e.dataset.ratio})));
  $('peak').addEventListener('click',()=>setState({...state,time:values(state.ratio,0).firstPeak}));
  $('resonance').addEventListener('click',()=>setState({...state,ratio:0}));
  $('original').addEventListener('click',()=>setState({...state,time:100}));
  $('reset').addEventListener('click',()=>setState(defaults));
  $('play').addEventListener('click',()=>{if(raf){stop();return;}if(state.time===250)state.time=0;$('play').textContent='暂停';raf=requestAnimationFrame(tick);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});addEventListener('pagehide',stop);document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)stop();});
  D.controls();draw();installFigurePrint({getState:()=>({...state}),setState,defaults,fit:D.fit});
  document.fonts.ready.then(()=>window.figureReady=true);
})();
