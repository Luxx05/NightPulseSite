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
  cards.forEach((c, i) => c.addEventListener('click', () => { if (i !== current) go(i); }));
  update();
})();
