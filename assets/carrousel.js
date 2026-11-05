// Carrousel 3D des fonctions : glisser au doigt (défilement natif), flèches et points sur ordinateur, flèches du clavier.
// Chaque carte reçoit --d (écart au centre, en cartes) et --a (1 au centre, 0 à côté) : le style en tire la rotation 3D.
(() => {
  const track = document.querySelector('.cf-track'); if (!track) return;
  const cards = [...track.children], dots = [...document.querySelectorAll('.cf-dots .dot')];
  const prev = document.querySelector('.cf-nav.prev'), next = document.querySelector('.cf-nav.next');
  let current = 0, pending = false;
  const step = () => cards[1].offsetLeft - cards[0].offsetLeft;
  function update() {
    pending = false;
    const mid = track.scrollLeft + track.clientWidth / 2, s = step();
    cards.forEach((c, i) => {
      const d = Math.max(-2, Math.min(2, (c.offsetLeft + c.offsetWidth / 2 - mid) / s));
      c.style.setProperty('--d', d.toFixed(3));
      c.style.setProperty('--a', Math.max(0, 1 - Math.abs(d)).toFixed(3));
    });
    current = Math.max(0, Math.min(cards.length - 1, Math.round((mid - cards[0].offsetLeft - cards[0].offsetWidth / 2) / s)));
    dots.forEach((b, i) => b.classList.toggle('on', i === current));
    if (prev) prev.disabled = current === 0;
    if (next) next.disabled = current === cards.length - 1;
  }
  const go = i => { const c = cards[Math.max(0, Math.min(cards.length - 1, i))];
    track.scrollTo({ left: c.offsetLeft + c.offsetWidth / 2 - track.clientWidth / 2, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
  track.addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  if (prev) prev.addEventListener('click', () => go(current - 1));
  if (next) next.addEventListener('click', () => go(current + 1));
  dots.forEach((b, i) => b.addEventListener('click', () => go(i)));
  track.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); } });
  // Souris (ordinateur) : on attrape les cartes et on les fait glisser ; au lâcher, la plus proche se centre
  // (en tenant compte de l'élan). Le doigt et le pavé tactile gardent le défilement natif.
  let drag = null, moved = false;
  track.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: track.scrollLeft, t: performance.now(), v: 0 }; moved = false;
    track.classList.add('drag');
  });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 4) moved = true;
    const now = performance.now(), left = drag.left - dx;
    drag.v = (left - track.scrollLeft) / Math.max(1, now - drag.t); drag.t = now;
    track.scrollLeft = left;
  });
  addEventListener('pointerup', () => {
    if (!drag) return;
    const s = step(), mid = track.scrollLeft + track.clientWidth / 2 + drag.v * 220;
    track.classList.remove('drag'); drag = null;
    go(Math.round((mid - cards[0].offsetLeft - cards[0].offsetWidth / 2) / s));
  });
  track.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
  track.addEventListener('dragstart', e => e.preventDefault());
  cards.forEach((c, i) => c.addEventListener('click', () => { if (i !== current) go(i); }));
  update();
})();
