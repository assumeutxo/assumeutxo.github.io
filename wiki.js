// wiki.js: the generic view of a data wiki page. A page is HTML whose truth is its JSON-LD islands
// (<script type="application/ld+json">). This renders every island as an outline: the @type as a heading,
// properties as rows, nested objects as nested tables, anything with an @id as a link resolved against the
// page, the raw JSON underneath. No build, no router, no state: a link loads the next page, which carries
// its own island and its own copy of this file. A page with a richer renderer can add it; this is the floor.
(() => {
  const CSS = `
    body{margin:0;font:15px/1.5 system-ui,sans-serif;color:#1b1b1b;background:#fbfaf7}
    main.wiki{max-width:860px;margin:0 auto;padding:1.5rem 1rem 4rem}
    .wiki h1{font-size:1.5rem;margin:.2rem 0 .1rem}.wiki h2{font-size:1.1rem;margin:1.6rem 0 .4rem;color:#444}
    .wiki .id{font:13px ui-monospace,monospace;color:#777;word-break:break-all}
    .wiki table{border-collapse:collapse;width:100%;margin:.4rem 0}
    .wiki td{vertical-align:top;padding:.3rem .5rem;border-top:1px solid #e8e5dd;font-size:14px}
    .wiki td.k{width:11em;color:#666;font-family:ui-monospace,monospace;font-size:13px;white-space:nowrap}
    .wiki td.v{font-family:ui-monospace,monospace;font-size:13px;word-break:break-all}
    .wiki td.v table{margin:0;border:1px solid #e8e5dd}
    .wiki ul{margin:0;padding-left:1.1rem}.wiki li{margin:.15rem 0}
    .wiki a{color:#0b5fa5;text-decoration:none}.wiki a:hover{text-decoration:underline}
    .wiki .type{display:inline-block;font:12px ui-monospace,monospace;background:#ecebe6;border-radius:4px;padding:0 .4rem;margin-right:.4rem;color:#333}
    .wiki details{margin-top:1.2rem}.wiki summary{cursor:pointer;color:#666;font-size:13px}
    .wiki pre{background:#f3f2ee;padding:.8rem;border-radius:6px;overflow:auto;font-size:12.5px}
    .wiki nav{font-size:13px;color:#777;margin-bottom:1rem}.wiki nav a{margin-right:.8rem}
  `;
  const isIri = (s) => /^(https?:|magnet:|did:|txo:|urn:|mailto:|wss?:|\.{0,2}\/|[\w.-]+\.(html|jsonld|json|torrent|dat)(#|$)|#)/i.test(s);
  const href = (iri) => { try { return /^(https?:|\.{0,2}\/|[\w./-]+\.html|#)/i.test(iri) ? new URL(iri, location.href).href : iri; } catch { return iri; } };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const link = (iri, text) => { const a = el('a', null, text ?? iri); a.href = href(iri); return a; };

  function value(v) {
    if (v == null) return el('span', null, '—');
    if (Array.isArray(v)) { const ul = el('ul'); for (const x of v) { const li = el('li'); li.append(value(x)); ul.append(li); } return ul; }
    if (typeof v === 'object') {
      const keys = Object.keys(v);
      if (keys.length === 1 && v['@id']) return link(v['@id']);
      return table(v);
    }
    if (typeof v === 'string' && isIri(v)) return link(v);
    return el('span', null, String(v));
  }
  function table(obj) {
    const t = el('table');
    for (const [k, v] of Object.entries(obj)) {
      if (k === '@context') continue;
      const tr = el('tr'); const kd = el('td', 'k', k); const vd = el('td', 'v');
      if (k === '@type') vd.append(...[].concat(v).map((x) => el('span', 'type', x)));
      else if (k === '@id') vd.append(link(v));
      else vd.append(value(v));
      tr.append(kd, vd); t.append(tr);
    }
    return t;
  }
  function island(doc, i) {
    const sec = el('section');
    const id = doc['@id']; if (id && id.startsWith('#')) sec.id = id.slice(1);
    const h = el(i ? 'h2' : 'h1'); h.append(...[].concat(doc['@type'] || []).map((x) => el('span', 'type', x)), doc.name || doc.title || (id ? id : 'document'));
    sec.append(h);
    if (id) sec.append(el('div', 'id', new URL(id, location.href).href));
    if (doc.description) sec.append(el('p', null, doc.description));
    sec.append(table(doc));
    const d = el('details'); d.append(el('summary', null, 'raw JSON-LD')); const pre = el('pre', null, JSON.stringify(doc, null, 2)); d.append(pre); sec.append(d);
    return sec;
  }
  // the wiki's root is where this file lives, so pages in subfolders get the same nav
  const ROOT = (document.currentScript && document.currentScript.src) ? new URL('.', document.currentScript.src).href : new URL('.', location.href).href;
  function run() {
    const islands = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent); } catch (e) { return { '@type': 'ParseError', error: e.message }; } });
    const style = el('style'); style.textContent = CSS; document.head.append(style);
    const main = el('main', 'wiki');
    const nav = el('nav'); for (const [p, t] of [['index.html', 'index'], ['me.html', 'me'], ['trail.html', 'trail']]) { const a = el('a', null, t); a.href = new URL(p, ROOT).href; nav.append(a); } main.append(nav);
    islands.forEach((d, i) => main.append(island(d, i)));
    if (!document.title && islands[0]) document.title = islands[0].name || islands[0]['@id'] || 'datawiki';
    document.body.append(main);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', run) : run();
})();
