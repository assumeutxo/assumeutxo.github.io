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
    // formal, by file: a kind 3332 event (NIP-332) fetched by value and checked here: id, signature, canonical statement, and that its subject is this snapshot
    const up = location.pathname.includes('/snapshots/') || location.pathname.includes('/attestations/') ? '../' : '';
    const bitsOf = (pk) => { let b = 0; for (const c of pk) { const n = parseInt(c, 16); if (n === 0) { b += 4; continue; } b += Math.clz32(n) - 28; break; } return b; };
    const renderFormal = async (box, a) => {
      const file = a['@id'] && a['@id'].endsWith('.json') ? a['@id'] : null;
      let ev = a.event; if (!ev && file) { try { ev = await (await fetch(file)).json(); } catch { box.append(light('bad', 'the attestation file could not be fetched')); return; } }
      if (!ev) { box.append(light('grey', 'the signed statement is on its own page')); return; }
      const { idOK, sigOK } = await wiki.nostrCheck(ev); let st = null; try { st = JSON.parse(ev.content); } catch {}
      const canon = st && wiki.canon(st) === ev.content; const sub = st && st.subject || {}, cl = st && st.claim || {};
      const h = box.firstChild; h.textContent = ''; h.append(link(up + 'key.html?did=did:nostr:' + ev.pubkey, 'did:nostr:' + ev.pubkey.slice(0, 8) + '…' + ev.pubkey.slice(-4)), ' · formal · ' + (cl.method || '?') + (cl.chainstate && cl.chainstate !== 'full' ? ' (' + cl.chainstate + ')' : cl.chainstate === 'full' ? ', full sync' : ''));
      const meta = el('div', 'muted'); meta.append(`key work ${bitsOf(ev.pubkey)} bits · computed ${cl.computedAt || '?'} · signed ${new Date(ev.created_at * 1000).toISOString().slice(0, 10)}`); box.append(meta);
      box.append(light(idOK && sigOK ? 'ok' : 'bad', idOK && sigOK ? 'signed by its author (checked here)' : 'the signature does not verify ✗'));
      box.append(light(canon ? 'ok' : 'bad', canon ? 'a canonical NIP-332 statement (checked here)' : 'the statement is not canonical ✗'));
      const same = sub.txoutsetHash === doc.txoutsetHash && (sub.height === undefined || sub.height === doc.height); box.append(light(same ? 'ok' : 'bad', same ? 'states the hash this page states (checked here)' : 'states a different hash ✗'));
      if (cl.implementation) box.append(light('grey', 'says: ' + cl.implementation + (cl.build ? ', ' + cl.build : '') + ' (as said by the signer, not checked here)'));
      if (cl.note) box.append(el('div', 'muted', cl.note));
      const p = el('div', 'muted'); p.append(link(file || '#', 'the event'), ' · ', link('https://nip-332.github.io/', 'NIP-332')); box.append(p);
    };
    for (const a of formal) { const box = el('div', 'mark'); box.append(el('div', null, 'a key · formal')); root.append(box); renderFormal(box, a); }
    for (const a of informal) { const box = el('div', 'mark'); const h = el('div'); h.append(who(a.by), a.at ? ' · ' + a.at : '', ' · informal'); box.append(h); if (a.did) box.append(el('div', 'muted', a.did)); if (a.says && a.says.txoutsetHash) box.append(light(a.says.txoutsetHash === doc.txoutsetHash ? 'ok' : 'bad', a.says.txoutsetHash === doc.txoutsetHash ? 'the hash they wrote is the hash on this page' : 'the hash they wrote differs ✗')); box.append(light('grey', 'said elsewhere, as linked; not checked here')); if (a.where) { const p = el('div', 'muted'); p.append(link(a.where['@id'], a.where['@id'].replace(/^https?:\/\//, '').slice(0, 70) + '…')); box.append(p); } root.append(box); }
    if (doc.note) root.append(el('p', 'muted', doc.note));
    const how = el('p', 'muted', 'Load it with any node that reads the dumptxoutset v2 format, then compare its txoutset hash with the one above. The hash is the claim; the comparison is the check.');
    root.append(how);
  },
});
