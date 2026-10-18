(()=>{function ready(){if(!window.Reveal?.isReady())return setTimeout(ready,40);
 const mains=[...document.querySelector('.slides').children].filter(e=>e.tagName==='SECTION');
 Reveal.configure({slideNumber:()=>{const at=Reveal.getIndices();return at.v?[`${at.h+1} · 补充 ${at.v}`,' / ',mains[at.h].querySelectorAll(':scope>section').length-1]:[at.h+1,' / ',mains.length];}});
 const logo=document.querySelector('.reveal .slide-logo'),number=document.querySelector('.reveal .slide-number');
 function alignFooter(){if(!logo||!number||!logo.getClientRects().length)return;const box=logo.getBoundingClientRect(),parent=number.offsetParent;if(!parent||!box.width||!box.height)return;const bounds=parent.getBoundingClientRect(),sx=bounds.width/parent.offsetWidth,sy=bounds.height/parent.offsetHeight;number.style.setProperty('--l05-page-center',((box.top+box.height/2-bounds.top)/sy-parent.clientTop)+'px');number.style.setProperty('--l05-page-right',((bounds.right-box.left)/sx-parent.clientLeft+24)+'px');}
 const schedule=()=>requestAnimationFrame(alignFooter);if(logo&&number){const ob=new ResizeObserver(schedule);ob.observe(logo);ob.observe(document.querySelector('.reveal'));logo.addEventListener('load',schedule);}addEventListener('resize',schedule);document.fonts.ready.then(schedule);Reveal.on('resize',schedule);Reveal.on('slidechanged',schedule);document.addEventListener('fullscreenchange',schedule);schedule();
 const frames={answers:document.getElementById('l05-frame-answers'),quantum:document.getElementById('l05-frame-quantum')};let classicRecord=null;
 const send=(name,data)=>frames[name]?.contentWindow?.postMessage({channel:'lecture05-interactive',...data},'*');
 function visibility(){for(const [name,f]of Object.entries(frames))send(name,{type:'visibility',active:f.closest('section')===Reveal.getCurrentSlide()});}
 Reveal.on('slidechanged',visibility);
 for(const [name,f]of Object.entries(frames)){f.addEventListener('load',visibility);if(name==='quantum')continue;const button=document.createElement('button');button.type='button';button.className='lab-fullscreen';button.textContent='放大互动';button.addEventListener('click',async()=>{try{await f.requestFullscreen();}catch{button.textContent='可按F全屏课件';}});f.parentElement.append(button);}
 document.addEventListener('fullscreenchange',()=>{if(Reveal.isOverview())Reveal.toggleOverview(false);for(const[name,f]of Object.entries(frames))send(name,{type:'fullscreen-state',active:document.fullscreenElement===f});});
 document.addEventListener('keydown',e=>{if(document.fullscreenElement&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();document.exitFullscreen();}},true);
 addEventListener('message',async e=>{const d=e.data;if(!d||d.channel!=='lecture05-interactive'||e.source!==frames[d.demo]?.contentWindow)return;
  if(d.type==='classic-record'&&d.demo==='answers'){classicRecord=d.record;send('quantum',{type:'classic-record',record:classicRecord});}
  if(d.type==='ready'&&d.demo==='quantum')send('quantum',{type:'classic-record',record:classicRecord});
  if(d.type==='reset'&&d.demo==='answers'){classicRecord=null;send('quantum',{type:'classic-record',record:null});}
  if(d.type==='exit-fullscreen'&&document.fullscreenElement)await document.exitFullscreen();
  if(frames[d.demo].closest('section')!==Reveal.getCurrentSlide())return;
  if(d.type==='continue'){if(document.fullscreenElement)await document.exitFullscreen();Reveal.right();const s=Reveal.getCurrentSlide();s.setAttribute('tabindex','-1');s.focus({preventScroll:true});}
  if(d.type==='navigate'){const map={ArrowLeft:'left',ArrowRight:'right',PageDown:'right',PageUp:'left',' ':'right'};if(map[d.key]){Reveal[map[d.key]]();const s=Reveal.getCurrentSlide();s.setAttribute('tabindex','-1');s.focus({preventScroll:true});}}
 });visibility();window.lecture05Ready=true;
}ready();})();
