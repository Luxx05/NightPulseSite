// Carrousel 3D des fonctions (façon « cover flow ») : doigt = défilement natif aimanté ; souris = attraper-glisser avec
// élan, molette (un cran = une carte) ; flèches, points, clavier. La 3D est recalculée à chaque image :
// rotation, profondeur, rapprochement des cartes lointaines, reflet qui glisse.
(() => {
  const track = document.querySelector('.cf-track'); if (!track) return;
  const cards = [...track.children], faces = cards.map(c => c.querySelector('.cf-face')), dots = [...document.querySelectorAll('.cf-dots .dot')];
  const prev = document.querySelector('.cf-nav.prev'), next = document.querySelector('.cf-nav.next');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pos = track.scrollLeft, loop = 0, glideId = 0, current = -1;
  const step = () => cards[1].offsetLeft - cards[0].offsetLeft;
  const centerOf = i => cards[i].offsetLeft + cards[i].offsetWidth / 2 - track.clientWidth / 2;
  const maxLeft = () => track.scrollWidth - track.clientWidth;
  const indexAt = left => Math.max(0, Math.min(cards.length - 1, Math.round((left - centerOf(0)) / step())));

  function paint() {
    const s = step(), base = centerOf(0);
    cards.forEach((c, i) => {
      const d = (base + i * s - pos) / s, ad = Math.min(Math.abs(d), 3), sg = Math.sign(d);
      const f = faces[i];
      if (reduce) return;
      const near = Math.min(ad, 1), far = Math.max(ad - 1, 0);
      const tx = -sg * (near * 0.2 + far * 0.42) * s;          // les cartes lointaines se rapprochent (pile)
      const tz = -(near * 190 + far * 90);                      // profondeur
      const ry = -sg * (near * 50 + far * 6);                   // rotation
      f.style.transform = `perspective(1400px) translate3d(${tx.toFixed(1)}px,0,${tz.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg)`;
      f.style.opacity = (1 - Math.min(ad, 2.4) * 0.27).toFixed(3);
      c.style.zIndex = 50 - Math.round(ad * 10);
      f.style.setProperty('--d', Math.max(-1.5, Math.min(1.5, d)).toFixed(3));
    });
    const i = indexAt(track.scrollLeft);
    if (i !== current) {
      current = i;
      dots.forEach((b, k) => b.classList.toggle('on', k === i));
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === cards.length - 1;
    }
  }
  // Une image par rafraîchissement de l'écran, calée sur la vraie position (sans retard : la carte au centre est
  // toujours bien de face).
  function frame() { pos = track.scrollLeft; paint(); loop = 0; }
  const wake = () => { if (!loop) loop = requestAnimationFrame(frame); };

  // Glissé animé (flèches, points, clavier, lâcher de la souris) : courbe douce « ease-out », aimant coupé pendant.
  function stopGlide() { if (glideId) { cancelAnimationFrame(glideId); glideId = 0; track.classList.remove('free'); } }
  function glide(to, ms) {
    stopGlide();
    to = Math.max(0, Math.min(maxLeft(), to));
    const from = track.scrollLeft, dist = Math.abs(to - from);
    if (reduce || dist < 1) { track.scrollLeft = to; wake(); return; }
    const dur = ms || Math.min(820, 380 + dist * 0.32), t0 = performance.now();
    track.classList.add('free');
    const run = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      track.scrollLeft = from + (to - from) * e;
      if (k < 1) glideId = requestAnimationFrame(run); else { glideId = 0; track.classList.remove('free'); }
      wake();
    };
    glideId = requestAnimationFrame(run);
  }
  const go = i => glide(centerOf(Math.max(0, Math.min(cards.length - 1, i))));

  track.addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', () => { pos = track.scrollLeft; paint(); });
  track.addEventListener('touchstart', stopGlide, { passive: true });
  if (prev) prev.addEventListener('click', () => go(current - 1));
  if (next) next.addEventListener('click', () => go(current + 1));
  dots.forEach((b, i) => b.addEventListener('click', () => go(i)));
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
  });

  // Souris : attraper et faire glisser, avec élan au lâcher.
  let drag = null, moved = false;
  track.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    stopGlide();
    drag = { x: e.clientX, left: track.scrollLeft, t: performance.now(), last: track.scrollLeft, v: 0 }; moved = false;
    track.classList.add('drag', 'free');
  });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 4) moved = true;
    track.scrollLeft = drag.left - dx;
    const now = performance.now(), dt = Math.max(1, now - drag.t);
    drag.v = drag.v * 0.6 + ((track.scrollLeft - drag.last) / dt) * 0.4;
    drag.t = now; drag.last = track.scrollLeft;
    wake();
  });
  addEventListener('pointerup', () => {
    if (!drag) return;
    const v = performance.now() - drag.t > 90 ? 0 : drag.v;  // arrêté avant de lâcher = pas d'élan
    let i = indexAt(track.scrollLeft + v * 260);
    const from = indexAt(drag.left);
    i = Math.max(from - 3, Math.min(from + 3, i));
    drag = null;
    track.classList.remove('drag');
    go(i);
  });
  track.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
  track.addEventListener('dragstart', e => e.preventDefault());
  cards.forEach((c, i) => c.addEventListener('click', () => { if (i !== current) go(i); }));

  // Molette de souris : un cran = une carte (les petits mouvements du pavé tactile restent au défilement normal) ;
  // au bout du carrousel, la page reprend la main.
  let wheelLock = 0;
  track.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const notch = e.deltaMode === 1 || (Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY));
    if (!notch) return;
    const dir = Math.sign(e.deltaY);
    if ((dir < 0 && current === 0) || (dir > 0 && current === cards.length - 1)) return;
    e.preventDefault();
    const now = performance.now();
    if (now < wheelLock) return;
    wheelLock = now + 260;
    go(current + dir);
  }, { passive: false });

  paint();
})();
