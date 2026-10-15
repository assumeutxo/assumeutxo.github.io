// The NetworkList pane: one row per chain: id, name, what identifies it (genesis, or parent plus fork height), magic, address prefix, aliases.
wiki.panes.push({
  label: 'networks',
  canHandle: (subject, store) => wiki.has(store.get(subject) || {}, 'NetworkList'),
  render(subject, store, root, raw) {
    const doc = raw || store.get(subject); const { el, link, hash } = wiki;
    const t = el('table', 'dt'); const head = el('tr'); for (const h of ['id', 'chain', 'identity', 'magic', 'prefix', 'aliases']) head.append(el('th', null, h)); t.append(head);
    for (const n of [].concat(doc.networks || [])) {
      const tr = el('tr', 'net-' + n.id); const c = el('td'); c.append(el('span', 'type', n.id)); tr.append(c);
      const nm = el('td'); nm.append(n.name); if (n.note) nm.append(el('div', 'muted', n.note)); tr.append(nm);
      const idc = el('td', 'num'); if (n.genesis) { idc.append('genesis '); const a = el('span', null, n.genesis.slice(0, 16) + '…'); a.title = n.genesis; idc.append(a); } else if (n.forkOf) { idc.append('fork of '); idc.append(link(n.forkOf['@id'], n.forkOf['@id'].replace('#', ''))); idc.append(` at ${n.forkHeight.toLocaleString('en-US')}`); } tr.append(idc);
      tr.append(el('td', 'num', n.magic || '')); tr.append(el('td', 'num', n.hrp || '')); tr.append(el('td', null, (n.aliases || []).join(', ') || '—'));
      t.append(tr);
    }
    root.append(t);
    root.append(el('p', 'muted', 'An id is a name for a genesis block. The aliases are accepted on input and never written in new data.'));
  },
});
