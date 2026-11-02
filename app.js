/* 92 Logics demonstration app — Our415-style program finder. Not a City/DCYF system. */
(function () {
  'use strict';
  const C = window.Our415Core, I = window.Our415I18n;
  const $ = s => document.querySelector(s), esc = C.escapeHtml;
  const params = new URLSearchParams(location.search);
  const LIVE_API = 'https://data.sf.gov/resource/8i3s-ih2a.json';
  const FIELDS = 'id,org_name,event_name,event_description,event_start_date,event_end_date,days_of_week,start_time,end_time,more_info,fee,site_location_name,events_category,age_group_eligibility_tags,language_eligibility_tags,site_address,latitude,longitude,analysis_neighborhood,data_loaded_at';
  const todaySF = params.get('today') || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem('our415demo.' + k)) ?? d; } catch (e) { return d; } },
    set(k, v) { localStorage.setItem('our415demo.' + k, JSON.stringify(v)); }
  };
  let lang = store.get('lang', null) || (I.langs.includes(params.get('lang')) ? params.get('lang') : 'en');
  let T = I.S[lang];
  let items = [], byId = new Map(), dataInfo = { mode: 'snapshot', at: '' };
  let intent = emptyIntent(), current = [], shown = 20, map = null, layer = null, markers = new Map();
  function emptyIntent() { return { ageBucket: null, hood: null, free: null, topic: null, day: null, timeOfDay: null, keywords: [] }; }

  // ---------- i18n ----------
  function applyLang() {
    T = I.S[lang]; document.documentElement.lang = I.HTML_LANG[lang];
    document.querySelectorAll('[data-i]').forEach(el => { const v = T[el.dataset.i]; if (typeof v === 'string') el.textContent = v; });
    document.querySelectorAll('[data-iph]').forEach(el => { el.placeholder = T[el.dataset.iph]; });
    document.querySelectorAll('[data-ia]').forEach(el => { el.setAttribute('aria-label', T[el.dataset.ia]); });
    $('#langNote').hidden = lang === 'en';
    fillSelects(); renderUnderstood(); render(); renderSaved(); renderStatus();
  }
  function opt(v, label, sel) { return `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(label)}</option>`; }
  function fillSelects() {
    $('#lang').innerHTML = I.langs.map(l => opt(l, I.S[l].name, l === lang)).join('');
    const hoods = [...new Set(items.map(p => p.hood).filter(Boolean))].sort();
    const ageOpts = sel => opt('', T.anyAge) + C.AGE_BUCKETS.map(b => opt(b, T.ages[b], sel === b)).join('');
    const hoodOpts = sel => opt('', T.anyHood) + hoods.map(h => opt(h, h, sel === h)).join('');
    $('#fAge').innerHTML = ageOpts(intent.ageBucket);
    $('#fHood').innerHTML = hoodOpts(intent.hood);
    $('#fCost').innerHTML = opt('', T.anyCost) + opt('free', T.free, intent.free === true) + opt('paid', T.paid, intent.free === false);
    $('#fCat').innerHTML = opt('', T.anyCat) + C.TOPICS.map(t => opt(t, T.topics[t], intent.topic === t)).join('');
    $('#fDay').innerHTML = opt('', T.anyDay) + ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su', 'weekend'].map(d => opt(d, T.days[d], intent.day === d)).join('');
    const prefs = store.get('prefs', {});
    $('#pAge').innerHTML = ageOpts(prefs.age); $('#pHood').innerHTML = hoodOpts(prefs.hood);
  }

  // ---------- data ----------
  function load(rows, info) { items = rows.map(C.normalize); byId = new Map(items.map(p => [p.id, p])); dataInfo = info; fillSelects(); run(); renderSaved(); renderStatus(); }
  function renderStatus() {
    const el = $('#dataStatus'); if (!el || !T) return;
    el.textContent = dataInfo.mode === 'live' ? T.dataLive(dataInfo.at) : T.dataSnap(dataInfo.at);
    el.dataset.mode = dataInfo.mode;
  }
  async function boot() {
    applyLang();
    const snap = await fetch('data/our415-events-snapshot.json').then(r => r.json());
    load(snap.rows, { mode: 'snapshot', at: snap.meta.max_data_loaded_at.slice(0, 16).replace('T', ' ') });
    if (params.get('source') !== 'snapshot') refreshLive();
    if (params.get('q')) { $('#q').value = params.get('q'); doSearch(params.get('q')); }
  }
  async function refreshLive() {
    const t0 = performance.now(); const log = store.get('fetchLog', []);
    const url = `${LIVE_API}?$select=${FIELDS}&$where=${encodeURIComponent(`event_end_date >= '${todaySF}'`)}&$limit=5000`;
    try {
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 20000);
      const r = await fetch(url, { signal: ctl.signal }); clearTimeout(to);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const rows = await r.json(); if (!Array.isArray(rows) || !rows.length) throw new Error('empty response');
      const at = rows.map(x => x.data_loaded_at || '').sort().pop() || '';
      log.unshift({ when: new Date().toISOString(), ok: true, rows: rows.length, ms: Math.round(performance.now() - t0), loadedAt: at, page: 'finder' });
      store.set('fetchLog', log.slice(0, 20));
      const keep = intent; load(rows, { mode: 'live', at: at.slice(0, 16).replace('T', ' ') }); intent = keep; fillSelects(); run();
    } catch (e) {
      log.unshift({ when: new Date().toISOString(), ok: false, error: String(e.message || e), ms: Math.round(performance.now() - t0), page: 'finder' });
      store.set('fetchLog', log.slice(0, 20));
    }
  }

  // ---------- search ----------
  function doSearch(q) {
    const parsed = C.parseQuery(q, todaySF);
    intent = { ageBucket: parsed.ageBucket, hood: parsed.hood, free: parsed.free, topic: parsed.topic, day: parsed.day, timeOfDay: parsed.timeOfDay, keywords: parsed.keywords, age: parsed.age };
    fillSelects(); run(true);
  }
  let relaxed = [];
  function run(focus) {
    const r = C.search(items, intent, todaySF); current = r.results; relaxed = r.relaxed; shown = 20;
    renderUnderstood(); render();
    if (focus) $('#resCount').focus?.();
  }
  function chipLabel(k) {
    const v = intent[k];
    if (k === 'ageBucket') return T.ages[v] + (intent.age != null ? ` · ${intent.age}` : '');
    if (k === 'free') return v ? T.free : T.paid;
    if (k === 'topic') return T.topics[v];
    if (k === 'day') return T.days[v];
    if (k === 'timeOfDay') return T.tod[v];
    if (k === 'keywords') return v.join(' ');
    return v;
  }
  function renderUnderstood() {
    const el = $('#understood'); if (!el || !T) return;
    const keys = ['ageBucket', 'free', 'topic', 'hood', 'day', 'timeOfDay', 'keywords'].filter(k => intent[k] !== null && intent[k] !== undefined && !(Array.isArray(intent[k]) && !intent[k].length));
    let h = keys.length ? `<strong>${esc(T.understood)}:</strong> ` + keys.map(k => `<span class="chip" data-k="${k}">${esc(T.chip[k])}: ${esc(chipLabel(k))} <button type="button" aria-label="${esc(T.remove)} ${esc(T.chip[k])}: ${esc(chipLabel(k))}" data-rm="${k}">×</button></span>`).join(' ') : '';
    if (relaxed.length) h += `<p class="relaxed" id="relaxedNote">${esc(T.relaxed)} ${relaxed.map(k => esc(T.chip[k])).join(', ')}</p>`;
    el.innerHTML = h;
  }
  function fmtWhen(p) {
    const loc = I.HTML_LANG[lang];
    const d = iso => new Date(iso + 'T12:00:00Z').toLocaleDateString(loc, { weekday: p.start === p.end ? 'short' : undefined, month: 'short', day: 'numeric', timeZone: 'UTC' });
    const tm = s => { if (!s) return ''; const [h, m] = s.split(':').map(Number); return new Date(Date.UTC(2026, 0, 1, h, m)).toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }); };
    let s = p.start ? (p.start === p.end ? d(p.start) : `${d(p.start)} – ${d(p.end)}`) : T.ongoing;
    if (p.days && p.start !== p.end) s += ' · ' + p.days.map(x => T.days[x].slice(0, 3)).join(', ');
    if (p.st) s += ` · ${tm(p.st)}${p.et ? '–' + tm(p.et) : ''}`;
    return s;
  }
  function card(p, ctx) {
    const saved = store.get('saved', []).includes(p.id);
    return `<li class="card" id="c-${ctx}-${esc(p.id)}" data-id="${esc(p.id)}"><article aria-labelledby="t-${ctx}-${esc(p.id)}">
      <h3 id="t-${ctx}-${esc(p.id)}">${esc(p.name)}</h3>
      <p class="meta">${esc(fmtWhen(p))}</p>
      <p class="meta">${esc(p.loc)}${p.hood ? ' · ' + esc(p.hood) : ''} · ${esc(p.org)}</p>
      <div class="tags">${p.free ? `<span class="tag free">${esc(T.free_b)}</span>` : `<span class="tag">${esc(T.fee_b)}</span>`}<span class="tag">${esc(T.topics[p.topic])}</span>${p.ages.map(a => `<span class="tag">${esc(T.ages[a])}</span>`).join('')}</div>
      ${p.desc ? `<p class="desc">${esc(p.desc.length > 220 ? p.desc.slice(0, 217) + '…' : p.desc)}</p>` : ''}
      <div class="actions">
        <button type="button" class="secondary saveBtn" data-save="${esc(p.id)}" aria-pressed="${saved}">${esc(saved ? T.saved : T.save)}<span class="sr-only">: ${esc(p.name)}</span></button>
        ${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(T.details)}<span class="sr-only">: ${esc(p.name)} (opens provider site)</span></a>` : ''}
        ${p.start ? `<button type="button" class="link icsBtn" data-ics="${esc(p.id)}">${esc(T.addCal)}</button>` : ''}
        ${ctx === 'r' && p.lat !== null ? `<button type="button" class="link mapBtn" data-map="${esc(p.id)}">${esc(T.onMap)}</button>` : ''}
      </div></article></li>`;
  }
  function render() {
    if (!T || !$('#list')) return;
    $('#resCount').textContent = current.length ? `${T.results(current.length)}${current.length > shown ? ' · ' + T.showing(Math.min(shown, current.length), current.length) : ''}` : T.noResults;
    $('#list').innerHTML = current.slice(0, shown).map(p => card(p, 'r')).join('');
    $('#moreBtn').hidden = current.length <= shown;
    renderMap();
  }
  // ---------- map ----------
  function renderMap() {
    if (!window.L) { if ($('#map')) $('#map').textContent = T.mapOff; return; }
    if (!map) {
      map = L.map('map', { scrollWheelZoom: false }).setView([37.7599, -122.4348], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap contributors' }).addTo(map);
      layer = L.layerGroup().addTo(map);
    }
    layer.clearLayers(); markers.clear();
    const pts = current.filter(p => p.lat !== null).slice(0, 400);
    for (const p of pts) {
      const m = L.circleMarker([p.lat, p.lon], { radius: 6, color: '#073a50', weight: 1, fillColor: p.free ? '#1d6b35' : '#0b4f6c', fillOpacity: .85 })
        .bindPopup(`<strong>${esc(p.name)}</strong><br>${esc(p.loc)}<br>${esc(fmtWhen(p))}`);
      m.addTo(layer); markers.set(p.id, m);
    }
    if (pts.length) { const b = L.latLngBounds(pts.map(p => [p.lat, p.lon])); map.fitBounds(b.pad(0.1), { maxZoom: 15 }); }
  }
  // ---------- saved / prefs ----------
  function toggleSave(id) {
    const s = store.get('saved', []); const i = s.indexOf(id); if (i >= 0) s.splice(i, 1); else s.push(id); store.set('saved', s);
    document.querySelectorAll(`[data-save="${CSS.escape(id)}"]`).forEach(b => { const on = s.includes(id); b.setAttribute('aria-pressed', on); b.firstChild.textContent = on ? T.saved : T.save; });
    renderSaved();
  }
  function renderSaved() {
    if (!T) return;
    const s = store.get('saved', []); $('#savedCount').textContent = s.length;
    const list = s.map(id => byId.get(id)).filter(Boolean);
    $('#savedList').innerHTML = list.map(p => card(p, 's')).join('');
    $('#savedEmpty').hidden = list.length > 0;
    const prefs = store.get('prefs', {});
    const sug = (prefs.age || prefs.hood) ? C.filterAndRank(items, { ageBucket: prefs.age || null, hood: prefs.hood || null, today: todaySF }).filter(p => !s.includes(p.id)).slice(0, 5) : [];
    $('#suggestList').innerHTML = sug.map(p => card(p, 'g')).join('');
  }
  function downloadIcs(id) {
    const p = byId.get(id); if (!p) return;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([C.icsFor(p)], { type: 'text/calendar' }));
    a.download = 'our415-demo-' + p.id + '.ics'; document.body.appendChild(a); a.click(); a.remove();
  }
  // ---------- routing ----------
  function route() {
    const r = (location.hash.match(/^#\/(\w+)/) || [, 'find'])[1];
    ['find', 'saved', 'about'].forEach(v => { $('#view-' + v).hidden = v !== r; });
    document.querySelectorAll('[data-route]').forEach(a => a.dataset.route === r ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    if (r === 'find' && map) setTimeout(() => map.invalidateSize(), 50);
  }
  // ---------- events ----------
  $('#searchForm').addEventListener('submit', e => { e.preventDefault(); doSearch($('#q').value); });
  document.querySelectorAll('.ex').forEach(b => b.addEventListener('click', () => { $('#q').value = b.textContent; doSearch(b.textContent); }));
  const sel = (id, k, conv) => $(id).addEventListener('change', e => { intent[k] = conv(e.target.value); if (k === 'ageBucket') intent.age = null; run(); });
  sel('#fAge', 'ageBucket', v => v || null); sel('#fHood', 'hood', v => v || null); sel('#fCat', 'topic', v => v || null); sel('#fDay', 'day', v => v || null);
  sel('#fCost', 'free', v => v === 'free' ? true : v === 'paid' ? false : null);
  $('#clearBtn').addEventListener('click', () => { intent = emptyIntent(); $('#q').value = ''; fillSelects(); run(); });
  $('#understood').addEventListener('click', e => { const k = e.target.dataset.rm; if (!k) return; intent[k] = k === 'keywords' ? [] : null; if (k === 'ageBucket') intent.age = null; fillSelects(); run(); $('#q').focus(); });
  $('#moreBtn').addEventListener('click', () => { shown += 20; render(); });
  document.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.save) toggleSave(t.dataset.save);
    if (t.dataset.ics) downloadIcs(t.dataset.ics);
    if (t.dataset.map && markers.has(t.dataset.map)) { const m = markers.get(t.dataset.map); map.setView(m.getLatLng(), 16); m.openPopup(); $('#map').scrollIntoView({ block: 'center' }); }
  });
  $('#lang').addEventListener('change', e => { lang = e.target.value; store.set('lang', lang); applyLang(); });
  $('#textBtn').addEventListener('click', e => { const on = document.documentElement.classList.toggle('big'); e.currentTarget.setAttribute('aria-pressed', on); store.set('big', on); });
  if (store.get('big', false)) { document.documentElement.classList.add('big'); $('#textBtn').setAttribute('aria-pressed', 'true'); }
  $('#prefsForm').addEventListener('submit', e => { e.preventDefault(); store.set('prefs', { age: $('#pAge').value || null, hood: $('#pHood').value || null }); $('#prefsMsg').textContent = T.prefSaved; renderSaved(); });
  window.addEventListener('hashchange', route);
  $('#resCount').setAttribute('tabindex', '-1');
  route(); boot();
  window.__our415demo = { get items() { return items; }, get current() { return current; }, get intent() { return intent; }, get dataInfo() { return dataInfo; } };
})();
