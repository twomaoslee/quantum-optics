document.querySelectorAll('.l02-lab iframe').forEach(frame=>{
  const measure=()=>frame.contentWindow?.postMessage({type:'l02-measure'},'*');
  frame.addEventListener('load',measure);
  window.addEventListener('resize',measure);
  frame.closest('details')?.addEventListener('toggle',measure);
});
window.addEventListener('message',e=>{
  if(e.data?.type!=='l02-height'||!Number.isFinite(e.data.height))return;
  const frame=[...document.querySelectorAll('.l02-lab iframe')].find(f=>f.contentWindow===e.source);
  if(frame&&!frame.closest('.l02-slide-lab'))frame.style.height=Math.min(2400,Math.max(200,e.data.height))+'px';
});
document.querySelectorAll('.l02-video video').forEach(video=>{
  video.addEventListener('play',()=>document.querySelectorAll('.l02-video video').forEach(other=>{if(other!==video)other.pause()}));
  video.closest('details')?.addEventListener('toggle',e=>{if(!e.currentTarget.open)video.pause()});
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('.l02-video video').forEach(v=>v.pause())});
