// En-tête : se cache quand on descend, revient dès qu'on remonte (sur téléphone, voir le CSS).
let last = window.scrollY;
const header = document.querySelector('header');
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (Math.abs(y - last) < 6) return;
  header.classList.toggle('hide', y > last && y > 80);
  last = y;
}, { passive: true });
