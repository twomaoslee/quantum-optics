// Keep YouTube's real HTTP identity; direct-file mode offers the original watch page.
(() => {
 document.querySelectorAll('iframe[data-youtube-src]').forEach(frame=>{
  const source=frame.getAttribute('data-youtube-src');
  if(['http:','https:'].includes(location.protocol)){
   const url=new URL(source);url.searchParams.set('origin',location.origin);
   frame.src=url.href;
  } else {
   const link=document.createElement('a');link.className='youtube-direct-link';
   link.href='https://www.youtube.com/watch?v='+new URL(source).pathname.split('/').pop();
   link.target='_blank';link.rel='noopener';link.dataset.previewLink='false';
   const title=document.createElement('strong');title.textContent='播放黑体辐射实验';
   const detail=document.createElement('span');detail.textContent='在 YouTube 打开 · BYU Physics Demonstrations ↗';
   link.append(title,detail);frame.replaceWith(link);
  }
 });
})();

// All lecture videos share one next-step/fullscreen lifecycle.
(() => {
 let active=null;
 const entries=[];
 let ytReady;
 function loadYouTube(){
  if(window.YT?.Player)return Promise.resolve();
  if(ytReady)return ytReady;
  ytReady=new Promise(resolve=>{
   const previous=window.onYouTubeIframeAPIReady;
   window.onYouTubeIframeAPIReady=()=>{previous?.();resolve();};
   const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';
   document.head.append(script);
  });
  return ytReady;
 }
 function pause(entry){
  if(entry.native)entry.media.pause();
  else entry.player?.pauseVideo?.();
 }
 function close(entry){
  if(!entry)return;
  entry.pending=false;pause(entry);
  if(active!==entry)return;
  active=null;entry.stage.classList.remove('is-presenting');
  document.body.classList.remove('media-window-mode');
  const full=document.fullscreenElement||document.webkitFullscreenElement;
  if(full===entry.stage){
   const result=document.exitFullscreen?.()||document.webkitExitFullscreen?.();
   result?.catch?.(()=>{});
  }
  document.querySelector('.reveal')?.focus({preventScroll:true});
 }
 function play(entry){
  if(active!==entry)return;
  if(entry.native){
   if(entry.media.ended)entry.media.currentTime=0;
   entry.media.play()?.catch(()=>{
    if(active===entry){entry.status.textContent='点击视频中的播放按钮继续';}
   });
  } else if(entry.ready){
   entry.pending=false;entry.player.playVideo();
  } else {
   entry.pending=true;entry.status.textContent='正在加载视频…';
  }
 }
 function start(entry){
  if(active&&active!==entry)close(active);
  active=entry;entry.status.textContent='';entry.stage.classList.add('is-presenting');
  // Start playback in the same user gesture, before fullscreen consumes activation.
  play(entry);
  const enter=entry.stage.requestFullscreen||entry.stage.webkitRequestFullscreen;
  const fallback=()=>{
   if(active===entry){document.body.classList.add('media-window-mode');entry.stage.focus({preventScroll:true});}
  };
  if(enter){
   try{
    const result=enter.call(entry.stage);
    Promise.resolve(result).then(()=>{
     if(active===entry)entry.stage.focus({preventScroll:true});
     else if(document.fullscreenElement===entry.stage)document.exitFullscreen()?.catch(()=>{});
    },fallback);
   }catch{fallback();}
  }else fallback();
 }
 for(const slide of document.querySelectorAll('section.lecture-slide')){
  const media=slide.querySelector('video,iframe[data-youtube-src]');
  const step=slide.querySelector('.video-play-step');
  if(!media||!step)continue;
  const stage=document.createElement('div');stage.className='lecture-media-stage';stage.tabIndex=-1;
  media.replaceWith(stage);stage.append(media);
  const bar=document.createElement('div');bar.className='lecture-media-controls';
  const status=document.createElement('span');status.setAttribute('role','status');
  const back=document.createElement('button');back.type='button';back.textContent='返回课件（Esc）';
  const next=document.createElement('button');next.type='button';next.textContent='下一页 →';
  bar.append(status,back,next);stage.append(bar);
  const entry={slide,media,step,stage,status,native:media.tagName==='VIDEO',ready:false,pending:false};entries.push(entry);
  back.addEventListener('click',()=>close(entry));
  next.addEventListener('click',()=>{close(entry);Reveal.next();});
  if(entry.native){
   media.tabIndex=0;media.removeAttribute('autoplay');
   media.addEventListener('ended',()=>close(entry));
   media.addEventListener('playing',()=>{status.textContent='';});
  }else{
   media.id=media.id||'lecture-youtube-'+slide.id;
   loadYouTube().then(()=>{
    entry.player=new YT.Player(media,{
     events:{
      onReady:()=>{entry.ready=true;if(entry.pending&&active===entry)play(entry);},
      onStateChange:event=>{
       if(event.data===YT.PlayerState.ENDED)close(entry);
       if(event.data===YT.PlayerState.PLAYING){status.textContent='';if(active!==entry&&Reveal.getCurrentSlide()!==slide)pause(entry);}
      },
      onAutoplayBlocked:()=>{if(active===entry)status.textContent='点击视频中的播放按钮继续';},
      onError:()=>{if(active===entry)status.textContent='视频加载失败，可返回课件使用原站链接';}
     }
    });
   });
  }
 }
 document.addEventListener('fullscreenchange',()=>{
  if(active&&document.fullscreenElement!==active.stage&&!document.body.classList.contains('media-window-mode'))close(active);
 });
 document.addEventListener('webkitfullscreenchange',()=>{
  if(active&&!document.webkitFullscreenElement&&!document.fullscreenElement&&!document.body.classList.contains('media-window-mode'))close(active);
 });
 document.addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
  if(active&&['ArrowRight','PageDown','ArrowLeft','PageUp','Escape'].includes(event.key)){
   event.preventDefault();event.stopImmediatePropagation();
   const entry=active;close(entry);
   if(['ArrowRight','PageDown'].includes(event.key))Reveal.next();
   else if(['ArrowLeft','PageUp'].includes(event.key))Reveal.prev();
  } else if(event.target.tagName==='VIDEO'){
   if(['ArrowLeft','ArrowRight'].includes(event.key))event.preventDefault();
   else if([' ','ArrowUp','ArrowDown'].includes(event.key))event.stopPropagation();
  }
 },true);
 const attach=()=>{
  if(!window.Reveal?.isReady())return setTimeout(attach,100);
  Reveal.on('fragmentshown',({fragment})=>{
   const entry=entries.find(e=>e.step===fragment);
   if(entry)start(entry);
   else if(fragment.classList.contains('video-play-step')){
    const link=fragment.closest('section').querySelector('.youtube-direct-link');
    if(link)window.open(link.href,'_blank','noopener');
   }
  });
  Reveal.on('fragmenthidden',({fragment})=>{const entry=entries.find(e=>e.step===fragment);if(entry)close(entry);});
  Reveal.on('slidechanged',({previousSlide,currentSlide})=>{
   const previous=entries.find(e=>e.slide===previousSlide);if(previous)close(previous);
   const entry=entries.find(e=>e.slide===currentSlide);
   if(entry){pause(entry);Reveal.slide(Reveal.getIndices().h,0,-1);}
  });
 };
 attach();
})();
