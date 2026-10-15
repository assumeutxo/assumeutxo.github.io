// The Guide pane: sections of prose, each with a heading, and a link or links where the section points somewhere.
wiki.panes.push({
  label: 'guide',
  canHandle: (subject, store) => wiki.has(store.get(subject) || {}, 'Guide'),
  render(subject, store, root, raw) {
    const doc = raw || store.get(subject); const { el, link } = wiki;
    for (const s of [].concat(doc.sections || [])) {
      root.append(el('h3', null, s.name)); const p = el('p', 'prose', s.text); root.append(p);
      const links = [].concat(s.link || []).concat(s.links || []); if (links.length) { const ul = el('ul', 'links'); for (const l of links) { const li = el('li'); li.append(link(l['@id'], l.name || l['@id'])); ul.append(li); } root.append(ul); }
    }
  },
});
