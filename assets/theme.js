(function () {
  var T = { halloween: [10, 20, 31], noel: [12, 1, 31] }, t = null, q = null, kept = null;
  try { q = new URLSearchParams(location.search).get('theme'); } catch (e) {}
  try { if (q) sessionStorage.setItem('theme', q); kept = sessionStorage.getItem('theme'); } catch (e) { kept = q; }
  var ask = q || kept;
  if (ask === 'aucun') return;
  if (ask && Object.prototype.hasOwnProperty.call(T, ask)) t = ask;
  else {
    var d = new Date(), m = d.getMonth() + 1, j = d.getDate();
    for (var k in T) if (Object.prototype.hasOwnProperty.call(T, k) && T[k][0] === m && j >= T[k][1] && j <= T[k][2]) t = k;
  }
  if (t) document.documentElement.setAttribute('data-theme', t);
})();
