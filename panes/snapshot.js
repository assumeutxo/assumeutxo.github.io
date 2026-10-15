// The Snapshot pane: a download card. The txoutset hash is the set's identity and the headline; the bytes are proven by the
// sha256 and the infohash; the magnet, the metainfo file and the webseed are where a copy was; the Nostr event is where it was announced.
wiki.panes.push({
  name: 'snapshot',
  label: 'download',
  canHandle: (subject, store) => wiki.has(store.get(subject) || {}, 'Snapshot'),
  render(subject, store, root, raw) {
    const doc = raw || store.get(subject);
    const { el, link, value, light } = wiki;
    const copy = (text) => { const b = el('button', 'copy', 'copy'); b.onclick = () => navigator.clipboard.writeText(text).then(() => { b.textContent = 'copied'; setTimeout(() => (b.textContent = 'copy'), 1200); }); return b; };
    const gb = doc.bytes ? (doc.bytes / 1e9).toFixed(2) + ' GB' : '';
    const facts = el('div', 'facts');
    const fact = (k, v) => { const f = el('div', 'fact'); f.append(el('span', 'fk', k), el('span', 'fv', v)); facts.append(f); };
    fact('height', String(doc.height ?? '?')); fact('network', doc.network || doc.chain || '?'); if (doc.coins) fact('coins', doc.coins.toLocaleString('en-US')); if (gb) fact('size', gb);
    root.append(facts);
    const idcard = el('div', 'idcard');
    // value() renders a long hex with its ends emphasised and its own copy button
    const idrow = (k, h, note) => { const r = el('div', 'prow'); r.append(el('span', 'pk', k)); const pv = el('span', 'pv'); pv.append(value(h)); if (note) { pv.append(el('br')); pv.append(el('span', 'muted', note)); } r.append(pv); idcard.append(r); };
    if (doc.txoutsetHash) idrow('txoutset hash', doc.txoutsetHash, 'the set\'s identity: what a node computes after loading it');
    if (doc.blockHash) idrow('block', doc.blockHash);
    if (doc.sha256) idrow('sha256', doc.sha256, 'of the file');
    if (doc.torrent && doc.torrent.infohash) idrow('infohash', doc.torrent.infohash, 'of the torrent');
    root.append(idcard);
    const get = el('div', 'get');
    if (doc.torrent) {
      if (doc.torrent.magnet) { const a = el('a', 'btn', 'open magnet'); a.href = doc.torrent.magnet; get.append(a); }
      if (doc.torrent.metainfo) { const a = link(doc.torrent.metainfo['@id'], '.torrent file'); a.className = 'btn ghost'; get.append(a); }
      for (const w of [].concat(doc.torrent.webseed || [])) { const a = link(w['@id'], 'webseed (direct download)'); a.className = 'btn ghost'; get.append(a); }
    }
    root.append(get);
    const where = el('p', 'muted');
    if (doc.file) where.append(`file ${doc.file}`);
    if (doc.producedBy) where.append(` · produced by ${doc.producedBy}`);
    for (const ev of [].concat(doc.announcedAt || [])) { where.append(` · announced on Nostr as kind ${ev.kind} `); where.append(link(ev.browse && ev.browse['@id'] || '', String(ev.id || '').slice(0, 12) + '…')); }
    root.append(where);
    if (doc.source) { const p = el('p', 'muted'); p.append('source: '); p.append(link(doc.source['@id'], doc.source.name || doc.source['@id'])); root.append(p); }
    // attestations: formal ones are signed statements carried by value and checked here; informal ones are claims made elsewhere, linked, never vouched for beyond "the number they wrote matches"
    const att = [].concat(doc.attestations || []); const formal = att.filter((a) => a.form === 'formal'), informal = att.filter((a) => a.form !== 'formal');
    if (att.length) root.append(el('h3', null, `attested by ${att.length}`));
    for (const a of formal) { const box = el('div', 'mark'); const h = el('div'); h.append(a.signer ? link(a.signer['@id'], a.signer.name || a.signer['@id']) : 'a key', ' · formal'); box.append(h); const ev = a.event; if (ev) { wiki.nostrCheck(ev).then(({ idOK, sigOK }) => { box.append(light(idOK && sigOK ? 'ok' : 'bad', idOK && sigOK ? 'signed by its author (checked here)' : 'the signature does not verify')); const tag = (k) => (ev.tags.find((t) => t[0] === k) || [])[1]; const same = tag('txoutset_hash') === doc.txoutsetHash || tag('muhash') === doc.muhash; box.append(light(same ? 'ok' : 'bad', same ? 'states the hash this page states (checked here)' : 'states a different hash ✗')); }); } else if (a['@id']) { h.append(' · ', link(a['@id'], 'the statement')); box.append(light('grey', 'the signed statement is on its own page')); } root.append(box); }
    for (const a of informal) { const box = el('div', 'mark'); const h = el('div'); h.append(a.by || 'someone', a.at ? ' · ' + a.at : '', ' · informal'); box.append(h); if (a.did) box.append(el('div', 'muted', a.did)); if (a.says && a.says.txoutsetHash) box.append(light(a.says.txoutsetHash === doc.txoutsetHash ? 'ok' : 'bad', a.says.txoutsetHash === doc.txoutsetHash ? 'the hash they wrote is the hash on this page' : 'the hash they wrote differs ✗')); box.append(light('grey', 'said elsewhere, as linked; not checked here')); if (a.where) { const p = el('div', 'muted'); p.append(link(a.where['@id'], a.where['@id'].replace(/^https?:\/\//, '').slice(0, 70) + '…')); box.append(p); } root.append(box); }
    if (doc.note) root.append(el('p', 'muted', doc.note));
    const how = el('p', 'muted', 'Load it with any node that reads the dumptxoutset v2 format, then compare its txoutset hash with the one above. The hash is the claim; the comparison is the check.');
    root.append(how);
  },
});
