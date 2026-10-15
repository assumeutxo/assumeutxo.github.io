// The Index pane: one card per entry, type chip and name, linking through to the entry's page.
wiki.panes.push({
  name: 'index',
  label: 'entries',
  canHandle: (subject, store) => wiki.has(store.get(subject) || {}, 'Index'),
  render(subject, store, root, raw) {
    const doc = raw || store.get(subject);
    const { el, link } = wiki;
    const grid = el('div', 'cards');
    for (const e of [].concat(doc.entries || [])) {
      const a = el('a', 'card'); a.href = link(e['@id']).href;
      a.append(...[].concat(e['@type'] || []).map((t) => el('span', 'type', t)));
      a.append(el('b', null, e.name || e['@id']));
      if (e.description) a.append(el('span', 'muted', e.description));
      grid.append(a);
    }
    root.append(grid);
    const meta = el('p', 'muted'); meta.append('maintained by '); meta.append(link(doc.creator && doc.creator['@id'] || '', 'its key')); if (doc.trail) { meta.append(' · anchored by '); meta.append(link(doc.trail['@id'], 'its trail')); }
    root.append(meta);
  },
});
