// Démo de la page d'accueil : les pastilles allument les calques de lumière de la voiture.
const MAP = {"drl": ["f:drl-screenLeft", "f:drl-screenRight"], "low": ["f:low-screenLeft", "f:low-screenRight"], "high": ["f:high-screenLeft", "f:high-screenRight"], "fog": ["f:fog-screenLeft", "f:fog-screenRight"], "indL": ["f:indicator-screenRight", "r:indicator-screenLeft"], "indR": ["f:indicator-screenLeft", "r:indicator-screenRight"], "tail": ["r:tail-screenLeft", "r:tail-screenRight"], "brake": ["r:brake"], "reverse": ["r:reverse-screenLeft", "r:reverse-screenRight"], "rfog": ["r:fog"]};
const lamps = [...document.querySelectorAll('.lamp')];
const buttons = [...document.querySelectorAll('.pbtn')];
const state = new Set();
let showTimer = null;
function render() {
  const lit = new Set(), blink = new Set();
  for (const k of state) {
    if (k === 'hazard') { MAP.indL.concat(MAP.indR).forEach(id => blink.add(id)); continue; }
    if (k === 'indL' || k === 'indR') { MAP[k].forEach(id => blink.add(id)); continue; }
    (MAP[k] || []).forEach(id => lit.add(id));
  }
  for (const l of lamps) {
    l.classList.toggle('on', lit.has(l.dataset.id));
    l.classList.toggle('blink', blink.has(l.dataset.id) && !lit.has(l.dataset.id));
  }
  for (const b of buttons) {
    const on = state.has(b.dataset.l) || (b.dataset.l === 'show' && showTimer !== null);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  }
}
function stopShow() { clearInterval(showTimer); showTimer = null; state.clear(); render(); }
function startShow() {
  const steps = [['drl', 'tail'], ['drl', 'tail', 'low'], ['drl', 'tail', 'low', 'high', 'fog'], [],
                 ['drl', 'high', 'brake'], [], ['drl', 'high', 'brake'], ['drl', 'tail']];
  let i = 0;
  state.clear();
  showTimer = setInterval(() => { state.clear(); steps[i++ % steps.length].forEach(k => state.add(k)); render(); }, 420);
  render();
}
for (const b of buttons) b.addEventListener('click', () => {
  const k = b.dataset.l;
  if (k === 'show') { showTimer ? stopShow() : startShow(); return; }
  if (showTimer) stopShow();
  state.has(k) ? state.delete(k) : state.add(k);
  render();
});
state.add('drl'); state.add('tail'); render();
