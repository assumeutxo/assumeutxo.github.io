// The SnapshotIndex pane: every snapshot as one row: chain, height, coins, size, where it came from, and the ways to get it.
wiki.panes.push({
  label: 'table', icon: '',
  canHandle: (subject, store) => wiki.has(store.get(subject) || {}, 'SnapshotIndex'),
  render(subject, store, root, raw) {
    const doc = raw || store.get(subject); const { el, link } = wiki;
    const snaps = [].concat(doc.entries || []).filter((e) => wiki.has(e, 'Snapshot')); const others = [].concat(doc.entries || []).filter((e) => !wiki.has(e, 'Snapshot'));
    const t = el('table', 'dt'); const head = el('tr'); for (const h of ['chain', 'height', 'txoutset hash', 'size', 'source', 'get it']) head.append(el('th', null, h)); t.append(head);
    for (const e of snaps) {
      const tr = el('tr');
      const c = el('td'); c.append(link(e['@id'], e.network || '?')); if (e.chain) c.append(el('div', 'muted', e.chain)); if (e.sharedWith) c.append(el('div', 'muted', 'shared with ' + e.sharedWith.split(' (')[0])); tr.append(c);
      tr.append(el('td', 'num', e.height != null ? e.height.toLocaleString('en-US') : '?'));
      const hcell = el('td', 'num'); if (e.txoutsetHash) { const a = link(e['@id'], e.txoutsetHash.slice(0, 12) + '…'); a.title = e.txoutsetHash; hcell.append(a); } else hcell.append('?'); tr.append(hcell);
      tr.append(el('td', 'num', e.bytes != null ? (e.bytes / 1e9).toFixed(2) + ' GB' : '?'));
      tr.append(el('td', null, e.source || ''));
      const g = el('td'); if (e.magnet) { const a = el('a', null, 'magnet'); a.href = e.magnet; g.append(a); } if (e.torrent) { g.append(' · '); g.append(link(e.torrent['@id'], 'torrent')); } if (e.webseed) g.append(' · webseed'); if (e.announcedAt) { g.append(' · '); g.append(link(e.announcedAt['@id'], 'announcement')); } tr.append(g);
      t.append(tr);
    }
    root.append(t);
    if (others.length) { const ul = el('ul', 'more'); for (const o of others) { const li = el('li'); li.append(link(o['@id'], o.name || o['@id'])); if (o.description) li.append(el('span', 'muted', ' · ' + o.description)); ul.append(li); } root.append(ul); }
    root.append(el('p', 'muted', 'A snapshot is named by its txoutset hash; the file is proven by its sha256 and infohash; the hosts are only where a copy was.'));
  },
});
