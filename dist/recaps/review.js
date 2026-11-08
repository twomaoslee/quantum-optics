/* Static recap: no student identity, storage, telemetry or API calls. */
const recapNavigation = document.querySelector('.section-nav');
if (recapNavigation) {
  const links = [...recapNavigation.querySelectorAll('a')];
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));
  let current = links[0];
  let frame = 0;

  function updateCurrentSection() {
    frame = 0;
    // Switch when the next section reaches the reading area below the sticky links.
    const readingLine = recapNavigation.offsetHeight + 24;
    let index = sections.length - 1;
    while (index > 0 && sections[index].getBoundingClientRect().top > readingLine) {
      index--;
    }
    const next = links[index];
    if (next === current) return;
    current.removeAttribute('aria-current');
    next.setAttribute('aria-current', 'location');
    current = next;
  }

  function scheduleUpdate() {
    if (!frame) frame = requestAnimationFrame(updateCurrentSection);
  }

  addEventListener('scroll', scheduleUpdate, {passive: true});
  addEventListener('hashchange', scheduleUpdate);
  new ResizeObserver(scheduleUpdate).observe(recapNavigation.closest('main'));
  scheduleUpdate();
}

document.querySelectorAll('[data-tex]').forEach(node => {
  katex.render(node.dataset.tex, node, {displayMode:node.dataset.display==='true',throwOnError:true});
});
document.querySelectorAll('.round-tab').forEach(button => button.addEventListener('click', () => {
  const section=button.closest('.record');
  section.querySelectorAll('.round-tab').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  section.querySelectorAll('.round-panel').forEach(p=>p.hidden=p.id!==button.dataset.panel);
}));
document.querySelectorAll('.self-check').forEach(form => {
  const submit=form.querySelector('.check-submit'), reset=form.querySelector('.check-reset');
  const feedback=form.querySelector('.check-feedback'), status=form.querySelector('.check-status');
  form.addEventListener('change',()=>submit.disabled=!form.querySelector('input:checked'));
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const selected=form.querySelector('input:checked');if(!selected)return;
    status.textContent=selected.value===form.dataset.answer?'回答正确。':'请结合下方解答再核对。';
    form.querySelectorAll('input').forEach(input=>{
      input.disabled=true;
      input.closest('label').classList.toggle('is-correct',input.value===form.dataset.answer);
      input.closest('label').classList.toggle('is-incorrect',input.checked&&input.value!==form.dataset.answer);
    });
    feedback.hidden=false;reset.hidden=false;submit.disabled=true;
  });
  reset.addEventListener('click',()=>{
    form.reset();form.querySelectorAll('input').forEach(input=>input.disabled=false);
    form.querySelectorAll('label').forEach(label=>label.classList.remove('is-correct','is-incorrect'));
    feedback.hidden=true;reset.hidden=true;submit.disabled=true;status.textContent='选择后可查看解答';
  });
});
