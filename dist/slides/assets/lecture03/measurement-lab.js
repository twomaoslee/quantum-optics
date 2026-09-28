(() => {
  const D=ControlBloch,$=id=>document.getElementById(id),defaults={time:.25};let state={...defaults};
  function draw(){
    const u=state.time,q=2*Math.PI*u,v=[Math.cos(q),-Math.sin(q),0];
    D.drawSphere($('fixed'),{vector:v,trace:Array.from({length:161},(_,i)=>[Math.cos(q*i/160),-Math.sin(q*i/160),0]),rotationAxis:'x'});
    D.drawSphere($('rotating'),{vector:[1,0,0],suffix:'_{\\mathrm I}',rotationAxis:'x'});
    D.math($('fixed-result'),'P_0^{\\mathrm{out}}='+((1+Math.cos(q))/2).toFixed(3));
    D.math($('rotating-result'),'P_0^{\\mathrm{out}}=1');
    $('time').value=u;$('time-value').value=u.toFixed(2);
    document.querySelectorAll('[data-time]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.time===u)));
    window.measurementLabState={time:u,fixedP0:(1+Math.cos(q))/2,rotatingP0:1,analysisPhase:Math.PI/2-q,vector:v};
  }
  function setState(s){state={...s};draw();}
  $('time').addEventListener('input',()=>setState({time:+$('time').value}));
  document.querySelectorAll('[data-time]').forEach(b=>b.addEventListener('click',()=>setState({time:+b.dataset.time})));
  $('reset').addEventListener('click',()=>setState(defaults));
  D.controls();draw();installFigurePrint({getState:()=>({...state}),setState,defaults,fit:D.fit});
  document.fonts.ready.then(()=>window.figureReady=true);
})();
