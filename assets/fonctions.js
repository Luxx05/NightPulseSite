
(() => {
  const rows = [...document.querySelectorAll('.nx-r')], img = document.querySelector('.nx-phone img');
  if (!rows.length || !img) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  addEventListener('load', () => rows.forEach(r => { const i = new Image(); i.src = r.dataset.src; }));
  let wanted = img.getAttribute('src');
  rows.forEach(r => r.addEventListener('click', () => {
    rows.forEach(x => { x.classList.toggle('on', x === r); x.setAttribute('aria-selected', x === r); });
    img.alt = r.dataset.alt;
    if (r.dataset.src !== wanted) {
      wanted = r.dataset.src;
      if (reduce) img.src = wanted;
      else { img.classList.add('out'); setTimeout(() => { const n = new Image(); n.onload = n.onerror = () => { img.src = wanted; img.classList.remove('out'); }; n.src = wanted; }, 160); }
    }
    const box = img.getBoundingClientRect();
    if (box.bottom < 60 || box.top > innerHeight - 60) img.closest('.nx-phone').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  }));
})();
