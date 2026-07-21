/* Translate Sports — reservations + change-requests backend.
   Backend is Firebase Realtime Database over plain REST (no SDK, no secret config).
   Everything is namespaced under /translatesports so it never touches any other
   data in the shared flashcards-3d896 database. */
(function () {
  var DB = 'https://flashcards-3d896-default-rtdb.firebaseio.com/translatesports';

  var FB_API_KEY = 'AIzaSyCrXKw01Rfu6CMXi3j79rc1a1XcsZqvzck';
  var _fbTok = null;
  function _fbLoadTok() {
    try { _fbTok = JSON.parse(localStorage.getItem('fbAnonTok:flashcards-3d896')) || null; } catch (e) { _fbTok = null; }
  }
  function _fbSaveTok() {
    try { localStorage.setItem('fbAnonTok:flashcards-3d896', JSON.stringify(_fbTok)); } catch (e) {}
  }
  async function fbEnsureTok() {
    if (!_fbTok) _fbLoadTok();
    var now = Date.now();
    if (_fbTok && _fbTok.t && now < _fbTok.e - 300000) return _fbTok.t;
    try {
      if (_fbTok && _fbTok.r) {
        var r = await fetch('https://securetoken.googleapis.com/v1/token?key=' + FB_API_KEY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(_fbTok.r)
        });
        if (r.ok) {
          var d = await r.json();
          _fbTok = { t: d.id_token, r: d.refresh_token, e: now + (parseInt(d.expires_in, 10) || 3600) * 1000 };
          _fbSaveTok();
          return _fbTok.t;
        }
      }
      var r2 = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + FB_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"returnSecureToken":true}'
      });
      if (r2.ok) {
        var d2 = await r2.json();
        _fbTok = { t: d2.idToken, r: d2.refreshToken, e: now + (parseInt(d2.expiresIn, 10) || 3600) * 1000 };
        _fbSaveTok();
        return _fbTok.t;
      }
    } catch (e) {}
    return null;
  }
  async function fbAuthUrl(url) {
    var t = await fbEnsureTok();
    if (!t) return url;
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'auth=' + t;
  }

  // ---------- write ----------
  function push(coll, data) {
    data = Object.assign({}, data, { createdAt: Date.now() });
    return fbAuthUrl(DB + '/' + coll + '.json').then(function (u) {
      return fetch(u, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { return j && j.name; });
  }
  function submitReservation(d) { return push('reservations', d); }
  function submitChange(d) { return push('changes', d); }

  // ---------- update (admin) ----------
  function patch(coll, id, data) {
    return fbAuthUrl(DB + '/' + coll + '/' + id + '.json').then(function (u) {
      return fetch(u, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return true; });
  }
  function setReservationStatus(id, status) { return patch('reservations', id, { status: status }); }
  function setChangeStatus(id, status) { return patch('changes', id, { status: status }); }

  // ---------- delete (admin) ----------
  function del(coll, id) {
    return fbAuthUrl(DB + '/' + coll + '/' + id + '.json').then(function (u) { return fetch(u, { method: 'DELETE' }); })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return true; });
  }
  function deleteReservation(id) { return del('reservations', id); }
  function deleteChange(id) { return del('changes', id); }

  // ---------- read (admin) ----------
  function fetchColl(coll) {
    return fbAuthUrl(DB + '/' + coll + '.json').then(function (u) { return fetch(u); })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (obj) {
        if (!obj) return [];
        return Object.keys(obj).map(function (k) { return Object.assign({ id: k }, obj[k]); })
          .sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      });
  }
  // poll every 4s so the admin dashboard updates live without a page refresh
  function subscribe(coll, cb) {
    var stop = false;
    function tick() { if (stop) return; fetchColl(coll).then(function (rows) { if (!stop) cb(rows); }).catch(function () {}); }
    tick(); var iv = setInterval(tick, 4000);
    return function () { stop = true; clearInterval(iv); };
  }

  window.TSStore = {
    submitReservation: submitReservation, submitChange: submitChange,
    setReservationStatus: setReservationStatus, setChangeStatus: setChangeStatus,
    deleteReservation: deleteReservation, deleteChange: deleteChange,
    fetchReservations: function () { return fetchColl('reservations'); },
    fetchChanges: function () { return fetchColl('changes'); },
    subscribeReservations: function (cb) { return subscribe('reservations', cb); },
    subscribeChanges: function (cb) { return subscribe('changes', cb); }
  };
})();
