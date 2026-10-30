// Démo de la page d'accueil : les pastilles allument les calques de lumière de la voiture.
const MAP = {"drl": ["f:drl-screenLeft", "f:drl-screenRight"], "low": ["f:low-screenLeft", "f:low-screenRight"], "high": ["f:high-screenLeft", "f:high-screenRight"], "fog": ["f:fog-screenLeft", "f:fog-screenRight"], "indL": ["f:indicator-screenRight", "r:indicator-screenLeft"], "indR": ["f:indicator-screenLeft", "r:indicator-screenRight"], "tail": ["r:tail-screenLeft", "r:tail-screenRight"], "brake": ["r:brake"], "reverse": ["r:reverse-screenLeft", "r:reverse-screenRight"], "rfog": ["r:fog"], "inside": ["f:interior", "r:interior"]};
const DIM = { indL: ['f:drl-screenRight', 'r:tail-screenLeft'], indR: ['f:drl-screenLeft', 'r:tail-screenRight'] };
// Thèmes saisonniers, activés automatiquement selon la date (ou ?theme=halloween / noel / aucun pour essayer).
const THEMES = {
  halloween: { month: 10, from: 20, to: 31, drl: true, label: '🎃 Édition Halloween' },
  noel: { month: 12, from: 1, to: 31, drl: false, label: '🎄 Édition Noël' },
};
const THEME = (() => {
  const asked = new URLSearchParams(location.search).get('theme');
  if (asked === 'aucun') return null;
  if (asked && Object.hasOwn(THEMES, asked)) return asked;
  const d = new Date(), m = d.getMonth() + 1, day = d.getDate();
  return Object.keys(THEMES).find(k => THEMES[k].month === m && day >= THEMES[k].from && day <= THEMES[k].to) || null;
})();
if (THEME) {
  const dir = 'assets/theme/' + THEME + '/', v = '?v=6991f7f0';
  document.documentElement.dataset.theme = THEME;
  document.querySelectorAll('.car').forEach((car, i) => {
    const side = i === 0 ? 'front' : 'rear', p = i === 0 ? 'f' : 'r';
    car.querySelector('.base').src = dir + side + '-off.jpg' + v;
    const twk = new Image(); twk.className = 'twk'; twk.alt = ''; twk.src = dir + side + '-twinkle.jpg' + v; car.querySelector('.base').after(twk);
    const refl = new Image(); refl.className = 'lamp'; refl.alt = ''; refl.dataset.id = p + ':refl'; refl.src = dir + side + '-refl.jpg' + v; car.append(refl);
  });
  if (THEMES[THEME].drl) document.querySelectorAll('.lamp[data-id^="f:drl-"]').forEach(l => { l.src = dir + l.dataset.id.slice(2) + '.jpg' + v; });
  MAP.drl.push('f:refl'); MAP.tail.push('r:refl');
  MAP.gL = ['f:drl-screenRight', 'r:tail-screenLeft', 'f:refl']; MAP.gR = ['f:drl-screenLeft', 'r:tail-screenRight', 'r:refl'];
  document.querySelectorAll('[data-theme-only]').forEach(b => { b.hidden = b.dataset.themeOnly !== THEME; });
  const hint = document.querySelector('.hint');
  if (hint) hint.textContent = THEMES[THEME].label + " · touche une pastille : les feux s'allument comme dans l'app.";
}
const lamps = [...document.querySelectorAll('.lamp')];
const buttons = [...document.querySelectorAll('.pbtn')];
const state = new Set();
let showTimer = null, playing = null;
function render() {
  const lit = new Set(), blink = new Set(), dim = new Set();
  for (const k of state) {
    // Comme dans l'app : le feu de jour et le feu arrière s'atténuent du côté qui clignote.
    if (k === 'hazard') { ['indL', 'indR'].forEach(s => { MAP[s].forEach(id => blink.add(id)); DIM[s].forEach(id => dim.add(id)); }); continue; }
    if (k === 'indL' || k === 'indR') { MAP[k].forEach(id => blink.add(id)); DIM[k].forEach(id => dim.add(id)); continue; }
    (MAP[k] || []).forEach(id => lit.add(id));
  }
  for (const l of lamps) {
    l.classList.toggle('on', lit.has(l.dataset.id));
    l.classList.toggle('dim', dim.has(l.dataset.id));
    l.classList.toggle('blink', blink.has(l.dataset.id) && !lit.has(l.dataset.id));
  }
  for (const b of buttons) {
    const on = b.dataset.show ? playing === b.dataset.show : state.has(b.dataset.l);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  }
}
// Pas des shows de l'app (Shows/LightShow.swift) : [durée en temps, feux allumés], au même tempo.
const SHOWS = {
  // « Lancer un show » : le mélange de la démo d'origine (un pas toutes les 420 ms)
  mix: { bpm: 60000 / 420, steps: [[1, ['drl', 'tail', 'inside']], [1, ['drl', 'tail', 'low', 'inside']],
    [1, ['drl', 'tail', 'low', 'high', 'fog', 'inside']], [1, []], [1, ['drl', 'high', 'brake', 'inside']], [1, []],
    [1, ['drl', 'high', 'brake', 'inside']], [1, ['drl', 'tail']]] },
  // Shows des thèmes : « Hanté » (Halloween, les feux grésillent) et « Guirlande » (Noël, gauche / droite)
  hante: { bpm: 120, steps: [[0.125, ["drl"]], [0.125, []], [0.25, ["drl", "inside"]], [0.125, ["drl"]], [0.25, ["drl", "inside"]], [0.125, ["inside"]], [0.25, ["drl", "inside"]], [0.5, ["inside"]], [0.75, []], [0.25, ["tail"]], [0.5, ["drl", "inside"]], [0.5, ["drl"]], [0.75, ["drl", "tail", "inside"]], [0.125, ["high", "inside"]], [0.25, ["drl", "inside"]], [0.25, ["drl", "tail"]], [0.125, ["drl"]], [0.5, ["inside"]], [0.5, ["drl", "high"]], [0.125, ["drl", "tail", "high"]], [0.5, ["tail"]], [0.5, []], [0.25, ["drl", "high", "inside"]], [0.125, ["drl"]], [0.5, ["drl", "tail"]], [0.25, ["tail"]], [0.75, ["drl", "inside"]], [0.125, ["tail", "inside"]]] },
  guirlande: { bpm: 120, steps: [[0.5, ["gL", "inside", "high"]], [0.5, ["gR", "inside"]], [0.5, ["gL", "inside"]], [0.5, ["gR", "inside"]], [0.5, ["gL", "inside", "high"]], [0.5, ["gR", "inside"]], [0.5, ["gL", "inside"]], [0.5, ["gR", "inside"]]] },
  pulsation: { bpm: 120, steps: [[0.25, ['high', 'low', 'inside']], [0.75, []]] },
  double: { bpm: 120, steps: [[0.25, ['high', 'inside']], [0.25, []], [0.25, ['high', 'inside']], [1.25, []]] },
  bienvenue: { bpm: 100, steps: [[1, ['inside']], [1, ['drl', 'inside']], [1, ['drl', 'tail', 'inside']],
    [1, ['drl', 'tail', 'fog', 'inside']], [1, ['drl', 'tail', 'fog', 'low', 'inside']],
    [0.5, ['drl', 'tail', 'fog', 'low', 'high', 'brake', 'inside']], [0.5, ['drl', 'tail', 'low', 'inside']],
    [0.5, ['drl', 'tail', 'fog', 'low', 'high', 'brake', 'inside']], [0.5, ['drl', 'tail', 'low', 'inside']],
    [2, ['drl', 'tail', 'low', 'inside']], [1, []]] },
};
function stopShow() { clearTimeout(showTimer); showTimer = null; playing = null; state.clear(); render(); }
function startShow(name) {
  stopShow();
  playing = name;
  const { bpm, steps } = SHOWS[name];
  let i = 0;
  const next = () => {
    const [beats, on] = steps[i++ % steps.length];
    state.clear(); on.forEach(k => state.add(k)); render();
    showTimer = setTimeout(next, beats * 60000 / bpm);
  };
  next();
}
for (const b of buttons) b.addEventListener('click', () => {
  if (b.dataset.show) { playing === b.dataset.show ? stopShow() : startShow(b.dataset.show); return; }
  const k = b.dataset.l;
  if (showTimer) stopShow();
  state.has(k) ? state.delete(k) : state.add(k);
  render();
});
state.add('drl'); state.add('tail'); state.add('inside'); render();   // à l'arrivée : feux de jour, feux arrière et intérieur

