// Print the live figure itself at its teaching defaults; no alternate image.
// Browser print events reach child documents even when opened via file://.
window.installFigurePrint = ({getState, setState, defaults, fit}) => {
  let saved = null;
  const enter = () => {
    if (saved === null) saved = getState();
    document.documentElement.classList.add('figure-printing');
    setState(defaults);
    fit();
  };
  const leave = () => {
    document.documentElement.classList.remove('figure-printing');
    if (saved !== null) { const state = saved; saved = null; setState(state); }
    fit();
  };
  addEventListener('beforeprint', enter);
  addEventListener('afterprint', leave);
  const media = matchMedia('print');
  media.addEventListener('change', event => event.matches ? enter() : leave());
  if (media.matches) enter();
};
