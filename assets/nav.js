// Logo aux couleurs de la fête du moment (en-tête et pied de page), comme dans l'app.
(() => { const t = document.documentElement.dataset.theme;
  if (t && t !== 'aucun') document.querySelectorAll('img[src^="assets/img/icone.png"]').forEach(i => { i.src = 'assets/img/icone-' + t + '.png'; }); })();
// En-tête : se cache quand on descend, revient dès qu'on remonte (sur téléphone, voir le CSS).
let last = window.scrollY;
const header = document.querySelector('header');
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (Math.abs(y - last) < 6) return;
  header.classList.toggle('hide', y > last && y > 80);
  last = y;
}, { passive: true });
window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 4), { passive: true });
// Sur iPhone, Safari n'affiche l'état « appuyé » (:active) que si la page écoute le toucher.
document.addEventListener('touchstart', () => {}, { passive: true });
// Accueil : les 3 premières fonctions, puis « Tout voir ».
const all = document.querySelector('.allbtn button');
if (all) all.addEventListener('click', () => {
  document.querySelector('.features').classList.remove('collapsed');
  all.parentElement.remove();
});
// Bouton clair / sombre : bascule le mode affiché et le retient (le soleil propose le clair, la lune le sombre).
const modeButton = document.querySelector('.mode');
if (modeButton) modeButton.addEventListener('click', () => {
  const root = document.documentElement;
  const light = root.dataset.mode ? root.dataset.mode === 'light' : matchMedia('(prefers-color-scheme: light)').matches;
  const apply = () => { root.dataset.mode = light ? 'dark' : 'light'; };
  // Passage clair / sombre en fondu (sauf si l'appareil demande moins d'animations).
  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(apply);
  else apply();
  try { localStorage.setItem('mode', light ? 'dark' : 'light'); } catch (e) {}
});
