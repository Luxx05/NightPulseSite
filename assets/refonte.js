// Accueil (refonte du 13/11/2026) : le Halo commande les feux, les shows se lisent comme une partition, la voiture change
// de place dans la page et accompagne le défilement, les cartes se posent en profondeur. Rien ne bloque le défilement, et
// tout mouvement s'arrête si la personne a demandé moins d'animations.
(() => {
  const root = document.documentElement, D = window.__demo;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, p = document) => p.querySelector(s), $$ = (s, p = document) => [...p.querySelectorAll(s)];
  const LIGHTS = {"low": ["Croisement", "#0a84ff"], "high": ["Route", "#4da3ff"], "drl": ["Feux de jour", "#ffd60a"], "inside": ["Intérieur", "#bfd9ff"], "indL": ["Clignotant gauche", "#ff9f0a"], "indR": ["Clignotant droit", "#ff9f0a"], "tail": ["Feux arrière", "#ff453a"], "brake": ["Stop", "#ff453a"], "reverse": ["Recul", "#e9e9ee"], "hazard": ["Warning", "#ff9f0a"]};
  let manual = false;   // la personne a tourné la voiture ou touché un feu : le défilement ne la fait plus tourner ici
  root.classList.add('js-rf');
  if (window.__car3dState !== 'ready' && window.__car3dState !== 'loading') root.classList.add('sans3d');
  addEventListener('car3d-fail', () => root.classList.add('sans3d'));

  // Cartes qui se posent (une fois, en entrant dans l'écran)
  const rev = $$('.rf-rev');
  if ('IntersectionObserver' in window && !calm) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vu'); io.unobserve(e.target); } }),
      { rootMargin: '0px 0px -7% 0px', threshold: .06 });
    rev.forEach(e => io.observe(e));
  } else rev.forEach(e => e.classList.add('vu'));

  // Le Halo à plat : chaque part actionne la pastille (cachée) du même feu, comme l'anneau au sol de la voiture 3D
  const nom = $('.rf-halo-nom');
  let nomT = 0;
  $$('.rf-halo [data-l]').forEach(p => {
    const go = () => {
      const b = $('.rf-pads .pbtn[data-l="' + p.dataset.l + '"]');
      if (!b) return;
      b.click();
      if (nom) { nom.textContent = p.getAttribute('aria-label'); nom.classList.add('on'); clearTimeout(nomT); nomT = setTimeout(() => nom.classList.remove('on'), 1500); }
    };
    p.addEventListener('click', go);
    p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.pbtn[data-l], .seg360')) manual = true; }, true);
  document.addEventListener('car360-lache', e => { if (e.detail && e.detail.tourne) manual = true; });

  // Les shows : boutons, partition, tête de lecture
  const ORDER = ['high', 'low', 'indL', 'indR', 'inside', 'brake', 'reverse', 'tail'];
  const part = $('.rf-part'), leg = $('.rf-leg');
  let sel = 'quatre', cols = [], head = -1;
  function drawPart() {
    if (!part || !D || !D.shows[sel]) return;
    const s = D.shows[sel], rows = ORDER.filter(k => s.rows.includes(k)), n = s.steps.length;
    part.style.setProperty('--n', n);
    part.innerHTML = rows.map(k => '<span>' + LIGHTS[k][0] + '</span>' + s.steps.map((st, i) =>
      '<i' + (st[1].includes(k) ? ' class="x"' : '') + ' style="--c:' + LIGHTS[k][1] + '"></i>').join('')).join('');
    const cells = $$('i', part);
    cols = Array.from({ length: n }, (_, i) => cells.filter((c, j) => j % n === i));
    head = -1;
    if (leg) leg.textContent = (s.nom === s.style ? s.nom : s.nom + ' · ' + s.style) + ' · ' + s.bpm + ' BPM · 2 mesures, une case par demi-temps';
  }
  const mark = i => { if (head >= 0 && cols[head]) cols[head].forEach(c => c.classList.remove('t')); head = i; if (i >= 0 && cols[i]) cols[i].forEach(c => c.classList.add('t')); };
  const chips = $$('.rf-chip[data-show]');
  chips.forEach(b => b.addEventListener('click', () => {
    if (!D) return;
    const n = b.dataset.show;
    if (D.playing() === n) { D.stop(); return; }
    if (D.shows[n] && D.shows[n].rows && n !== sel) { sel = n; drawPart(); }
    D.start(n);
  }));
  function sync(d) {
    const on = new Set(d.on);
    chips.forEach(b => { const v = d.playing === b.dataset.show; b.classList.toggle('on', v); b.setAttribute('aria-pressed', v); });
    $$('.rf-halo [data-l]').forEach(p => { const v = on.has(p.dataset.l) || (p.dataset.l !== 'hazard' && /^ind/.test(p.dataset.l) && on.has('hazard'));
      p.classList.toggle('on', v); p.setAttribute('aria-pressed', v); });
    if (!d.playing) mark(-1);
    else if (D.shows[d.playing].rows && d.playing !== sel) { sel = d.playing; drawPart(); }
  }
  addEventListener('demo-change', e => sync(e.detail));
  addEventListener('demo-step', e => { if (e.detail.name === sel) mark(e.detail.i); });
  drawPart();
  if (D) sync({ on: D.get(), playing: D.playing() });

  // Ta BMW est-elle compatible ?
  const series = $$('.rf-series button'), rep = $$('.rf-rep');
  series.forEach((b, i) => b.addEventListener('click', () => {
    series.forEach((x, j) => { x.classList.toggle('on', i === j); x.setAttribute('aria-pressed', i === j); });
    rep.forEach((x, j) => { x.hidden = i !== j; });
  }));

  // La voiture : une seule, qui passe d'un emplacement à l'autre (hors de l'écran, sans à-coup) et tourne un peu avec
  // le défilement. Elle reste manipulable au doigt : dès qu'on la tourne ou qu'on touche un feu, le défilement la laisse.
  const stage = $('.rf .stage'), slots = $$('.rf-slot');
  if (!stage || !slots.length) return;
  let cur = stage.parentNode, tick = 0, saved = null;
  const car = () => window.__car360;
  const angle = s => { const r = s.getBoundingClientRect();
    const p = Math.max(-1, Math.min(1, (innerHeight / 2 - (r.top + r.height / 2)) / innerHeight));
    return +s.dataset.a + (calm ? 0 : p * +s.dataset.swing); };
  function place(s) {
    stage.classList.add('rf-out');
    s.append(stage); cur = s; manual = false;
    const c = car();
    if (c) c.set(angle(s));
    if (D && !D.playing()) {
      if (s.dataset.feux) { if (!saved) saved = D.get(); D.set(s.dataset.feux.split(' ')); }
      else if (saved) { D.set(saved); saved = null; }
    }
    requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove('rf-out')));
  }
  function frame() {
    tick = 0;
    const vh = innerHeight;
    let best = cur, bd = Infinity;
    for (const s of slots) { const r = s.getBoundingClientRect(); if (!r.width) continue;
      const d = Math.abs(r.top + r.height / 2 - vh / 2); if (d < bd) { bd = d; best = s; } }
    const r = cur.getBoundingClientRect(), seen = r.bottom > -30 && r.top < vh + 30;
    if (best !== cur && !seen) place(best);
    const c = car();
    if (c && c.to && !calm && !manual && seen) c.to(angle(cur));
  }
  const ask = () => { if (!tick) tick = requestAnimationFrame(frame); };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  ask();
})();
