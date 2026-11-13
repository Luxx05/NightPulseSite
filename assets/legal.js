// Page Conditions : onglets « Conditions | Confidentialité » et « Français | English » (le texte change sur place),
// sommaire qui mène à un article et suit la lecture. Sans ce script, les quatre textes s'affichent à la suite.
document.documentElement.classList.add('js');
const ANCHOR = {conditions: ['conditions', 'fr'], confidentialite: ['confidentialite', 'fr'], terms: ['conditions', 'en'], privacy: ['confidentialite', 'en']};
const fromHash = () => Object.hasOwn(ANCHOR, location.hash.slice(1)) ? ANCHOR[location.hash.slice(1)] : null;   // adresses connues seulement
const tabs = document.querySelector('.rp-onglets');
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const asked = fromHash();
let [doc, lang] = asked || ['conditions', 'fr'];

function spy() {                                   // l'article qu'on lit s'allume dans le sommaire
  const shown = document.querySelector('.rp-doc.on');
  if (!shown) return;
  const arts = [...shown.querySelectorAll('.rp-art')];
  let cur = arts[0];
  for (const a of arts) if (a.getBoundingClientRect().top <= innerHeight * .42) cur = a;
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = arts[arts.length - 1];
  shown.querySelectorAll('.rp-som a').forEach(l => l.classList.toggle('on', !!cur && l.getAttribute('href') === '#' + cur.id));
}
function show(write) {
  document.querySelectorAll('.rp-doc').forEach(d => d.classList.toggle('on', d.dataset.doc === doc && d.dataset.lang === lang));
  tabs.querySelectorAll('[data-doc]').forEach(b => { const on = b.dataset.doc === doc; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  tabs.querySelectorAll('[data-lang]').forEach(b => { const on = b.dataset.lang === lang; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  document.querySelectorAll('[data-fr][data-en]').forEach(e => { e.textContent = e.dataset[lang]; });
  if (write) history.replaceState(null, '', '#' + Object.keys(ANCHOR).find(k => ANCHOR[k][0] === doc && ANCHOR[k][1] === lang));
  spy();
}
const toTabs = smooth => tabs.scrollIntoView({behavior: smooth && !calm.matches ? 'smooth' : 'instant', block: 'start'});

tabs.querySelectorAll('[data-doc]').forEach(b => b.addEventListener('click', () => { doc = b.dataset.doc; show(true); }));
tabs.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => { lang = b.dataset.lang; show(true); }));
document.querySelectorAll('.rp-som a').forEach(a => a.addEventListener('click', e => {
  const target = document.getElementById(a.getAttribute('href').slice(1));
  if (!target) return;
  e.preventDefault();                              // l'adresse garde l'onglet choisi, pas le numéro de l'article
  target.scrollIntoView({behavior: calm.matches ? 'instant' : 'smooth', block: 'start'});
}));
addEventListener('hashchange', () => { const a = fromHash(); if (!a) return; [doc, lang] = a; show(false); toTabs(true); });
let waiting = false;
addEventListener('scroll', () => { if (waiting) return; waiting = true; requestAnimationFrame(() => { waiting = false; spy(); }); }, {passive: true});
show(false);
// Une adresse qui demande autre chose que la première vue (« …#confidentialite », « …#privacy », « …#terms ») mène droit au texte.
if (asked && location.hash !== '#conditions') toTabs(false);
