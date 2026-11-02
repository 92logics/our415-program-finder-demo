/* 92 Logics demonstration — read-only pipeline status page. */
(function () {
  'use strict';
  const C = window.Our415Core, esc = C.escapeHtml, $ = s => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const BASE = 'https://data.sf.gov', ID = '8i3s-ih2a';
  const todaySF = params.get('today') || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
  const FRESH_HOURS = 36;
  const store = { get(k, d) { try { return JSON.parse(localStorage.getItem('our415demo.' + k)) ?? d; } catch (e) { return d; } }, set(k, v) { localStorage.setItem('our415demo.' + k, JSON.stringify(v)); } };
  const row = (cells) => '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
  const badge = s => `<span class="status-${s === 'OK' ? 'ok' : s === 'WARN' ? 'warn' : 'bad'}" data-status="${s}">${s}</span>`;
  // SF data_loaded_at is a floating timestamp in Pacific time; approximate offset (PST −8 / PDT −7).
  function pacificToMs(f) { if (!f) return NaN; const base = Date.parse(f.replace(/\.\d+$/, '') + 'Z'); const m = +f.slice(5, 7); const off = (m >= 4 && m <= 10) ? 7 : 8; return base + off * 36e5; }
  async function getJson(url, ms = 20000) { const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms); try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); } finally { clearTimeout(t); } }
  async function run(mode) {
    $('#runState').textContent = 'Checking…';
    const t0 = performance.now(); let rows, columns = null, total = null, live = false, err = null;
    if (mode !== 'snapshot') {
      try {
        const [meta, cnt, data] = await Promise.all([
          getJson(`${BASE}/api/views/${ID}.json`).catch(() => null),
          getJson(`${BASE}/resource/${ID}.json?$select=count(*)`),
          getJson(`${BASE}/resource/${ID}.json?$where=${encodeURIComponent(`event_end_date >= '${todaySF}'`)}&$limit=5000`)
        ]);
        rows = data; total = +cnt[0].count; live = true;
        columns = meta && meta.columns ? meta.columns.map(c => c.fieldName).filter(f => !f.startsWith(':')) : [...new Set(data.flatMap(r => Object.keys(r)))];
      } catch (e) { err = String(e.message || e); }
    }
    if (!rows) { const snap = await fetch('data/our415-events-snapshot.json').then(r => r.json()); rows = snap.rows; total = snap.rows.length; columns = [...new Set(rows.flatMap(r => Object.keys(r)))].concat(['fee']); }
    const ms = Math.round(performance.now() - t0);
    const q = C.qualityReport(rows); const drift = C.schemaDrift(columns);
    const ageH = q.lastLoadedAt ? Math.round((Date.now() - pacificToMs(q.lastLoadedAt)) / 36e5 * 10) / 10 : null;
    const log = store.get('fetchLog', []); log.unshift({ when: new Date().toISOString(), ok: live, rows: rows.length, ms, error: err, page: 'admin' }); store.set('fetchLog', log.slice(0, 20));
    $('#kpis').innerHTML = [
      ['Source', live ? 'Live API' : 'Snapshot', live ? 'data.sf.gov Socrata API' : (err ? 'Live check failed: ' + esc(err) : 'Offline mode')],
      ['Records in dataset', total, 'all rows'], ['Current/upcoming', q.rows, `ending on/after ${todaySF}`],
      ['Last loaded (Pacific)', esc((q.lastLoadedAt || '—').replace('T', ' ').slice(0, 16)), ageH !== null ? `${ageH} h ago` : ''],
      ['Mappable', q.withCoordsPct + '%', `${q.noCoords} without coordinates`], ['Check time', ms + ' ms', 'from this browser']
    ].map(([k, v, s]) => `<div class="kpi"><span>${k}</span><b>${v}</b><small>${s}</small></div>`).join('');
    const checks = [
      ['API reachable', live ? 'OK' : 'FAIL', live ? `Responded in ${ms} ms` : 'Using bundled snapshot. ' + esc(err || '')],
      ['Freshness (≤ ' + FRESH_HOURS + ' h; dataset updates daily)', ageH === null ? 'FAIL' : ageH <= FRESH_HOURS ? 'OK' : 'WARN', ageH === null ? 'No data_loaded_at' : `Last load ${ageH} h ago`],
      ['Schema: expected columns present', drift.missing.length ? 'FAIL' : 'OK', drift.missing.length ? 'Missing: ' + esc(drift.missing.join(', ')) : `${C.EXPECTED_COLUMNS.length} expected columns found`],
      ['Schema: new columns', drift.added.length ? 'WARN' : 'OK', drift.added.length ? 'New, not yet used by the site: ' + esc(drift.added.join(', ')) : 'None'],
      ['Unique IDs', q.dupIds ? 'FAIL' : 'OK', q.dupIds ? `${q.dupIds} duplicated IDs` : 'No duplicates'],
      ['Age tags mapped to filters', q.unmappedAgeTags.length ? 'WARN' : 'OK', q.unmappedAgeTags.length ? 'Unmapped: ' + esc(q.unmappedAgeTags.slice(0, 5).join(' | ')) : `${q.withAgePct}% of records mapped`],
      ['Coordinates & neighborhood', q.withCoordsPct >= 90 ? 'OK' : 'WARN', `${q.withCoordsPct}% with coordinates, ${q.withHoodPct}% with neighborhood`],
      ['Sign-up links present', q.withUrlPct >= 95 ? 'OK' : 'WARN', `${q.withUrlPct}% with a "more info" link`]
    ];
    $('#checks tbody').innerHTML = checks.map(([a, s, d]) => row([esc(a), badge(s), d])).join('');
    $('#bySource tbody').innerHTML = Object.entries(q.bySource).map(([k, v]) => row([esc(k), v])).join('');
    $('#byTopic tbody').innerHTML = Object.entries(q.byTopic).sort((a, b) => b[1] - a[1]).map(([k, v]) => row([esc(k), v])).join('');
    const issues = rows.map(C.normalize).filter(p => p.lat === null || !p.hood).slice(0, 10);
    $('#issues tbody').innerHTML = issues.map(p => row([esc(p.id), esc(p.name), p.lat === null ? 'No coordinates (cannot be mapped)' : 'No neighborhood'])).join('') || row(['—', 'None', '']);
    $('#log tbody').innerHTML = store.get('fetchLog', []).map(l => row([esc(new Date(l.when).toLocaleString()), esc(l.page || ''), l.ok ? badge('OK') : badge('FAIL') + ' ' + esc(l.error || ''), l.rows ?? '—', (l.ms ?? '—') + ' ms'])).join('');
    $('#runState').textContent = `Done (${live ? 'live' : 'snapshot'}).`;
    document.body.dataset.checked = live ? 'live' : 'snapshot';
  }
  $('#runBtn').addEventListener('click', () => run());
  run(params.get('source'));
})();
