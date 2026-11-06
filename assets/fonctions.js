
(() => {
  const rows = [...document.querySelectorAll('.nx-r')], img = document.querySelector('.nx-phone img');
  if (!rows.length || !img) return;
  const phone = img.closest('.nx-phone'), tilt = document.querySelector('.nx-tilt'), ecran = document.querySelector('.nx-ecran');
  const fonc = document.querySelector('.nx-fonc'), mobile = matchMedia('(max-width: 700px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  addEventListener('load', () => rows.forEach(r => { const i = new Image(); i.src = r.dataset.src; }));
  let wanted = img.getAttribute('src'), current = rows.findIndex(r => r.classList.contains('on')), busy = null;
  // Change d'écran : l'iPhone pivote d'un quart de tour, l'écran change, il revient de face (sans animation si l'appareil
  // demande moins de mouvements).
  function swap(src) {
    wanted = src;
    if (reduce || !phone.animate) { img.src = src; return; }
    if (busy) return;
    const n = new Image(); n.src = src;
    busy = phone.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(88deg)' }], { duration: 170, easing: 'cubic-bezier(.4,0,1,1)' });
    busy.onfinish = () => {
      const show = () => {
        img.src = wanted;
        const back = phone.animate([{ transform: 'rotateY(-88deg)' }, { transform: 'rotateY(0deg)' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
        back.onfinish = () => { busy = null; if (img.getAttribute('src') !== wanted) swap(wanted); };
      };
      n.complete ? show() : (n.onload = n.onerror = show);
    };
  }
  function select(i) {
    if (i === current) return;
    current = i;
    const r = rows[i];
    rows.forEach(x => { x.classList.toggle('on', x === r); x.setAttribute('aria-selected', x === r); });
    img.alt = r.dataset.alt;
    if (r.dataset.src !== wanted) swap(r.dataset.src);
  }
  rows.forEach((r, i) => r.addEventListener('click', () => select(i)));
  // Téléphone : la fonction juste sous l'iPhone devient active en faisant défiler, et l'iPhone s'incline doucement.
  let ticking = false;
  function onScroll() {
    ticking = false;
    if (!mobile.matches) { tilt.style.transform = ''; return; }
    const line = ecran.getBoundingClientRect().bottom + (innerHeight - ecran.getBoundingClientRect().bottom) * 0.28;
    let k = 0;
    rows.forEach((r, i) => { if (r.getBoundingClientRect().top < line) k = i; });
    select(k);
    if (!reduce) {
      const b = fonc.getBoundingClientRect(), p = Math.max(0, Math.min(1, (line - b.top) / b.height));
      tilt.style.transform = `rotateX(${(5 - p * 4).toFixed(2)}deg) rotateY(${((p - 0.5) * -22).toFixed(2)}deg)`;
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();
})();
