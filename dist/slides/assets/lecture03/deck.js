(() => {
  const ready=()=>{
    if(!window.Reveal?.isReady())return setTimeout(ready,80);
    window.prepareLecture03Steps();
    Reveal.sync();
    const footer=document.querySelector('.course-footer-bar'),reveal=document.querySelector('.reveal');
    reveal.append(footer);
    for(const node of reveal.querySelectorAll('.slide-logo,.slide-number'))footer.append(node);
    const layoutFooter=()=>{
      reveal.style.setProperty('--footer-scale',Math.min(reveal.clientWidth/1280,reveal.clientHeight/720));
      footer.classList.toggle('is-cover',Reveal.getCurrentSlide()?.classList.contains('cover'));
    };
    layoutFooter();addEventListener('resize',layoutFooter);Reveal.on('slidechanged',layoutFooter);
    const stacked=!!document.querySelector('.derivation-stack');
    if(stacked)Reveal.configure({navigationMode:'default',slideNumber:()=>{
      const {h,v}=Reveal.getIndices();
      const count=document.querySelectorAll('.slides>section').length;
      return [(h+1)+(v?' · 推导':''),' / ',count];
    }});
    const send=(frame,action)=>frame.contentWindow?.postMessage({type:'lecture03',action},'*');
    for(const [event,action] of [['fragmentshown','sync'],['fragmenthidden','pause']])Reveal.on(event,({fragments,fragment})=>{
      for(const node of fragments||[fragment]){
        if(node.matches('iframe'))send(node,action);
        node.querySelectorAll('iframe').forEach(f=>send(f,action));
      }
    });
    Reveal.on('slidechanged',({previousSlide,currentSlide})=>{previousSlide?.querySelectorAll('iframe').forEach(f=>send(f,'pause'));currentSlide?.querySelectorAll('iframe').forEach(f=>send(f,'sync'));});
    addEventListener('message',event=>{
      if(event.data?.type!=='lecture03-focus')return;
      const frame=[...document.querySelectorAll('iframe')].find(f=>f.contentWindow===event.source);if(!frame)return;
      const section=frame.closest('section'),data=event.data.data;
      section.querySelectorAll('[data-focus-bind]').forEach(e=>{if(typeof data[e.dataset.focusBind]==='string')e.textContent=data[e.dataset.focusBind];});
      section.querySelectorAll('[data-focus-bar]').forEach(e=>{e.style.width=(100*Math.max(0,Math.min(1,data.p1)))+'%';});
      section.querySelectorAll('[data-equator]').forEach(e=>e.classList.toggle('active',+e.dataset.equator===data.phase%360));
    });
    document.querySelectorAll('.focus-slide iframe').forEach(f=>send(f,'sync'));
    addEventListener('message',event=>{
      const frame=Reveal.getCurrentSlide()?.querySelector('iframe');
      if(!frame||event.source!==frame.contentWindow||event.data?.type!=='lecture03-navigation')return;
      const actions={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',PageUp:'prev',PageDown:'next',' ':'next'};
      const action=actions[event.data.key];if(action)Reveal[action]();
    });
    // Derivations are native vertical slides; local hash links retain deep links.
    window.lecture03Ready=true;
  };ready();
})();
