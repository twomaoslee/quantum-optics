/* Keep the current chapter entry visible without moving the article or focus. */
(() => {
  const toc = document.querySelector('.course-reading-toc');
  const menu = document.querySelector('.course-reading-menu');
  const bar = document.querySelector('.course-reading-bar');
  const article = document.querySelector('#quarto-document-content');
  const links = [...toc.querySelectorAll('a')];
  const mobileLinks = [...menu.querySelectorAll('a')];
  const sections = links.map(link => document.getElementById(decodeURIComponent(link.hash.slice(1))));
  let active = -1;
  let frame = 0;
  let recenter = false;

  function mark(list, index) {
    list.forEach((link, i) => {
      if (i === index) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function reveal(scroller, link) {
    if (!scroller.clientHeight) return;
    const box = scroller.getBoundingClientRect();
    const item = link.getBoundingClientRect();
    const inset = Math.min(26, scroller.clientHeight / 4);
    if (item.top < box.top + inset || item.bottom > box.bottom - inset) {
      scroller.scrollTop += (item.top + item.bottom - box.top - box.bottom) / 2;
    }
  }

  function update() {
    frame = 0;
    const line = Math.max(0, bar.getBoundingClientRect().bottom) + 42;
    let index = 0;
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top > line) break;
      index = i;
    }
    const page = document.scrollingElement;
    if (page.scrollHeight > window.innerHeight &&
        page.scrollTop + window.innerHeight >= page.scrollHeight - 2) {
      index = links.length - 1;
    }
    if (index === active && !recenter) return;
    active = index;
    recenter = false;
    mark(links, index);
    mark(mobileLinks, index);
    reveal(toc, links[index]);
    if (menu.open) reveal(menu.querySelector('nav'), mobileLinks[index]);
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  function refresh() {
    document.body.style.setProperty('--notes-top', bar.offsetHeight + 'px');
    recenter = true;
    schedule();
  }

  function jump(event) {
    const link = event.target.closest('a');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const list = menu.contains(link) ? mobileLinks : links;
    const section = sections[list.indexOf(link)];
    const heading = section.matches('h2,h3,h4') ? section : section.firstElementChild;
    event.preventDefault();
    menu.open = false;
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    heading.setAttribute('tabindex', '-1');
    heading.focus({preventScroll: true});
    heading.scrollIntoView({block: 'start', behavior: 'instant'});
    refresh();
  }
  toc.addEventListener('click', jump);
  menu.addEventListener('click', jump);
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
  window.addEventListener('scroll', schedule, {passive: true});
  ['resize', 'hashchange', 'pageshow', 'load'].forEach(type => window.addEventListener(type, refresh));
  document.addEventListener('toggle', refresh, true);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(refresh);
    observer.observe(article);
    observer.observe(bar);
  }
  refresh();
})();
