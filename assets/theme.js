(function () {
  // [mois, premier jour, dernier jour] ; le Nouvel An est à cheval sur deux années
  var T = { 'octobre-rose': [[10, 1, 19]], halloween: [[10, 20, 31]], noel: [[12, 1, 25]],
            'nouvel-an': [[12, 26, 31], [1, 1, 6]], paques: [[4, 1, 30]] }, t = null, q = null, kept = null;
  try { q = new URLSearchParams(location.search).get('theme'); } catch (e) {}
  try { if (q) sessionStorage.setItem('theme', q); kept = sessionStorage.getItem('theme'); } catch (e) { kept = q; }
  var ask = q || kept;
  if (ask === 'aucun') return;
  if (ask && Object.prototype.hasOwnProperty.call(T, ask)) t = ask;
  else {
    var d = new Date(), m = d.getMonth() + 1, j = d.getDate();
    for (var k in T) if (Object.prototype.hasOwnProperty.call(T, k))
      for (var i = 0; i < T[k].length; i++) if (T[k][i][0] === m && j >= T[k][i][1] && j <= T[k][i][2]) t = k;
  }
  if (t) document.documentElement.setAttribute('data-theme', t);
})();
