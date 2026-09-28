(() => {
  const D=ControlBloch,$=id=>document.getElementById(id),defaults={time:.25};
  let state={...defaults},raf=0,last=0;
  function draw(){
    const q=2*Math.PI*state.time,vector=[Math.cos(q),-Math.sin(q),0];
    const trace=state.time>0?Array.from({length:151},(_,j)=>{const a=q*j/150;return[Math.cos(a),-Math.sin(a),0];}):[];
    D.drawSphere($('fixed-sphere'),{vector,trace});
    D.drawSphere($('rotating-sphere'),{vector:[1,0,0],suffix:'_{\\mathrm I}'});
    let phase=state.time===0?'0':state.time===.25?'-\\pi/2':state.time===.5?'-\\pi':state.time===1?'-2\\pi':'-'+(2*state.time).toFixed(3)+'\\pi';
    D.math($('fixed-phase'),'\\varphi='+phase);
    $('time').value=state.time;$('time-value').value=state.time.toFixed(3);
    document.querySelectorAll('[data-time]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.time===state.time)));
    window.blochFramesState={...state,fixed:vector,interaction:[1,0,0],fixedPhi:-q,interactionPhi:0,p0:.5,p1:.5};
  }
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;last=0;$('play').textContent='播放';}
  function setState(s){stop();state={...s};draw();}
  function tick(now){if(!last)last=now;state.time=Math.min(1,state.time+(now-last)/8000);last=now;draw();if(state.time===1)stop();else raf=requestAnimationFrame(tick);}
  $('play').addEventListener('click',()=>{if(raf){stop();return;}if(state.time===1)state.time=0;$('play').textContent='暂停';raf=requestAnimationFrame(tick);});
  $('time').addEventListener('input',()=>setState({time:+$('time').value}));
  document.querySelectorAll('[data-time]').forEach(b=>b.addEventListener('click',()=>setState({time:+b.dataset.time})));
  $('reset').addEventListener('click',()=>setState(defaults));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)stop();});
  addEventListener('pagehide',stop);
  D.controls();draw();installFigurePrint({getState:()=>({...state}),setState,defaults,fit:D.fit});
  document.fonts.ready.then(()=>window.figureReady=true);
})();
