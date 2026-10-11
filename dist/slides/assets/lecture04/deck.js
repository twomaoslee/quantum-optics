(()=>{function ready(){if(!window.Reveal?.isReady())return setTimeout(ready,60);
 const mainSlides=[...document.querySelector('.slides').children].filter(e=>e.tagName==='SECTION');
 Reveal.configure({slideNumber:()=>{const at=Reveal.getIndices();return at.v?[`${at.h+1} · 推导 ${at.v}`," / ",mainSlides[at.h].querySelectorAll(':scope>section').length-1]:[at.h+1," / ",mainSlides.length];}});
 // The native logo remains in place; its box is the single footer reference.
 const logo=document.querySelector('.reveal .slide-logo'),number=document.querySelector('.reveal .slide-number');
 function alignFooter(){
  if(!logo||!number||!logo.getClientRects().length)return;
  const box=logo.getBoundingClientRect(),parent=number.offsetParent;
  if(!parent||!box.width||!box.height)return;
  const bounds=parent.getBoundingClientRect(),sx=bounds.width/parent.offsetWidth,sy=bounds.height/parent.offsetHeight;
  number.style.setProperty('--l04-page-center',((box.top+box.height/2-bounds.top)/sy-parent.clientTop)+'px');
  number.style.setProperty('--l04-page-right',((bounds.right-box.left)/sx-parent.clientLeft+24)+'px');
 }
 const scheduleFooter=()=>requestAnimationFrame(alignFooter);
 if(logo&&number){const observer=new ResizeObserver(scheduleFooter);observer.observe(logo);observer.observe(document.querySelector('.reveal'));logo.addEventListener('load',scheduleFooter);}
 addEventListener('resize',scheduleFooter);document.addEventListener('fullscreenchange',scheduleFooter);Reveal.on('slidechanged',scheduleFooter);Reveal.on('resize',scheduleFooter);document.fonts.ready.then(scheduleFooter);alignFooter();
 document.querySelectorAll('.lab-frame').forEach(frame=>{const button=document.createElement('button');button.className='lab-fullscreen';button.textContent='放大图';button.onclick=async()=>{try{await frame.requestFullscreen();}catch{window.open(frame.src,'_blank','noopener');}};frame.parentElement.append(button);});
 document.addEventListener('keydown',e=>{if(document.fullscreenElement&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();document.exitFullscreen();}},true);
 document.addEventListener('fullscreenchange',()=>{if(Reveal.isOverview())Reveal.toggleOverview(false);document.querySelectorAll('.lab-frame').forEach(f=>f.contentWindow?.postMessage({type:'lecture04-fullscreen',active:document.fullscreenElement===f},'*'));});addEventListener('message',e=>{const f=Reveal.getCurrentSlide()?.querySelector('iframe');if(e.source===f?.contentWindow&&e.data?.type==='lecture04-exit-fullscreen'&&document.fullscreenElement)document.exitFullscreen();});
 addEventListener('message',event=>{const frame=Reveal.getCurrentSlide()?.querySelector('iframe');if(!frame||event.source!==frame.contentWindow||event.data?.type!=='lecture04-navigation')return;const map={ArrowLeft:'left',ArrowRight:'right',PageDown:'next',PageUp:'prev',' ':'next'};if(map[event.data.key]){Reveal[map[event.data.key]]();const current=Reveal.getCurrentSlide();current.setAttribute('tabindex','-1');current.focus({preventScroll:true});}});Reveal.on('slidechanged',()=>document.querySelectorAll('.lab-frame').forEach(f=>f.contentWindow?.postMessage({type:'lecture04-visibility',active:f.closest('section')===Reveal.getCurrentSlide()},'*')));window.lecture04Ready=true;}ready();})();