// Animations du thème (neige / chauves-souris et brume), dessinées par-dessus la voiture.
const fx = document.querySelector('.fx');
if (THEME && fx && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const g = fx.getContext('2d');
  let W = 0, H = 0, visible = true;
  const size = () => { const r = fx.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; fx.width = W * d; fx.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); };
  size(); addEventListener('resize', size);
  new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(fx);
  const flakes = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), r: 0.8 + Math.random() * 2, v: 0.04 + Math.random() * 0.08, p: Math.random() * 6.3 }));
  const bats = [{ x: -0.1, y: 0.12, s: 1, v: 0.06 }, { x: -0.6, y: 0.2, s: 0.7, v: 0.045 }, { x: 1.4, y: 0.08, s: 0.85, v: -0.05 }];
  const fogs = Array.from({ length: 6 }, (_, i) => ({ x: i / 6, r: 0.25 + Math.random() * 0.2, v: 0.008 + Math.random() * 0.01 }));
  const bat = (x, y, s, flap) => {
    g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.moveTo(0, 0);
    [[-8, -6 * flap], [-16, -10 * flap], [-22, -2], [-14, 0], [-8, 4], [0, 2], [8, 4], [14, 0], [22, -2], [16, -10 * flap], [8, -6 * flap]].forEach(([a, b]) => g.lineTo(a, b));
    g.closePath(); g.fillStyle = 'rgba(12,5,14,.92)'; g.fill(); g.restore();
  };
  let last = performance.now();
  const frame = now => {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (visible && W) {
      g.clearRect(0, 0, W, H);
      if (THEME === 'noel') {
        g.fillStyle = 'rgba(255,255,255,.85)';
        for (const f of flakes) {
          f.y += f.v * dt; if (f.y > 1.02) { f.y = -0.02; f.x = Math.random(); }
          const x = (f.x + Math.sin(now / 1000 * 1.2 + f.p) * 0.01) * W;
          g.beginPath(); g.arc(x, f.y * H, f.r, 0, 6.3); g.fill();
        }
      } else {
        for (const f of fogs) {
          f.x += f.v * dt; if (f.x > 1.3) f.x = -0.3;
          const gr = g.createRadialGradient(f.x * W, H * 0.95, 0, f.x * W, H * 0.95, f.r * H);
          gr.addColorStop(0, 'rgba(150,70,40,.22)'); gr.addColorStop(1, 'rgba(150,70,40,0)');
          g.fillStyle = gr; g.fillRect(0, 0, W, H);
        }
        for (const b of bats) {
          b.x += b.v * dt; if (b.v > 0 && b.x > 1.15) b.x = -0.15; if (b.v < 0 && b.x < -0.15) b.x = 1.15;
          bat(b.x * W, (b.y + Math.sin(now / 300 + b.s * 9) * 0.02) * H, b.s * Math.max(W / 900, 0.55), Math.abs(Math.sin(now / 70 + b.s * 5)) * 0.8 + 0.2);
        }
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
