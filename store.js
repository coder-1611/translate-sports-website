/* Translate Sports — reservations + change-requests backend.
   Backend is Firebase Realtime Database over plain REST (no SDK, no secret config).
   Everything is namespaced under /translatesports so it never touches any other
   data in the shared flashcards-3d896 database. */
(function () {
  var DB = 'https://flashcards-3d896-default-rtdb.firebaseio.com/translatesports';

  // ---------- write ----------
  function push(coll, data) {
    data = Object.assign({}, data, { createdAt: Date.now() });
    return fetch(DB + '/' + coll + '.json', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { return j && j.name; });
  }
  function submitReservation(d) { return push('reservations', d); }
  function submitChange(d) { return push('changes', d); }

  // ---------- update (admin) ----------
  function patch(coll, id, data) {
    return fetch(DB + '/' + coll + '/' + id + '.json', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return true; });
  }
  function setReservationStatus(id, status) { return patch('reservations', id, { status: status }); }
  function setChangeStatus(id, status) { return patch('changes', id, { status: status }); }

  // ---------- delete (admin) ----------
  function del(coll, id) {
    return fetch(DB + '/' + coll + '/' + id + '.json', { method: 'DELETE' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return true; });
  }
  function deleteReservation(id) { return del('reservations', id); }
  function deleteChange(id) { return del('changes', id); }

  // ---------- read (admin) ----------
  function fetchColl(coll) {
    return fetch(DB + '/' + coll + '.json').then(function (r) { return r.ok ? r.json() : null; })
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
