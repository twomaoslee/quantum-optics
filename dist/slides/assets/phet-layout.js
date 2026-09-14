// Fit PhET's fixed 1024 x 680 legacy window without changing its runtime.
(() => {
  document.querySelectorAll('.phet-photoelectric').forEach(box => {
    const frame = box.querySelector('iframe');
    if (!frame) return;
    const fit = () => {
      const w = box.clientWidth, h = box.clientHeight;
      if (!w || !h) return;
      const scale = Math.min(w / 1024, h / 680);
      frame.style.transform = `scale(${scale})`;
      frame.style.left = `${(w - 1024 * scale) / 2}px`;
      frame.style.top = `${(h - 680 * scale) / 2}px`;
    };
    new ResizeObserver(fit).observe(box);
    fit();
  });
})();
