// Accueil qui raconte une histoire au défilement (aperçu validé apercu/pages/site-recit.mp4) : la voiture 360° (rendu
// Blender) reste au centre, s'allume, tourne de face vers le profil puis vers l'arrière ; les pastilles arrivent à
// chaque étape (on peut appuyer, c'est demo.js qui gère leur état, les modes et les effets de saison) ; les cartes des
// fonctions suivent le défilement en 3D.
// Images : assets/car360/<pc|tel>/aNNN.webp + aNNN-feux.webp (Design/voiture-3d/scripts/web_360.py). Seuls les angles
// utilisés (face → arrière par la gauche) sont chargés, la vue avant d'abord.
(() => {
  const recit = document.getElementById('recit');
  if (!recit) return;
  const root = document.documentElement;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const V = document.currentScript && document.currentScript.dataset.v;
  const conn = navigator.connection || {};
  const slow = conn.saveData || /2g/.test(conn.effectiveType || '');
  const size = slow ? 'tel' : 'pc';
  const cvs = document.getElementById('recit-car'), g = cvs && cvs.getContext('2d');
  const $ = id => document.getElementById(id);
  const fail = () => recit.classList.add('sans-voiture');
  if (!g || !window.fetch || !window.createImageBitmap) { fail(); return; }

  let M, step = 5, scale = 1, F = {}, W = 0, H = 0, cur = 0, raf = 0, last = 0, t0 = performance.now(), visible = true;
  const norm = a => ((a % 360) + 360) % 360;
  const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const ramp = (p, a, b) => ease((p - a) / (b - a));

  // --- Images ---------------------------------------------------------------------------------------------------
  const get = src => fetch(src, { cache: 'force-cache' }).then(r => { if (!r.ok) throw new Error(src); return r.blob(); });
  const scratch = document.createElement('canvas'), sx = scratch.getContext('2d', { willReadFrequently: true });
  // Calques des feux : fond noir → transparent (opacité = luminosité), une fois par angle, quand le navigateur est libre.
  async function glow(img) {
    await new Promise(r => (window.requestIdleCallback || setTimeout)(r));
    scratch.width = img.width; scratch.height = img.height;
    sx.clearRect(0, 0, img.width, img.height); sx.drawImage(img, 0, 0);
    const d = sx.getImageData(0, 0, img.width, img.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      // Lumière très faible (reflets diffus sur la carrosserie) retirée : sinon, en additionnant croisement et route,
      // elle forme un voile gris sur toute la voiture. Seule la vraie lumière des feux reste.
      const m = Math.max(p[i], p[i + 1], p[i + 2]), a = m <= 22 ? 0 : (m - 22) * 255 / 233;
      if (m) { const k = 255 / m; p[i] *= k; p[i + 1] *= k; p[i + 2] *= k; }
      p[i + 3] = a;
    }
    if (img.close) img.close();
    return createImageBitmap(d);
  }
  async function load(a) {
    if (F[a]) return F[a];
    const p = 'assets/car360/' + size + '/a' + String(a).padStart(3, '0'), v = '?v=' + M.v;
    const lit = M.tailles[size].feux[a] || {};
    const [offB, feuxB] = await Promise.all([get(p + '.webp' + v), Object.keys(lit).length ? get(p + '-feux.webp' + v) : null]);
    const off = await createImageBitmap(offB);
    const feux = feuxB ? await glow(await createImageBitmap(feuxB)) : null;
    return (F[a] = { off, feux, lit });
  }
  const near = a => { for (let d = 0; d <= 180; d += step) for (const s of [1, -1]) { const k = norm(a + s * d); if (F[k]) return F[k]; } return null; };

  // --- Dessin ---------------------------------------------------------------------------------------------------
  // Pendant le mouvement : image un peu moins fine (l'œil ne voit pas les détails d'un objet qui tourne), donc moins de
  // travail et plus de fluidité ; pleine netteté dès que la voiture s'arrête.
  let lowRes = false, sharpen = 0, mode3d = false;
  function fit() {
    const r = cvs.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, lowRes ? 1.25 : 2);
    const w = Math.round(r.width * d), h = Math.round(r.height * d);
    if (w && (w !== W || h !== H)) { W = cvs.width = w; H = cvs.height = h; }
  }
  // Cadrage au plus près de la voiture à chaque angle (contour interpolé), roues toujours au même niveau.
  function camera(a) {
    const a0 = Math.floor(a / M.pas) * M.pas, f = (a - a0) / M.pas;
    const b0 = M.boites[a0], b1 = M.boites[norm(a0 + M.pas)], b = b0.map((v, i) => v + (b1[i] - v) * f);
    const k = Math.min(W * .9 / (b[2] - b[0]), H * .86 / (b[3] - b[1]));
    return { k, x: W / 2 - (b[0] + b[2]) / 2 * k, y: H * .93 - b[3] * k };
  }
  function draw(ang, lv, alpha) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    const a = norm(ang), a0 = Math.floor(a / step) * step;
    // Fondu court au milieu de chaque pas : ni à-coups, ni voiture dédoublée.
    const f = ease(((a - a0) / step - .3) / .4);
    const A = near(a0), B = F[norm(a0 + step)] || A;
    if (!A) return;
    const c = camera(a), k = c.k * scale;
    g.setTransform(k, 0, 0, k, c.x, c.y); g.imageSmoothingQuality = 'high';
    g.globalAlpha = alpha; g.drawImage(A.off, 0, 0);
    if (B !== A && f > .01) { g.globalAlpha = alpha * f; g.drawImage(B.off, 0, 0); }
    g.globalCompositeOperation = 'lighter';
    for (const [Fr, w] of (B === A ? [[A, 1]] : [[A, 1 - f], [B, f]])) {
      if (!Fr.feux || w < .01) continue;
      for (const gr in Fr.lit) {
        let v = (lv[gr] || 0) * w * alpha;
        while (v >= .01) {   // au-delà de 1 (croisement renforcé), la couche est ajoutée une seconde fois
          g.globalAlpha = Math.min(1, v);
          for (const [sx2, sy, sw, sh, dx, dy] of Fr.lit[gr]) g.drawImage(Fr.feux, sx2, sy, sw, sh, dx, dy, sw, sh);
          v -= 1;
        }
      }
    }
    // Lueur des phares projetée au sol devant la voiture (croisement, route), seulement quand on la voit de face.
    const face = Math.max(0, Math.cos(a * Math.PI / 180)), beam = Math.min(.3, .14 * (lv.low || 0) + .16 * (lv.high || 0)) * face * alpha;
    if (beam > .01) {
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
      g.save(); g.translate(W / 2, H * .965); g.scale(1, .16);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, W * .48);
      gr.addColorStop(0, `rgba(255,244,225,${beam})`); gr.addColorStop(.5, `rgba(255,236,210,${beam * .45})`); gr.addColorStop(1, 'rgba(255,236,210,0)');
      g.fillStyle = gr; g.fillRect(-W * .5, -W * .5, W, W); g.restore();
    }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  }

  // --- Histoire -------------------------------------------------------------------------------------------------
  const on = l => { const b = recit.querySelector('.pbtn[data-l="' + l + '"]'); return b && b.classList.contains('on') ? 1 : 0; };
  const progress = () => { const r = recit.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / (recit.offsetHeight - innerHeight))); };
  const target = p => -90 * ramp(p, .34, .46) - 90 * ramp(p, .64, .76);   // face → profil → arrière
  // Les feux de jour s'allument à l'arrivée et les feux arrière en arrivant derrière : c'est leur pastille qui
  // s'allume (comme un appui), donc un vrai appui les éteint.
  const auto = {};
  const press = l => { if (auto[l]) return; auto[l] = true; const b = recit.querySelector('.pbtn[data-l="' + l + '"]'); if (b && !b.classList.contains('on')) b.click(); };
  const level = {};
  function frame(t) {
    raf = 0;
    const dt = Math.min(.05, last ? (t - last) / 1000 : .016); last = t;
    const p = progress(), goal = target(p);
    // L'angle suit le défilement avec un léger amorti : un coup de doigt rapide donne une rotation douce.
    cur += (goal - cur) * (calm ? 1 : Math.min(1, dt * 9));
    const moving = Math.abs(goal - cur) > .05;
    if (!moving) cur = goal;
    // Netteté réduite tant que la voiture tourne, pleine netteté 150 ms après l'arrêt (redessinée aussitôt : pas de
    // toile vide entre les deux).
    if (moving && !mode3d) { clearTimeout(sharpen); sharpen = 0; if (!lowRes) { lowRes = true; fit(); } }
    else if (lowRes && !sharpen) sharpen = setTimeout(() => { sharpen = 0; lowRes = false; fit(); if (raf) cancelAnimationFrame(raf); frame(performance.now()); }, 150);
    const time = (t - t0) / 1000;
    const intro = calm ? 1 : ease(time / 1.1);                             // la voiture apparaît en douceur au chargement
    const blink = Math.floor(time * 3) % 2 === 0;
    const ind = l => (on(l) || on('hazard')) && blink ? 1 : 0;
    if (time > .7 || calm) press('drl');                                    // feux de jour à l'arrivée, comme dans l'app
    if (p > .74) press('tail');
    const drl = on('drl'), tail = on('tail'), brake = on('brake');
    const want = { drl_G: drl * (ind('indL') ? .3 : 1), drl_D: drl * (ind('indR') ? .3 : 1), low: 1.6 * on('low'), high: on('high'),
      indL: ind('indL'), indR: ind('indR'), tail_G: Math.max(tail, brake), tail_D: Math.max(tail, brake), brake,
      reverse: on('reverse'), plaque: Math.max(tail, brake), inside: on('inside') };
    let fading = false;
    for (const k in want) {   // fondu court des feux (~150 ms) ; clignotants nets
      const c = level[k] || 0, d = want[k] - c, fast = k === 'indL' || k === 'indR';
      if (Math.abs(d) > .01 && !fast) { level[k] = c + d * Math.min(1, dt * 18); fading = true; } else level[k] = want[k];
    }
    if (mode3d) window.__car3d.draw(cur, level, intro); else draw(cur, level, intro);   // vraie 3D si possible
    const red = tail > .5 || brake;
    const halo = $('recit-halo');
    halo.style.opacity = ((.3 + .7 * Math.max(drl, tail)) * intro).toFixed(3);
    halo.classList.toggle('rouge', !!red);
    const show = (id, a, b) => { const e = $(id); if (!e) return; const v = Math.min(ramp(p, a, a + .04), 1 - ramp(p, b - .04, b));
      e.style.opacity = v.toFixed(3); e.style.transform = `translateY(${((1 - v) * 16).toFixed(1)}px)`; e.style.visibility = v > .01 ? 'visible' : 'hidden'; };
    const t1 = $('recit-t1'), k1 = ramp(p, .05, .12);
    t1.style.opacity = (1 - k1).toFixed(3); t1.style.transform = `translateY(${(-k1 * 24).toFixed(1)}px)`;
    show('recit-t2', .13, .34); show('recit-t3', .44, .64); show('recit-t4', .76, 1.2);
    // Pastilles : arrivent une par une, de gauche et de droite.
    for (const [id, a, b] of [['recit-r1', .15, .34], ['recit-r2', .46, .64], ['recit-r3', .78, 1.2]]) {
      const kids = [...$(id).children];
      kids.forEach((c, i) => {
        const v = Math.min(ramp(p, a + i * .015, a + i * .015 + .04), 1 - ramp(p, b - .04, b)), side = i < kids.length / 2 ? -1 : 1;
        c.style.opacity = v.toFixed(3); c.style.transform = `translateX(${(side * (1 - v) * 70).toFixed(1)}px) scale(${(.85 + .15 * v).toFixed(3)})`;
        c.style.pointerEvents = v > .5 ? 'auto' : 'none'; c.style.visibility = v > .01 ? 'visible' : 'hidden';
      });
    }
    $('recit-hint').style.opacity = (1 - ramp(p, 0, .04)).toFixed(3);
    const busy = moving || fading || time < 1.2 || on('indL') || on('indR') || on('hazard');
    if (busy && visible) raf = requestAnimationFrame(frame); else last = 0;
  }
  const wake = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };

  // Cartes des fonctions en 3D liées au défilement : elles arrivent inclinées et en retrait, se redressent au centre,
  // repartent inclinées de l'autre côté ; un reflet glisse dessus.
  const cards = [...document.querySelectorAll('.features .feat')];
  let cardsRaf = 0;
  function cards3d() {
    cardsRaf = 0;
    cards.forEach((c, i) => {
      if (c.offsetParent === null) return;
      const r = c.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;
      const q = Math.max(-1.2, Math.min(1.2, ((r.top + r.height / 2) - innerHeight * .5) / (innerHeight * .55)));
      const k = Math.abs(q), side = i % 2 ? 1 : -1;
      // Perspective propre à chaque carte : elles s'inclinent chacune de leur côté sans jamais se traverser (Safari).
      c.style.transform = `perspective(900px) translateZ(${(-k * k * 150).toFixed(1)}px) rotateX(${(q * 26).toFixed(2)}deg) rotateY(${(side * q * 6).toFixed(2)}deg) scale(${(1 - k * .05).toFixed(3)})`;
      c.style.opacity = Math.max(0, Math.min(1, 1.25 - k * k)).toFixed(3);
      c.style.setProperty('--sheen', (q * 60).toFixed(1) + '%');
    });
  }
  if (!calm && cards.length) {
    document.querySelector('.features').classList.add('f3d');
    const go = () => { if (!cardsRaf) cardsRaf = requestAnimationFrame(cards3d); };
    addEventListener('scroll', go, { passive: true }); addEventListener('resize', go);
    const all = document.querySelector('.allbtn button'); if (all) all.addEventListener('click', () => setTimeout(go, 50));
    go();
  }

  async function start() {
    M = await (await fetch('assets/car360/manifest.json' + (V ? '?v=' + V : ''), { cache: V ? 'force-cache' : 'no-cache' })).json();
    step = slow ? 10 : M.pas;
    scale = M.cadre[0] / M.tailles[size].taille[0];
    fit();
    await load(0);
    recit.classList.add('pret');
    addEventListener('scroll', wake, { passive: true });
    addEventListener('resize', () => { fit(); wake(); });
    new ResizeObserver(() => { fit(); wake(); }).observe(cvs);
    new MutationObserver(wake).observe(recit, { subtree: true, attributes: true, attributeFilter: ['class'] });
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) wake(); }).observe(recit);
    t0 = performance.now(); wake();
    // Les angles de l'histoire (face → arrière par la gauche), du plus proche au plus lointain, 4 à la fois.
    let started2d = false;
    const load2d = () => {
      if (started2d || mode3d) return; started2d = true;
      const order = [];
      for (let a = 0; a <= 180; a += step) order.push(norm(-a));
      let i = 1;
      const next = () => { if (i >= order.length) return; const a = order[i++]; load(a).then(wake, () => {}).finally(next); };
      for (let n = 0; n < 4; n++) next();
    };
    // Vraie 3D (car3d.js) : la vue avant en image s'affiche tout de suite, puis la voiture 3D prend le relais en fondu.
    // Sans 3D (vieil appareil, échec) ou si elle tarde trop : les images 360°.
    const go3d = () => { mode3d = true; window.__car3d.fit(); recit.classList.add('en3d'); wake(); };
    const st = window.__car3dState;
    if (st === 'ready') go3d();
    else if (st === 'loading') {
      addEventListener('car3d', go3d, { once: true });
      addEventListener('car3d-fail', load2d, { once: true });
      setTimeout(() => { if (!mode3d) load2d(); }, 8000);
    } else load2d();
    addEventListener('resize', () => { if (mode3d) window.__car3d.fit(); });
  }
  start().catch(fail);
})();
