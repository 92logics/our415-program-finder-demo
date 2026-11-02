# Our415-style Program Finder — 92 Logics demonstration

**This is a demonstration built by 92 Logics for the San Francisco DCYF 2027 Our415 RFP (Service Area 1: Web Design & Development). It is not a City and County of San Francisco, DCYF or Our415.org website, and is not endorsed by them.**

Live: https://92logics.github.io/our415-program-finder-demo/

- **Data:** public SF Open Data dataset [Our415 Events and Activities (8i3s-ih2a)](https://data.sf.gov/d/8i3s-ih2a), PDDL. A snapshot (2 Nov 2026) loads first; the browser then refreshes from the live Socrata API.
- **Plain-language search:** client-side intent parser (age, cost, topic, neighborhood, day, time of day; some Spanish/Chinese/Filipino words) with removable "we understood" chips and graceful widening when nothing matches. Stand-in for a semantic/AI search service.
- **Filters:** age group, neighborhood, cost, category (demo-derived topic), day. **Map:** Leaflet + OpenStreetMap, with a list equivalent for every marker.
- **Languages:** EN / ES / 中文 / Filipino / Tiếng Việt interface — *sample translations, not City-reviewed*.
- **Saved programs & preferences:** localStorage stand-in for user accounts; nothing leaves the browser. Add-to-calendar (.ics).
- **Accessibility:** WCAG 2.1 AA practices; axe-core checks in the test suite.
- **Admin:** `admin.html` — read-only data pipeline status (reachability, freshness, schema drift, completeness, records needing attention, fetch log).

Static HTML/CSS/vanilla JS. No tracking, no back end.

Tests: `node tests/core.test.js` and `NODE_PATH=<dir with puppeteer-core + axe-core> node tests/e2e.js <baseUrl> <shotsDir>`.

© 2026 92 Logics. MIT licence. Data © City and County of San Francisco, PDDL. Map © OpenStreetMap contributors.
