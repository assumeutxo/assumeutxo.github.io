// The Links pane: groups of links, each with a line on what it is and, where given, a date.
wiki.panes.push({
  label: 'links',
  canHandle: (subject, store) => wiki.has(store.get(subject) || {}, 'Links'),
  render(subject, store, root, raw) {
    const doc = raw || store.get(subject); const { el, link } = wiki;
    for (const g of [].concat(doc.groups || [])) {
      root.append(el('h3', null, g.name));
      const ul = el('ul', 'links');
      for (const l of [].concat(g.links || [])) { const li = el('li'); li.append(link(l['@id'], l.name || l['@id'])); if (l.date) li.append(el('span', 'muted', ' · ' + l.date)); if (l.description) li.append(el('div', 'muted', l.description)); ul.append(li); }
      root.append(ul);
    }
  },
});
