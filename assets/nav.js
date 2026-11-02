// En-tête : se cache quand on descend, revient dès qu'on remonte (sur téléphone, voir le CSS).
let last = window.scrollY;
const header = document.querySelector('header');
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (Math.abs(y - last) < 6) return;
  header.classList.toggle('hide', y > last && y > 80);
  last = y;
}, { passive: true });
// Bouton clair / sombre : bascule le mode affiché et le retient (le soleil propose le clair, la lune le sombre).
const modeButton = document.querySelector('.mode');
if (modeButton) modeButton.addEventListener('click', () => {
  const root = document.documentElement;
  const light = root.dataset.mode ? root.dataset.mode === 'light' : matchMedia('(prefers-color-scheme: light)').matches;
  root.dataset.mode = light ? 'dark' : 'light';
  try { localStorage.setItem('mode', root.dataset.mode); } catch (e) {}
});
