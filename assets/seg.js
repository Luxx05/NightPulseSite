
document.documentElement.classList.add('js');
document.querySelectorAll('.seg').forEach(seg => {
  const buttons = [...seg.querySelectorAll('button')];
  const show = key => {
    buttons.forEach(b => { b.classList.toggle('on', b.dataset.doc === key); b.setAttribute('aria-pressed', b.dataset.doc === key); });
    document.querySelectorAll('.doc').forEach(d => d.classList.toggle('on', d.dataset.doc === key));
  };
  buttons.forEach(b => b.addEventListener('click', () => show(b.dataset.doc)));
  // Un lien « …#adaptateurs » ouvre directement cet onglet (bouton de l'accueil).
  const alias = { adaptateurs: 'adapters', voitures: 'cars' };
  const wanted = () => { const h = location.hash.slice(1); return buttons.find(b => b.dataset.doc === (alias[h] || h)); };
  show((wanted() || buttons[0]).dataset.doc);
  addEventListener('hashchange', () => { const b = wanted(); if (b) show(b.dataset.doc); });
});
