// Démo de la page d'accueil : les pastilles allument les calques de lumière de la voiture.
const MAP = {"drl": ["f:drl-screenLeft", "f:drl-screenRight"], "low": ["f:low-screenLeft", "f:low-screenRight"], "high": ["f:high-screenLeft", "f:high-screenRight"], "fog": ["f:fog-screenLeft", "f:fog-screenRight"], "indL": ["f:indicator-screenRight", "r:indicator-screenLeft"], "indR": ["f:indicator-screenLeft", "r:indicator-screenRight"], "tail": ["r:tail-screenLeft", "r:tail-screenRight"], "brake": ["r:brake"], "reverse": ["r:reverse-screenLeft", "r:reverse-screenRight"], "rfog": ["r:fog"], "inside": ["f:interior", "r:interior"]};
const DIM = { indL: ['f:drl-screenRight', 'r:tail-screenLeft'], indR: ['f:drl-screenLeft', 'r:tail-screenRight'] };
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
state.add('drl'); state.add('tail'); render();
