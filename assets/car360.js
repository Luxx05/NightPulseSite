// Voiture 360° de la page d'accueil : on la fait tourner au doigt / à la souris, feux allumés sous tous les angles.
// Images : assets/car360/<pc|tel>/aNNN.webp (voiture éteinte) + aNNN-feux.webp (calques des feux, additionnés).
// Chargement : vue avant d'abord, puis les angles voisins, le reste en arrière-plan (décodage hors du fil principal).
// Connexion lente / économie de données : petites images, un angle sur deux. Dessin seulement quand quelque chose
// change, pause hors écran. Cadrage au plus près de la voiture à chaque angle (elle remplit la vitrine de face comme
// de profil). En cas de problème, les deux photos d'origine restent affichées.
(() => {
  const stage = document.querySelector('.stage');
  const theme = document.documentElement.dataset.theme;
  if (!stage || !window.fetch || (theme && theme !== 'aucun')) return;   // thèmes de saison : décor sur les photos
  const conn = navigator.connection || {};
  const slow = conn.saveData || /2g/.test(conn.effectiveType || '');
  const size = slow ? 'tel' : 'pc';
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
  // Deux toiles : la voiture (transparente, sur le fond de la vitrine) et la lumière des feux (fond noir, mêlée en
  // « screen » par-dessus : le noir ne change rien, la lumière s'ajoute ; aucun calcul pixel par pixel).
  const car = document.createElement('canvas'), light = document.createElement('canvas');
  const cx = car.getContext('2d'), lx = light.getContext('2d', { alpha: false });
  if (!cx || !lx) return;
  let M, step, scale = 1, frames = {}, level = {}, mark = () => {};
  let ang = 0, vel = 0, goal = 0, dragging = false, dirty = true, visible = true, raf = 0, last = 0, W = 0, H = 0;

  const bitmap = async src => {
    const r = await fetch(src, { cache: 'force-cache' });
    if (!r.ok) throw new Error(src);
    const b = await r.blob();
    if (window.createImageBitmap) return createImageBitmap(b);   // décodé en arrière-plan : pas d'à-coup en tournant
    const i = new Image(); i.src = URL.createObjectURL(b); await i.decode(); return i;
  };
  async function fetchAngle(a) {
    if (frames[a]) return frames[a];
    const p = 'assets/car360/' + size + '/a' + String(a).padStart(3, '0'), v = '?v=' + M.v;
    const lit = M.tailles[size].feux[a] || {};
    const [off, feux] = await Promise.all([bitmap(p + '.webp' + v), Object.keys(lit).length ? bitmap(p + '-feux.webp' + v) : null]);
    return (frames[a] = { off, feux, lit });
  }
  const norm = a => ((a % 360) + 360) % 360;
  // Angle déjà chargé le plus proche
  const near = a => { for (let d = 0; d <= 180; d += step) for (const s of [1, -1]) { const k = norm(a + s * d); if (frames[k]) return frames[k]; } return null; };
  // Cadrage : contour de la voiture interpolé entre deux angles, mis à l'échelle pour remplir la vitrine
  function camera(a) {
    const a0 = Math.floor(a / M.pas) * M.pas, f = (a - a0) / M.pas;
    const b0 = M.boites[a0], b1 = M.boites[norm(a0 + M.pas)];
    const b = b0.map((v, i) => v + (b1[i] - v) * f);
    const narrow = W < H * 1.6;
    const k = Math.min(W * (narrow ? .9 : .8) / (b[2] - b[0]), H * (narrow ? .74 : .8) / (b[3] - b[1]));
    // roues posées au même endroit quel que soit l'angle (pas de saut vertical), voiture centrée
    return { k, x: W / 2 - (b[0] + b[2]) / 2 * k, y: H * (narrow ? .8 : .88) - b[3] * k };
  }
  function draw() {
    if (!W) return;
    const a = norm(ang), a0 = Math.floor(a / step) * step, f = (a - a0) / step;
    const A = near(a0), B = frames[norm(a0 + step)] || A;
    if (!A) return;
    const c = camera(a), sk = c.k * scale;
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, W, H);
    lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalCompositeOperation = 'source-over'; lx.globalAlpha = 1; lx.fillStyle = '#000'; lx.fillRect(0, 0, W, H);
    for (const x of [cx, lx]) { x.setTransform(sk, 0, 0, sk, c.x, c.y); x.imageSmoothingQuality = 'high'; }
    cx.globalAlpha = 1; cx.drawImage(A.off, 0, 0);
    if (B !== A && f > .01) { cx.globalAlpha = f; cx.drawImage(B.off, 0, 0); }   // fondu entre deux angles voisins
    lx.globalCompositeOperation = 'lighter';
    const lights = (F, alpha) => {
      if (!F.feux) return;
      for (const g in F.lit) {
        const k = (level[g] || 0) * alpha;
        if (k < .01) continue;
        lx.globalAlpha = Math.min(1, k);
        for (const [sx, sy, sw, sh, dx, dy] of F.lit[g]) lx.drawImage(F.feux, sx, sy, sw, sh, dx, dy, sw, sh);
      }
    };
    lights(A, B === A ? 1 : 1 - f);
    if (B !== A) lights(B, f);
  }
  function tick(t) {
    raf = 0;
    const dt = Math.min(.05, last ? (t - last) / 1000 : .016); last = t;
    let moving = false;
    if (!dragging) {
      if (goal !== null) { const d = goal - ang; vel += (d * 90 - vel * 19) * dt; if (Math.abs(d) < .05 && Math.abs(vel) < .5) { ang = goal; vel = 0; } else moving = true; }
      else if (Math.abs(vel) > 8) { vel *= Math.pow(.12, dt); moving = true; }   // élan au lâcher
      else { goal = Math.round(ang / step) * step; moving = true; }
      ang += vel * dt;
    }
    const want = target();
    for (const g in want) {   // fondu court des feux (~120 ms, comme les calques du site)
      const c = level[g] || 0, d = want[g] - c;
      if (Math.abs(d) > .01) { level[g] = c + d * Math.min(1, dt * 22); moving = true; } else level[g] = want[g];
    }
    if (moving || dirty) { draw(); mark(); dirty = false; }
    if (moving && visible) raf = requestAnimationFrame(tick); else last = 0;
  }
  const wake = () => { dirty = true; if (!raf && visible) raf = requestAnimationFrame(tick); };
  const turn = to => { let d = to - norm(ang); if (d > 180) d -= 360; if (d < -180) d += 360;
    if (calm.matches) { ang += d; goal = ang; vel = 0; } else goal = ang + d; wake(); };

  async function start() {
    M = await (await fetch('assets/car360/manifest.json', { cache: 'no-cache' })).json();
    step = slow ? 10 : M.pas;
    scale = M.cadre[0] / M.tailles[size].taille[0];   // petites images : mêmes coordonnées que les grandes
    await fetchAngle(0);
    const box = document.createElement('div'); box.className = 'car360';
    box.setAttribute('role', 'img'); box.setAttribute('aria-label', 'Voiture en 3D, à faire tourner');
    light.className = 'lit'; box.append(car, light);
    const seg = document.createElement('div'); seg.className = 'seg360'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Vue');
    seg.innerHTML = '<button type="button" class="on" data-a="0">Avant</button><button type="button" data-a="180">Arrière</button>';
    stage.querySelectorAll('.car').forEach(c => { c.hidden = true; });
    stage.classList.add('is360');
    box.append(seg); stage.prepend(box);
    // Taille réelle à l'écran (netteté sur les écrans Retina)
    const fit = () => { const r = box.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2.5);
      const w = Math.round(r.width * d), h = Math.round(r.height * d);
      if (w && (w !== W || h !== H)) { W = car.width = light.width = w; H = car.height = light.height = h; dirty = true; draw(); } };
    fit(); new ResizeObserver(fit).observe(box);
    const segs = [...seg.querySelectorAll('button')];
    let shown = null;
    mark = () => { const a = norm(ang), back = a > 90 && a < 270; if (back === shown) return; shown = back;
      segs.forEach((b, i) => { b.classList.toggle('on', (i === 1) === back); b.setAttribute('aria-pressed', (i === 1) === back); }); };
    segs.forEach(b => b.addEventListener('click', e => { e.stopPropagation(); turn(+b.dataset.a); }));
    seg.addEventListener('pointerdown', e => e.stopPropagation());
    // Geste : glisser pour tourner (une largeur de vitrine = un demi-tour), élan + ressort au lâcher
    let px = 0, pt = 0, id = null;
    box.addEventListener('pointerdown', e => { id = e.pointerId; box.setPointerCapture(id); dragging = true; goal = null; px = e.clientX; pt = e.timeStamp; vel = 0; box.classList.add('grab'); });
    box.addEventListener('pointermove', e => { if (e.pointerId !== id) return;
      const k = 180 / box.clientWidth, dx = e.clientX - px, dt = Math.max(8, e.timeStamp - pt) / 1000;
      ang -= dx * k; vel = vel * .5 + (-dx * k / dt) * .5; px = e.clientX; pt = e.timeStamp; wake(); });
    const up = e => { if (e.pointerId !== id) return; id = null; dragging = false; box.classList.remove('grab');
      if (calm.matches || e.timeStamp - pt > 90) vel = 0;   // doigt arrêté avant de lâcher : pas d'élan
      vel = Math.max(-720, Math.min(720, vel)); goal = null; wake(); };
    box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
    // Toucher un feu qu'on ne voit que d'un côté tourne la voiture vers lui
    const SIDE = { drl: 0, low: 0, high: 0, fog: 0, tail: 180, brake: 180, reverse: 180, rfog: 180 };
    document.querySelectorAll('.pbtn[data-l]').forEach(b => b.addEventListener('click', () => setTimeout(() => {
      const s = SIDE[b.dataset.l]; if (s === undefined || !b.classList.contains('on')) return;
      const a = norm(ang), back = a > 90 && a < 270;
      if (back !== (s === 180)) turn(s);
    }, 0)));
    new MutationObserver(wake).observe(stage, { subtree: true, attributes: true, attributeFilter: ['class'] });
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) wake(); }).observe(box);
    window.__car360 = { turn, set: a => { ang = goal = a; vel = 0; wake(); }, loaded: () => Object.keys(frames).length, total: 360 / step };
    wake();
    // Le reste en arrière-plan : angles voisins de la vue avant d'abord (des deux côtés), 4 à la fois
    const order = M.angles.filter(a => a % step === 0).sort((a, b) => Math.min(a, 360 - a) - Math.min(b, 360 - b));
    let i = 0;
    const next = () => { if (i >= order.length) return; const a = order[i++];
      fetchAngle(a).then(() => { if (Math.abs(((a - norm(ang) + 540) % 360) - 180) <= step) wake(); }, () => {}).finally(next); };
    for (let k = 0; k < 4; k++) next();
  }
  start().catch(() => {});   // photos d'origine en secours
})();
