if(window.parent!==window){
  document.body.classList.add('embedded');
  const report=()=>parent.postMessage({type:'l02-height',height:Math.ceil(Math.max(document.querySelector('main').getBoundingClientRect().height,document.querySelector('main').scrollHeight))+4},'*');
  new ResizeObserver(report).observe(document.querySelector('main'));
  window.addEventListener('message',e=>{if(e.source===parent&&e.data?.type==='l02-measure')report()});
  window.addEventListener('load',report);
  window.addEventListener('resize',()=>requestAnimationFrame(report));
}
