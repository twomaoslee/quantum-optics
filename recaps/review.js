/* Static recap: no student identity, storage, telemetry or API calls. */
const recapNavigation = document.querySelector('[data-recap-tabs]');
if (recapNavigation) {
  const tabs = [...recapNavigation.querySelectorAll('a')];
  const panels = tabs.map(tab => document.getElementById(tab.hash.slice(1)));
  recapNavigation.setAttribute('role', 'tablist');
  tabs.forEach((tab, index) => {
    const panel = panels[index];
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panel.id);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
  });

  function showPanel(index) {
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[i].hidden = !selected;
    });
  }

  function readHash() {
    const index = tabs.findIndex(tab => tab.hash === location.hash);
    const focusedInPanel = panels.some(panel => panel.contains(document.activeElement));
    showPanel(Math.max(index, 0));
    if (focusedInPanel) tabs[Math.max(index, 0)].focus({preventScroll: true});
    if (index >= 0) panels[index].scrollIntoView({block: 'start'});
  }

  recapNavigation.addEventListener('click', event => {
    const index = tabs.indexOf(event.target.closest('a'));
    if (index < 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const tab = tabs[index];
    if (location.hash !== tab.hash) history.pushState(null, '', tab.hash);
    showPanel(index);
    tab.focus({preventScroll: true});
    panels[index].scrollIntoView({block: 'start'});
  });

  recapNavigation.addEventListener('keydown', event => {
    const index = tabs.indexOf(event.target);
    if (index < 0) return;
    let next;
    switch (event.key) {
      case 'ArrowLeft': next = (index + tabs.length - 1) % tabs.length; break;
      case 'ArrowRight': next = (index + 1) % tabs.length; break;
      case 'Home': next = 0; break;
      case 'End': next = tabs.length - 1; break;
      case ' ':
        event.preventDefault();
        event.target.click();
        return;
      default: return;
    }
    event.preventDefault();
    tabs[next].focus();
  });

  addEventListener('hashchange', readHash);
  readHash();
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
