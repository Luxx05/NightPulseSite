
document.documentElement.classList.add('js');
const LABELS = {fr: ["Conditions d'utilisation", 'Confidentialité', 'Dernière mise à jour : %s'],
                en: ['Terms of Use', 'Privacy Policy', 'Last updated: %s']};
const ANCHOR = {conditions: ['conditions', 'fr'], confidentialite: ['confidentialite', 'fr'], terms: ['conditions', 'en'], privacy: ['confidentialite', 'en']};
const fromHash = () => Object.hasOwn(ANCHOR, location.hash.slice(1)) ? ANCHOR[location.hash.slice(1)] : null;   // ancres connues seulement
let [doc, lang] = fromHash() || ['conditions', 'fr'];
const date = document.querySelector('.lg-hero .d');
function show() {
  document.querySelectorAll('.doc').forEach(d => d.classList.toggle('on', d.dataset.doc === doc && d.dataset.lang === lang));
  document.querySelectorAll('.seg button').forEach((b, i) => { b.classList.toggle('on', b.dataset.doc === doc); b.textContent = LABELS[lang][i]; b.setAttribute('aria-pressed', b.dataset.doc === doc); });
  document.querySelectorAll('.lang button').forEach(b => { b.classList.toggle('on', b.dataset.lang === lang); b.setAttribute('aria-pressed', b.dataset.lang === lang); });
  date.textContent = LABELS[lang][2].replace('%s', date.dataset[lang]);
  const anchor = Object.keys(ANCHOR).find(k => ANCHOR[k][0] === doc && ANCHOR[k][1] === lang);
  history.replaceState(null, '', '#' + anchor);
}
document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => { doc = b.dataset.doc; show(); }));
document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => { lang = b.dataset.lang; show(); }));
addEventListener('hashchange', () => { [doc, lang] = fromHash() || [doc, lang]; show(); });
show();
