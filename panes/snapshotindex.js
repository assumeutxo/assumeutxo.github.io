// The SnapshotIndex pane: every snapshot as one row: chain, height, coins, size, where it came from, and the ways to get it.
wiki.panes.push({
  label: 'table', icon: '',
  canHandle: (subject, store) => wiki.has(store.get(subject) || {}, 'SnapshotIndex'),
  render(subject, store, root, raw) {
    const doc = raw || store.get(subject); const { el, link } = wiki;
    const snaps = [].concat(doc.entries || []).filter((e) => wiki.has(e, 'Snapshot')); const others = [].concat(doc.entries || []).filter((e) => !wiki.has(e, 'Snapshot'));
    // one tint per chain, rows grouped under the chain and sorted by height, a stripe at the left of each row
    const ORDER = ['btc', 'xbt', 'tbtc4', 'txbt4', 'tbtc3', 'signet']; const NAMES = { btc: 'Bitcoin mainnet', xbt: 'Bitcoin BLAKE2b mainnet', tbtc4: 'Bitcoin testnet4', txbt4: 'Bitcoin BLAKE2b testnet4', tbtc3: 'Bitcoin testnet3', signet: 'Bitcoin signet' };
    const t = el('table', 'dt'); const head = el('tr'); for (const h of ['height', 'txoutset hash', 'size', 'attested', 'source', 'get it']) head.append(el('th', null, h)); t.append(head);
    const groups = new Map(); for (const e of snaps) { const k = e.network || '?'; (groups.get(k) || groups.set(k, []).get(k)).push(e); }
    const keys = [...groups.keys()].sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
    for (const k of keys) {
      const gh = el('tr', 'grp ' + 'net-' + k); const gc = el('td'); gc.colSpan = 6; gc.append(el('span', 'type', k), ' ', NAMES[k] || groups.get(k)[0].chain || ''); gh.append(gc); t.append(gh);
      for (const e of groups.get(k).sort((a, b) => (a.height || 0) - (b.height || 0))) {
        const tr = el('tr', 'net-' + k);
        const c = el('td'); c.append(link(e['@id'], String(e.height != null ? e.height.toLocaleString('en-US') : '?'))); if (e.sharedWith) c.append(el('div', 'muted', 'also ' + e.sharedWith.split(' (')[0])); tr.append(c);
        const hcell = el('td', 'num'); if (e.txoutsetHash) { const a = link(e['@id'], e.txoutsetHash.slice(0, 12) + '…'); a.title = e.txoutsetHash; hcell.append(a); } else hcell.append('?'); tr.append(hcell);
        tr.append(el('td', 'num', e.bytes != null ? (e.bytes / 1e9).toFixed(2) + ' GB' : '?'));
        // attested: two small pills, formal green and informal amber when present, grey when zero
        const ac = el('td', 'att'); const at = e.attested || {};
        const pill = (n, kind) => { const p = el('span', 'pill ' + kind + (n ? ' on' : '')); p.append(el('b', null, String(n || 0)), ' ' + kind); p.title = kind === 'formal' ? 'signed statements, checked in the page' : 'claims made elsewhere, linked, not vouched for'; return p; };
        ac.append(pill(at.formal, 'formal'), pill(at.informal, 'informal')); tr.append(ac);
        const sc = el('td', 'src'); sc.title = e.source || ''; sc.textContent = e.source || ''; tr.append(sc);
        // get it: small chips that wrap cleanly, no separators
        const g = el('td', 'get'); const chip = (a, cls) => { a.className = 'chip ' + (cls || ''); g.append(a); };
        if (e.magnet) { const a = el('a', null, 'magnet'); a.href = e.magnet; chip(a, 'primary'); } if (e.torrent) chip(link(e.torrent['@id'], 'torrent')); if (e.webseed) chip(el('span', null, 'webseed'), 'plain'); if (e.announcedAt) chip(link(e.announcedAt['@id'], 'announcement')); tr.append(g);
        t.append(tr);
      }
    }
    root.append(t);
    if (others.length) { const ul = el('ul', 'more'); for (const o of others) { const li = el('li'); li.append(link(o['@id'], o.name || o['@id'])); if (o.description) li.append(el('span', 'muted', ' · ' + o.description)); ul.append(li); } root.append(ul); }
    root.append(el('p', 'muted', 'A snapshot is named by its txoutset hash; the file is proven by its sha256 and infohash; the hosts are only where a copy was.'));
  },
});
