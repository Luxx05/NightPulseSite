// Voiture 360° de la page d'accueil : on la fait tourner au doigt / à la souris, feux allumés sous tous les angles.
// Images : assets/car360/<pc|tel>/aNNN.webp (voiture éteinte) + aNNN-feux.webp (calques des feux, additionnés).
// Chargement : vue avant d'abord, puis les angles voisins, le reste en arrière-plan. Connexion lente / économie de
// données : un angle sur deux. Dessin seulement quand quelque chose change, pause hors écran. En cas de problème,
// les deux photos d'origine restent affichées.
(() => {
  const stage = document.querySelector('.stage');
  const theme = document.documentElement.dataset.theme;
  if (!stage || !window.fetch || (theme && theme !== 'aucun')) return;   // thèmes de saison : décor sur les photos
  const cvs = document.createElement('canvas'), ctx = cvs.getContext('2d');
  if (!ctx) return;
  const BASE = stage.dataset.car360 || 'assets/car360/';
  const conn = navigator.connection || {};
  const slow = conn.saveData || /2g/.test(conn.effectiveType || '');
  const size = Math.min(innerWidth, screen.width || innerWidth) < 700 ? 'tel' : 'pc';
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const lamps = [...stage.querySelectorAll('.lamp')];
  const lamp = id => { const l = lamps.find(x => x.dataset.id === id); return !l || !l.classList.contains('on') ? 0 : l.classList.contains('dim') ? .3 : 1; };
  // Pastilles du site → calques du rendu (gauche / droite = côtés de la voiture)
  const target = () => {
    const t = {
      drl_G: lamp('f:drl-screenRight'), drl_D: lamp('f:drl-screenLeft'),
      low: Math.max(lamp('f:low-screenLeft'), lamp('f:low-screenRight')),
      high: Math.max(lamp('f:high-screenLeft'), lamp('f:high-screenRight')),
      indL: Math.max(lamp('f:indicator-screenRight'), lamp('r:indicator-screenLeft')),
      indR: Math.max(lamp('f:indicator-screenLeft'), lamp('r:indicator-screenRight')),
      tail_G: lamp('r:tail-screenLeft'), tail_D: lamp('r:tail-screenRight'),
      brake: lamp('r:brake'),
      reverse: Math.max(lamp('r:reverse-screenLeft'), lamp('r:reverse-screenRight')),
      inside: Math.max(lamp('f:interior'), lamp('r:interior')),
    };
    if (t.brake) { t.tail_G = Math.max(t.tail_G, .3 + .7 * t.brake); t.tail_D = Math.max(t.tail_D, .3 + .7 * t.brake); }   // le stop passe par les feux arrière
    t.plaque = Math.max(t.tail_G, t.tail_D) > 0 ? 1 : 0;
    return t;
  };
  let M, angles, step, frames = {}, level = {}, want = {};
  let mark = () => {};
  let ang = 0, vel = 0, goal = 0, dragging = false, dirty = true, visible = true, raf = 0, last = 0;

  const load = src => new Promise((ok, ko) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = ko; i.src = src; });
  async function fetchAngle(a) {
    if (frames[a]) return frames[a];
    const p = BASE + size + '/a' + String(a).padStart(3, '0');
    const lit = M.tailles[size].feux[a] || {};
    const [off, feux] = await Promise.all([load(p + '.webp?v=' + M.v), Object.keys(lit).length ? load(p + '-feux.webp?v=' + M.v) : null]);
    if (off.decode) await off.decode().catch(() => {});
    return (frames[a] = { off, feux: feux && glow(feux), lit });
  }
  // Calques des feux : fond noir → transparent (opacité = luminosité), sinon additionner les rectangles sur la zone
  // transparente autour de la voiture les ferait apparaître en noir. Fait une fois par angle, au chargement.
  function glow(img) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const m = Math.max(p[i], p[i + 1], p[i + 2]);
      if (m) { const k = 255 / m; p[i] *= k; p[i + 1] *= k; p[i + 2] *= k; }
      p[i + 3] = m;
    }
    x.putImageData(d, 0, 0);
    return c;
  }
  // Angle affiché le plus proche qui est déjà chargé
  const near = a => { for (let d = 0; d <= 180; d += step) for (const s of [1, -1]) { const k = ((a + s * d) % 360 + 360) % 360; if (frames[k]) return frames[k]; } return null; };

  function draw() {
    const [w, h] = M.tailles[size].taille;
    ctx.clearRect(0, 0, w, h);
    const a = ((ang % 360) + 360) % 360, a0 = Math.floor(a / step) * step, f = (a - a0) / step;
    const A = near(a0), B = frames[(a0 + step) % 360] || A;
    if (!A) return;
    const pass = (F, alpha, on) => {
      ctx.globalCompositeOperation = on ? 'lighter' : 'source-over';
      if (!on) { ctx.globalAlpha = alpha; ctx.drawImage(F.off, 0, 0); return; }
      if (!F.feux) return;
      for (const g in F.lit) {
        const k = (level[g] || 0) * alpha;
        if (k < .01) continue;
        ctx.globalAlpha = Math.min(1, k);
        for (const [sx, sy, sw, sh, dx, dy] of F.lit[g]) ctx.drawImage(F.feux, sx, sy, sw, sh, dx, dy, sw, sh);
      }
    };
    pass(A, 1, false);
    if (B !== A && f > .01) pass(B, f, false);       // fondu entre deux angles voisins
    pass(A, B === A ? 1 : 1 - f, true);
    if (B !== A) pass(B, f, true);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  function tick(t) {
    raf = 0;
    const dt = Math.min(.05, last ? (t - last) / 1000 : .016); last = t;
    let moving = false;
    if (!dragging) {
      if (goal !== null) { const d = goal - ang; vel += (d * 90 - vel * 19) * dt; if (Math.abs(d) < .05 && Math.abs(vel) < .5) { ang = goal; vel = 0; } else moving = true; }
      else if (Math.abs(vel) > 4) { vel *= Math.pow(.04, dt); moving = true; }   // élan au lâcher
      else { goal = Math.round(ang / step) * step; moving = true; }
      ang += vel * dt;
    }
    want = target();
    for (const g in want) {   // fondu court des feux (~120 ms, comme les calques du site)
      const c = level[g] || 0, d = want[g] - c;
      if (Math.abs(d) > .01) { level[g] = c + d * Math.min(1, dt * 22); moving = true; } else level[g] = want[g];
    }
    if (moving || dirty) { draw(); mark(); dirty = false; }
    if (moving && visible) raf = requestAnimationFrame(tick); else last = 0;
  }
  const wake = () => { dirty = true; if (!raf && visible) raf = requestAnimationFrame(tick); };
  const turn = to => { const a = ((ang % 360) + 360) % 360; let d = to - a; if (d > 180) d -= 360; if (d < -180) d += 360;
    if (calm.matches) { ang += d; goal = ang; vel = 0; } else goal = ang + d; wake(); };

  async function start() {
    M = await (await fetch(BASE + 'manifest.json', { cache: 'force-cache' })).json();
    step = slow ? 10 : M.pas;
    angles = M.angles.filter(a => a % step === 0);
    const [w, h] = M.tailles[size].taille;
    cvs.width = w; cvs.height = h;
    await fetchAngle(0);
    // La vitrine passe en 360° : les photos restent dans la page (la démo y lit les feux allumés) mais sont cachées.
    const box = document.createElement('div'); box.className = 'car360';
    box.setAttribute('role', 'img'); box.setAttribute('aria-label', 'Voiture en 3D, à faire tourner');
    box.append(cvs);
    const seg = document.createElement('div'); seg.className = 'modeseg seg360'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Vue');
    seg.innerHTML = '<button type="button" class="on" data-a="0">Avant</button><button type="button" data-a="180">Arrière</button>';
    const credit = document.createElement('div'); credit.className = 'credit360';
    credit.innerHTML = 'Modèle 3D : <a href="' + M.credit.lien + '" rel="noopener" target="_blank">' + M.credit.auteur + '</a> · CC BY';
    stage.querySelectorAll('.car').forEach(c => { c.hidden = true; });
    stage.classList.add('is360');
    stage.prepend(box); stage.prepend(seg); stage.append(credit);
    const segs = [...seg.querySelectorAll('button')];
    let shown = null;
    mark = () => { const a = ((ang % 360) + 360) % 360, back = a > 90 && a < 270; if (back === shown) return; shown = back;
      segs.forEach((b, i) => { b.classList.toggle('on', (i === 1) === back); b.setAttribute('aria-pressed', (i === 1) === back); }); };
    segs.forEach(b => b.addEventListener('click', () => turn(+b.dataset.a)));
    // Geste : glisser pour tourner (un tour = deux largeurs), élan + ressort au lâcher
    let px = 0, pt = 0, id = null;
    box.addEventListener('pointerdown', e => { id = e.pointerId; box.setPointerCapture(id); dragging = true; goal = null; px = e.clientX; pt = e.timeStamp; vel = 0; box.classList.add('grab'); });
    box.addEventListener('pointermove', e => { if (e.pointerId !== id) return;
      const k = 180 / box.clientWidth, dx = e.clientX - px, dt = Math.max(1, e.timeStamp - pt) / 1000;
      ang -= dx * k; vel = vel * .6 + (-dx * k / dt) * .4; px = e.clientX; pt = e.timeStamp; mark(); wake(); });
    const up = e => { if (e.pointerId !== id) return; id = null; dragging = false; box.classList.remove('grab');
      if (calm.matches) vel = 0; vel = Math.max(-900, Math.min(900, vel)); goal = null; mark(); wake(); };
    box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
    // Toucher un feu qu'on ne voit que d'un côté tourne la voiture vers lui
    const SIDE = { drl: 0, low: 0, high: 0, fog: 0, tail: 180, brake: 180, reverse: 180, rfog: 180 };
    document.querySelectorAll('.pbtn[data-l]').forEach(b => b.addEventListener('click', () => setTimeout(() => {
      const s = SIDE[b.dataset.l]; if (s === undefined || !b.classList.contains('on')) return;
      const a = ((ang % 360) + 360) % 360, back = a > 90 && a < 270;
      if (back !== (s === 180)) turn(s);
    }, 0)));
    new MutationObserver(wake).observe(stage, { subtree: true, attributes: true, attributeFilter: ['class'] });
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) wake(); }).observe(box);
    window.__car360 = { turn, set: a => { ang = goal = a; vel = 0; mark(); wake(); }, loaded: () => Object.keys(frames).length, total: angles.length };
    wake();
    // Le reste en arrière-plan : angles voisins de la vue avant d'abord, puis l'arrière, 3 à la fois
    const order = angles.slice().sort((a, b) => Math.min(a, 360 - a) - Math.min(b, 360 - b));
    let i = 0;
    const next = () => { if (i >= order.length) return; const a = order[i++];
      fetchAngle(a).then(() => { dirty = true; wake(); }, () => {}).finally(() => (window.requestIdleCallback || setTimeout)(next)); };
    for (let k = 0; k < 3; k++) next();
  }
  start().catch(() => {});   // photos d'origine en secours
})();
