/* 92 Logics demonstration — Our415-style program finder core logic (no City/DCYF code).
   Pure functions, used by the browser app, the admin page and the Node unit tests. */
(function (root) {
  'use strict';
  const AGE_BUCKETS = ['baby', 'child', 'teen', 'tay', 'family'];
  const TOPICS = ['reading', 'swim', 'sports', 'arts', 'stem', 'learning', 'outdoors', 'other'];
  const TOPIC_RULES = [
    ['learning', /\b(after ?school|afterschool|homework|tutor\w*)\b/i],
    ['reading', /\b(story ?time|storytime|story hour|book|read|reading|librar|picture book|rhyme|literacy)\b/i],
    ['swim', /\b(swim|pool|aquatic|water exercise|lap)\b/i],
    ['stem', /\b(stem|steam|science|robot|coding|code|tech|computer|math|lego|maker|engineer|3d|chess)\b/i],
    ['arts', /\b(art|arts|craft|draw|paint|danc|music|sing|song|theat|film|photo|ceramic|pottery|piano|guitar|drum|choir|poetry)\w*/i],
    ['sports', /\b(soccer|basketball|baseball|softball|tennis|volleyball|sport|fitness|yoga|martial|karate|gym|gymnastic|skate|track|run|futsal|pickleball|golf|climb|boxing|flag football|cheer|exercise|tumbl)\w*/i],
    ['learning', /\b(homework|tutor|college|job|career|resume|esl|english|class|workshop|financial|study|leadership|internship|volunteer|teen advisory|citizenship|language)\w*/i],
    ['outdoors', /\b(camp|nature|outdoor|hike|garden|park explor|bird|beach|farm|trail|tree)\w*/i]
  ];
  const HOODS = ['Bayview Hunters Point', 'Bernal Heights', 'Castro/Upper Market', 'Chinatown', 'Excelsior', 'Financial District/South Beach', 'Glen Park', 'Golden Gate Park', 'Haight Ashbury', 'Hayes Valley', 'Inner Richmond', 'Inner Sunset', 'Japantown', 'Lakeshore', 'Lincoln Park', 'Lone Mountain/USF', 'Marina', 'McLaren Park', 'Mission', 'Mission Bay', 'Nob Hill', 'Noe Valley', 'North Beach', 'Oceanview/Merced/Ingleside', 'Outer Mission', 'Outer Richmond', 'Pacific Heights', 'Portola', 'Potrero Hill', 'Presidio', 'Presidio Heights', 'Russian Hill', 'Seacliff', 'South of Market', 'Sunset/Parkside', 'Tenderloin', 'Treasure Island', 'Twin Peaks', 'Visitacion Valley', 'West of Twin Peaks', 'Western Addition'];
  const HOOD_ALIASES = { 'soma': 'South of Market', 'the mission': 'Mission', 'mission district': 'Mission', 'bayview': 'Bayview Hunters Point', 'hunters point': 'Bayview Hunters Point', 'castro': 'Castro/Upper Market', 'upper market': 'Castro/Upper Market', 'sunset': 'Sunset/Parkside', 'parkside': 'Sunset/Parkside', 'richmond': 'Outer Richmond', 'haight': 'Haight Ashbury', 'visitacion': 'Visitacion Valley', 'vis valley': 'Visitacion Valley', 'ingleside': 'Oceanview/Merced/Ingleside', 'oceanview': 'Oceanview/Merced/Ingleside', 'fillmore': 'Western Addition', 'potrero': 'Potrero Hill', 'bernal': 'Bernal Heights', 'noe': 'Noe Valley', 'chinatown': 'Chinatown', '唐人街': 'Chinatown', 'tenderloin': 'Tenderloin', 'excelsior': 'Excelsior', 'portola': 'Portola', 'marina': 'Marina' };
  const DAYS = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];
  const DAY_WORDS = { sunday: 'su', sundays: 'su', monday: 'mo', mondays: 'mo', tuesday: 'tu', tuesdays: 'tu', wednesday: 'we', wednesdays: 'we', thursday: 'th', thursdays: 'th', friday: 'fr', fridays: 'fr', saturday: 'sa', saturdays: 'sa', 'sábado': 'sa', sabado: 'sa', domingo: 'su', 'lunes': 'mo', 'martes': 'tu', 'miércoles': 'we', 'jueves': 'th', 'viernes': 'fr', 'sabado ': 'sa', 'linggo': 'su', 'sabadong': 'sa', '星期六': 'sa', '周六': 'sa', '星期日': 'su', '周日': 'su' };
  const TOPIC_WORDS = {
    reading: ['story', 'storytime', 'stories', 'books', 'book', 'reading', 'read', 'library', 'cuentos', 'lectura', 'libro', 'libros', '故事', '阅读', '圖書', '图书', 'kuwento', 'aklat', 'truyện'],
    swim: ['swim', 'swimming', 'swimmer', 'pool', 'natación', 'natacion', 'nadar', 'piscina', '游泳', 'langoy', 'paglangoy', 'bơi'],
    sports: ['sport', 'sports', 'soccer', 'basketball', 'baseball', 'tennis', 'volleyball', 'yoga', 'fitness', 'gym', 'gymnastics', 'skate', 'skating', 'martial', 'karate', 'exercise', 'active', 'deporte', 'deportes', 'fútbol', 'futbol', '运动', '體育', '足球', 'isport', 'basketbol', 'thể thao'],
    arts: ['art', 'arts', 'craft', 'crafts', 'drawing', 'painting', 'dance', 'dancing', 'music', 'singing', 'theater', 'theatre', 'film', 'arte', 'música', 'musica', 'baile', 'danza', '艺术', '藝術', '音乐', '跳舞', 'sining', 'musika', 'sayaw', 'nghệ thuật'],
    stem: ['stem', 'steam', 'science', 'robot', 'robotics', 'coding', 'code', 'tech', 'technology', 'computer', 'computers', 'math', 'lego', 'maker', 'chess', 'ciencia', 'tecnología', 'tecnologia', '科学', '编程', 'agham', 'khoa học'],
    learning: ['homework', 'tutoring', 'tutor', 'college', 'job', 'jobs', 'career', 'resume', 'esl', 'english', 'class', 'classes', 'workshop', 'leadership', 'tarea', 'clases', 'empleo', '功课', '学习', 'trabaho', 'học'],
    outdoors: ['camp', 'camps', 'nature', 'outdoor', 'outdoors', 'hike', 'hiking', 'garden', 'gardening', 'campamento', 'naturaleza', '户外', '露营', 'kalikasan']
  };
  const AGE_WORDS = { baby: ['baby', 'babies', 'infant', 'toddler', 'toddlers', 'preschool', 'preschooler', 'preschoolers', 'bebé', 'bebe', 'niño pequeño', '婴儿', '幼儿', 'sanggol', 'em bé'], child: ['kid', 'kids', 'child', 'children', 'elementary', 'tween', 'tweens', 'pre-teen', 'preteen', 'niño', 'niños', 'nino', 'ninos', 'niña', 'hijo', 'hija', '儿童', '孩子', 'bata', 'anak', 'trẻ em'], teen: ['teen', 'teens', 'teenager', 'teenagers', 'high school', 'middle school', 'adolescente', 'adolescentes', '青少年', 'tinedyer'], tay: ['young adult', 'young adults', 'tay', '18-24', 'joven adulto', 'jóvenes', 'jovenes', '青年'], family: ['family', 'families', 'parent', 'parents', 'familia', 'familias', '家庭', 'pamilya', 'gia đình'] };
  const FREE_WORDS = ['free', 'no cost', 'no-cost', 'gratis', 'gratuito', 'gratuita', 'sin costo', '免费', '免費', 'libre', 'libreng', 'walang bayad', 'miễn phí'];
  const GENERIC = new Set(['story', 'stories', 'books', 'book', 'reading', 'read', 'library', 'swim', 'swimming', 'pool', 'sport', 'sports', 'active', 'exercise', 'fitness', 'art', 'arts', 'stem', 'steam', 'science', 'tech', 'technology', 'learning', 'class', 'classes', 'workshop', 'outdoor', 'outdoors', 'nature', 'camp', 'camps', 'natación', 'natacion', 'nadar', 'deporte', 'deportes', 'arte', 'ciencia', 'clases', '游泳', '运动', '艺术', '藝術', '科学', '学习', 'langoy', 'sining', 'agham']);
  const STOP = new Set('a an the for my our in on at of to and or with near around this next that is are me i we kids kid child children some any things thing activities activity program programs events event something find show looking look want need year years old yr yrs y o age aged ages sf san francisco que para mi en el la los las de y con'.split(' '));

  function ageBuckets(tag) {
    const t = (tag || '').toLowerCase(); const b = new Set();
    if (!t) return [];
    if (t.includes('all ages')) return AGE_BUCKETS.slice();
    if (/bab|toddler|preschool/.test(t)) b.add('baby');
    if (/child|pre-teen|preteen|ages 5-13/.test(t)) b.add('child');
    if (/\bteen|ages 13-18/.test(t.replace(/pre-teen/g, ''))) b.add('teen');
    if (/\btay\b|tay \(|18-24|young adult/.test(t)) b.add('tay');
    if (/famil/.test(t)) b.add('family');
    return AGE_BUCKETS.filter(x => b.has(x));
  }
  function ageToBucket(n) { if (n < 0 || n > 120) return null; if (n <= 4) return 'baby'; if (n <= 12) return 'child'; if (n <= 17) return 'teen'; if (n <= 24) return 'tay'; return 'family'; }
  function topicOf(name, desc) {
    const n = name || '', d = desc || '';
    for (const [k, re] of TOPIC_RULES) if (re.test(n)) return k;
    for (const [k, re] of TOPIC_RULES) if (re.test(d)) return k;
    return 'other';
  }
  function parseDate(s) { if (!s) return null; const m = String(s).match(/(\d{4})[-/](\d{2})[-/](\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : null; }
  function weekdayOf(iso) { const [y, m, d] = iso.split('-').map(Number); return DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]; }
  function parseDays(s, start, end) {
    if (!s || /tbd/i.test(s)) { if (start && start === end) return [weekdayOf(start)]; return null; }
    const map = { m: 'mo', mo: 'mo', mon: 'mo', t: 'tu', tu: 'tu', tue: 'tu', w: 'we', we: 'we', wed: 'we', th: 'th', thu: 'th', f: 'fr', fr: 'fr', fri: 'fr', sa: 'sa', sat: 'sa', s: 'su', su: 'su', sun: 'su' };
    const out = new Set();
    for (const part of s.split(/[,/ ]+/)) {
      const p = part.trim().toLowerCase(); if (!p) continue;
      const rg = p.match(/^([a-z]+)-([a-z]+)$/);
      if (rg && map[rg[1]] && map[rg[2]]) { let i = DAYS.indexOf(map[rg[1]]); const j = DAYS.indexOf(map[rg[2]]); for (let k = 0; k < 7; k++) { out.add(DAYS[i]); if (i === j) break; i = (i + 1) % 7; } }
      else if (map[p]) out.add(map[p]);
    }
    return out.size ? DAYS.filter(d => out.has(d)) : null;
  }
  function normalize(r) {
    const start = parseDate(r.event_start_date), end = parseDate(r.event_end_date) || start;
    const lat = parseFloat(r.latitude), lon = parseFloat(r.longitude);
    const fee = r.fee === true || r.fee === 'true';
    return {
      id: String(r.id), org: r.org_name || '', name: (r.event_name || '').trim(), desc: (r.event_description || '').trim(),
      start, end, days: parseDays(r.days_of_week, start, end), st: (r.start_time || '').slice(0, 5), et: (r.end_time || '').slice(0, 5),
      url: r.more_info ? (/^https?:/i.test(r.more_info) ? r.more_info : 'https://' + r.more_info) : '',
      free: !fee, loc: r.site_location_name || '', addr: r.site_address || '', hood: r.analysis_neighborhood || '',
      lat: isFinite(lat) ? lat : null, lon: isFinite(lon) ? lon : null,
      srcCat: r.events_category || '', topic: topicOf(r.event_name, r.event_description), ageTag: r.age_group_eligibility_tags || '',
      ages: ageBuckets(r.age_group_eligibility_tags), langs: r.language_eligibility_tags || '', loadedAt: r.data_loaded_at || ''
    };
  }
  function tokens(s) { return (s || '').toLowerCase().normalize('NFKC').split(/[^\p{L}\p{N}'-]+/u).filter(Boolean); }
  function hasPhrase(text, w) { return (' ' + text + ' ').includes(' ' + w + ' ') || (/[\u3400-\u9fff]/.test(w) && text.includes(w)); }

  /* Plain-language intent parser (client-side, rule-based; stands in for a semantic/AI search service). */
  function parseQuery(q, today) {
    const raw = (q || '').trim(); let text = ' ' + raw.toLowerCase().normalize('NFKC').replace(/[?!.,;]/g, ' ').replace(/\s+/g, ' ') + ' ';
    const intent = { age: null, ageBucket: null, free: null, topic: null, hood: null, day: null, timeOfDay: null, keywords: [], understood: [] };
    const eat = s => { text = text.replace(s, ' '); };
    // age: "8 year old", "8-year-old", "age 8", "8 años", "8岁", "8 taong gulang"
    const am = text.match(/(\d{1,2})\s*(?:-|\s)?(?:year|yr|yo\b|y\/o|años|anos|岁|歲|taong|tuổi)/) || text.match(/\b(?:age|aged|ages|edad)\s*(\d{1,2})\b/);
    if (am) { intent.age = +am[1]; intent.ageBucket = ageToBucket(intent.age); eat(am[0]); text = text.replace(/\b(old|gulang)\b/g, ' '); }
    if (!intent.ageBucket) for (const b of AGE_BUCKETS) { const w = AGE_WORDS[b].find(w => hasPhrase(text, w)); if (w) { intent.ageBucket = b; eat(w); break; } }
    const fw = FREE_WORDS.find(w => hasPhrase(text, w)); if (fw) { intent.free = true; eat(fw); }
    for (const t of Object.keys(TOPIC_WORDS)) { const w = TOPIC_WORDS[t].find(w => hasPhrase(text, w)); if (w) { intent.topic = t; eat(w); if (!GENERIC.has(w)) intent.specific = w; break; } }
    const alias = Object.keys(HOOD_ALIASES).sort((a, b) => b.length - a.length).find(a => hasPhrase(text, a));
    const hood = HOODS.slice().sort((a, b) => b.length - a.length).find(h => hasPhrase(text, h.toLowerCase()));
    if (hood) { intent.hood = hood; eat(hood.toLowerCase()); } else if (alias) { intent.hood = HOOD_ALIASES[alias]; eat(alias); }
    if (/\b(weekend|weekends|fin de semana)\b/.test(text)) { intent.day = 'weekend'; eat(/\b(this )?(weekend|weekends|fin de semana)\b/); }
    else if (/\btoday\b|\bhoy\b/.test(text) && today) { intent.day = weekdayOf(today); eat(/\btoday\b|\bhoy\b/); }
    else if (/\btomorrow\b|\bmañana\b/.test(text) && today) { const [y, m, d] = today.split('-').map(Number); intent.day = DAYS[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 1) % 7]; eat(/\btomorrow\b|\bmañana\b/); }
    else { const dw = Object.keys(DAY_WORDS).find(w => hasPhrase(text, w.trim())); if (dw) { intent.day = DAY_WORDS[dw]; eat(dw.trim()); } }
    const tod = text.match(/\b(morning|mornings|afternoon|afternoons|evening|evenings|after school|after-school)\b/);
    if (tod) { intent.timeOfDay = /morning/.test(tod[1]) ? 'morning' : /after/.test(tod[1]) && /school/.test(tod[1]) ? 'afternoon' : /afternoon/.test(tod[1]) ? 'afternoon' : 'evening'; eat(tod[0]); }
    intent.keywords = tokens(text).filter(w => !STOP.has(w) && w.length > 1 && !/^\d+$/.test(w));
    if (intent.specific) intent.keywords.unshift(intent.specific);
    return intent;
  }
  function inTimeOfDay(st, tod) { if (!tod) return true; if (!st) return false; const h = +st.slice(0, 2); return tod === 'morning' ? h < 12 : tod === 'afternoon' ? h >= 12 && h < 17 : h >= 17; }
  function matchesDay(p, day) {
    if (!day) return true; if (!p.days) return true; // ongoing / unspecified days are kept
    return day === 'weekend' ? p.days.includes('sa') || p.days.includes('su') : p.days.includes(day);
  }
  /* filters = { ageBucket, hood, free (true|false|null), topic, day, timeOfDay, keywords[] , today } */
  function filterAndRank(items, f) {
    const kws = (f.keywords || []).map(k => k.toLowerCase());
    const out = [];
    for (const p of items) {
      if (f.today && p.end && p.end < f.today) continue;
      if (f.ageBucket && !(p.ages.includes(f.ageBucket) || p.ages.length === 0 && false)) continue;
      if (f.hood && p.hood !== f.hood) continue;
      if (f.free === true && !p.free) continue;
      if (f.free === false && p.free) continue;
      if (f.topic && p.topic !== f.topic) continue;
      if (!matchesDay(p, f.day)) continue;
      if (!inTimeOfDay(p.st, f.timeOfDay)) continue;
      let score = 0;
      if (kws.length) {
        const n = p.name.toLowerCase(), d = (p.desc + ' ' + p.loc + ' ' + p.org).toLowerCase(); let hit = 0;
        for (const k of kws) { const stem = k.length > 4 ? k.replace(/(ing|es|s)$/, '') : k; if (n.includes(stem)) { score += 3; hit++; } else if (d.includes(stem)) { score += 1; hit++; } }
        if (!hit) continue;
      }
      out.push({ p, score });
    }
    out.sort((a, b) => b.score - a.score || String(a.p.start).localeCompare(String(b.p.start)) || a.p.name.localeCompare(b.p.name));
    return out.map(x => x.p);
  }
  /* Search with graceful relaxation: if nothing matches, drop the least important constraints one at a time. */
  function search(items, intent, today) {
    const f = Object.assign({}, intent, { today });
    let res = filterAndRank(items, f); const relaxed = [];
    for (const k of ['timeOfDay', 'day', 'hood', 'free', 'keywords']) {
      if (res.length) break;
      if (f[k] === null || f[k] === undefined || (Array.isArray(f[k]) && !f[k].length)) continue;
      f[k] = Array.isArray(f[k]) ? [] : null; relaxed.push(k); res = filterAndRank(items, f);
    }
    return { results: res, relaxed };
  }
  /* Data-pipeline checks used by the admin page */
  const EXPECTED_COLUMNS = ['id', 'org_name', 'event_name', 'event_description', 'event_start_date', 'event_end_date', 'days_of_week', 'start_time', 'end_time', 'more_info', 'fee', 'site_location_name', 'events_category', 'age_group_eligibility_tags', 'site_address', 'latitude', 'longitude', 'analysis_neighborhood', 'data_loaded_at'];
  function schemaDrift(columns) { const set = new Set(columns); return { missing: EXPECTED_COLUMNS.filter(c => !set.has(c)), added: columns.filter(c => !EXPECTED_COLUMNS.includes(c)) }; }
  function qualityReport(rawRows) {
    const n = rawRows.length; const items = rawRows.map(normalize); const pct = k => n ? Math.round(1000 * k / n) / 10 : 0;
    const noCoords = items.filter(p => p.lat === null).length, noHood = items.filter(p => !p.hood).length;
    const noAge = items.filter(p => p.ages.length === 0).length, noUrl = items.filter(p => !p.url).length;
    const ids = new Map(); rawRows.forEach(r => ids.set(r.id, (ids.get(r.id) || 0) + 1)); const dupIds = [...ids.values()].filter(v => v > 1).length;
    const loaded = rawRows.map(r => r.data_loaded_at || '').filter(Boolean).sort();
    const byTopic = {}; items.forEach(p => { byTopic[p.topic] = (byTopic[p.topic] || 0) + 1; });
    const bySource = {}; items.forEach(p => { bySource[p.org] = (bySource[p.org] || 0) + 1; });
    const unmappedAgeTags = [...new Set(items.filter(p => p.ageTag && p.ages.length === 0).map(p => p.ageTag))];
    return { rows: n, withCoordsPct: pct(n - noCoords), withHoodPct: pct(n - noHood), withAgePct: pct(n - noAge), withUrlPct: pct(n - noUrl), noCoords, noHood, noAge, dupIds, lastLoadedAt: loaded[loaded.length - 1] || null, byTopic, bySource, unmappedAgeTags };
  }
  function hoursSince(isoFloating, nowMs, tzOffsetHours) { if (!isoFloating) return null; const t = Date.parse(isoFloating.replace(/\.\d+$/, '') + (tzOffsetHours === undefined ? 'Z' : '')); return Math.round((nowMs - t) / 36e5 * 10) / 10; }
  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function icsFor(p) {
    const d = (p.start || '').replace(/-/g, ''); const t = (p.st || '00:00').replace(':', '') + '00'; const te = (p.et || p.st || '01:00').replace(':', '') + '00';
    const esc = s => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, ' ');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//92 Logics//Our415 demo//EN', 'BEGIN:VEVENT', 'UID:' + p.id + '@our415-demo.92logics', 'DTSTART;TZID=America/Los_Angeles:' + d + 'T' + t, 'DTEND;TZID=America/Los_Angeles:' + d + 'T' + te, 'SUMMARY:' + esc(p.name), 'LOCATION:' + esc(p.loc + ', ' + p.addr), 'DESCRIPTION:' + esc('Listing from SF Open Data (Our415 Events and Activities). Confirm details with the provider: ' + p.url), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  const api = { AGE_BUCKETS, TOPICS, HOODS, EXPECTED_COLUMNS, ageBuckets, ageToBucket, topicOf, parseDays, weekdayOf, normalize, parseQuery, filterAndRank, search, matchesDay, inTimeOfDay, schemaDrift, qualityReport, hoursSince, escapeHtml, icsFor, tokens };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Our415Core = api;
})(typeof self !== 'undefined' ? self : this);
