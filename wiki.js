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
    .wiki .tabs{display:flex;gap:.3rem;margin:.6rem 0 .4rem;border-bottom:1px solid #e8e5dd}
    .wiki .tabs button{font:13px ui-monospace,monospace;background:none;border:0;border-bottom:2px solid transparent;padding:.3rem .6rem;color:#666;cursor:pointer}
    .wiki .tabs button.on{color:#1b1b1b;border-bottom-color:#1b1b1b}
    .wiki .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:.7rem;margin-top:.6rem}
    .wiki .card{display:block;border:1px solid #e8e5dd;border-radius:8px;padding:.7rem .9rem;background:#fff;color:inherit}
    .wiki .card:hover{border-color:#bbb;text-decoration:none}.wiki .card b{display:block;margin-top:.3rem}
    .wiki .light{display:inline-block;width:.7em;height:.7em;border-radius:50%;margin-right:.4em;vertical-align:middle;background:#bbb}
    .wiki .light.ok{background:#2a9d4a}.wiki .light.bad{background:#c43b2f}.wiki .light.grey{background:#bbb}
    .wiki .mark{border:1px solid #e8e5dd;border-radius:8px;padding:.6rem .9rem;margin:.5rem 0;background:#fff;font-size:14px}
    .wiki .mark code{font-size:12.5px}.wiki .err{color:#c43b2f}.wiki .muted{color:#777;font-size:13px}
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
    tabs(doc, sec);
    return sec;
  }
  // the wiki's root is where this file lives, so pages in subfolders get the same nav
  const ROOT = (document.currentScript && document.currentScript.src) ? new URL('.', document.currentScript.src).href : new URL('.', location.href).href;
  // Panes: views by type, as solid-panes does it. A pane is { name, label(doc) -> string|null, render(doc, el) };
  // label returns null when the pane does not apply. For each distinct @type on the page, panes/<type>.js is
  // loaded (lower-cased) if it exists and registers itself with wiki.panes.push(...). The outline and the raw
  // JSON are always the last two tabs, so a page with no pane still has its floor.
  const wiki = (window.wiki = window.wiki || {}); wiki.panes = wiki.panes || []; wiki.ROOT = ROOT; wiki.el = el; wiki.link = link; wiki.value = value; wiki.table = table;
  const loadPane = (type) => new Promise((res) => { const s = document.createElement('script'); s.src = new URL('panes/' + String(type).toLowerCase() + '.js', ROOT).href; s.onload = s.onerror = () => res(); document.head.append(s); });
  function tabs(doc, sec) {
    const views = wiki.panes.map((p) => { let l = null; try { l = p.label(doc); } catch {} return l ? { name: l, render: p.render } : null; }).filter(Boolean);
    views.push({ name: 'outline', render: (d, e) => e.append(table(d)) }, { name: 'raw', render: (d, e) => e.append(el('pre', null, JSON.stringify(d, null, 2))) });
    const bar = el('div', 'tabs'); const body = el('div', 'view'); let cur;
    const show = (v) => { cur = v; body.replaceChildren(); try { v.render(doc, body); } catch (e) { body.append(el('p', 'err', 'this view failed: ' + e.message)); } [...bar.children].forEach((b) => b.classList.toggle('on', b.textContent === v.name)); };
    for (const v of views) { const b = el('button', null, v.name); b.onclick = () => show(v); bar.append(b); }
    sec.append(bar, body); show(views[0]);
  }
  async function run() {
    const islands = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent); } catch (e) { return { '@type': 'ParseError', error: e.message }; } });
    const style = el('style'); style.textContent = CSS; document.head.append(style);
    const types = new Set(islands.flatMap((d) => [].concat(d['@type'] || [])));
    await Promise.all([...types].map(loadPane));
    const main = el('main', 'wiki');
    const nav = el('nav'); for (const [p, t] of [['index.html', 'index'], ['me.html', 'me'], ['trail.html', 'trail']]) { const a = el('a', null, t); a.href = new URL(p, ROOT).href; nav.append(a); } main.append(nav);
    islands.forEach((d, i) => main.append(island(d, i)));
    if (!document.title && islands[0]) document.title = islands[0].name || islands[0]['@id'] || 'datawiki';
    document.body.append(main);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', run) : run();
})();
