
document.documentElement.classList.add('js');
document.querySelectorAll('.seg').forEach(seg => {
  const buttons = [...seg.querySelectorAll('button')];
  const show = key => {
    buttons.forEach(b => { b.classList.toggle('on', b.dataset.doc === key); b.setAttribute('aria-pressed', b.dataset.doc === key); });
    document.querySelectorAll('.doc').forEach(d => d.classList.toggle('on', d.dataset.doc === key));
  };
  buttons.forEach(b => b.addEventListener('click', () => show(b.dataset.doc)));
  show(buttons[0].dataset.doc);
});
