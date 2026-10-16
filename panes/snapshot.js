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
    const who = (by) => { const m = String(by || '').match(/^(\S+) \((GitHub|Nostr)\)$/); if (m && m[2] === 'GitHub') { const a = link('https://github.com/' + m[1], m[1]); const s = el('span'); s.append(a, ' (GitHub)'); return s; } return el('span', null, by || 'someone'); };
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
      const p = el('div', 'muted'); if (file) p.append(link(file, 'the event'), ' · '); p.append(link('https://nip-332.github.io/', 'NIP-332')); box.append(p);
      return ev;
    };
    const onRecord = formal.map((a) => { const box = el('div', 'mark'); box.append(el('div', null, 'a key · formal')); root.append(box); return renderFormal(box, a); });
    for (const a of informal) { const box = el('div', 'mark'); const h = el('div'); h.append(who(a.by), a.at ? ' · ' + a.at : '', ' · informal'); box.append(h); if (a.did) box.append(el('div', 'muted', a.did)); if (a.says && a.says.txoutsetHash) box.append(light(a.says.txoutsetHash === doc.txoutsetHash ? 'ok' : 'bad', a.says.txoutsetHash === doc.txoutsetHash ? 'the hash they wrote is the hash on this page' : 'the hash they wrote differs ✗')); box.append(light('grey', 'said elsewhere, as linked; not checked here')); if (a.where) { const p = el('div', 'muted'); p.append(link(a.where['@id'], a.where['@id'].replace(/^https?:\/\//, '').slice(0, 70) + '…')); box.append(p); } root.append(box); }
    // the relays: kind 3332 events about this snapshot as the relays hold them, each checked here the same way. One already on the record
    // is counted; one not yet on the record is shown beneath, with its file to download for a pull request. Nothing is trusted for being on a relay.
    if (doc.txoutsetHash) {
      const RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.nostr.band', 'wss://relay.primal.net'];
      const query = (filter, ms = 8000) => new Promise((res) => { const got = new Map(); let open = 0; const done = () => { if (--open <= 0) res(got); };
        for (const url of RELAYS) { let ws; try { ws = new WebSocket(url); } catch { continue; } open++; const t = setTimeout(() => { try { ws.close(); } catch {} }, ms);
          ws.onopen = () => ws.send(JSON.stringify(['REQ', 's', filter])); ws.onerror = () => { try { ws.close(); } catch {} }; ws.onclose = () => { clearTimeout(t); done(); };
          ws.onmessage = (m) => { try { const d = JSON.parse(m.data); if (d[0] === 'EOSE') { ws.close(); return; } if (d[0] !== 'EVENT') return; const e = d[2]; const r = got.get(e.id) || { e, relays: new Set() }; r.relays.add(url.replace('wss://', '')); got.set(e.id, r); } catch {} }; }
        if (!open) res(got); });
      const relayBox = el('div', 'mark'); const head = el('div', null, `on the relays · asking ${RELAYS.length}…`); relayBox.append(head); root.append(relayBox); const fresh = el('div'); root.append(fresh);
      (async () => {
        const known = new Set((await Promise.all(onRecord)).filter(Boolean).map((ev) => ev.id));
        const got = await query({ kinds: [3332], '#t': ['assumeutxo'], limit: 200 });
        let here = 0, listed = 0, bad = 0; const seen = new Map();
        for (const { e, relays } of got.values()) {
          let st = null; try { st = JSON.parse(e.content); } catch {} const sub = st && st.subject || {};
          if (sub.txoutsetHash !== doc.txoutsetHash || (sub.height !== undefined && sub.height !== doc.height)) continue; // about another snapshot
          const { idOK, sigOK } = await wiki.nostrCheck(e); if (!idOK || !sigOK) { bad++; continue; }
          here++; if (known.has(e.id)) { listed++; continue; }
          seen.set(e.id, { e, relays });
        }
        head.textContent = `on the relays · ${RELAYS.length} asked · ${here} attestation${here === 1 ? '' : 's'} of this snapshot verified here · ${listed} on the record · ${seen.size} not yet` + (bad ? ` · ${bad} rejected` : '');
        relayBox.append(el('div', 'muted', here ? 'An attestation on a relay is one anyone published; the record adds one after its claim is read. Not on the record yet means only that.' : 'Nothing about this snapshot on these relays yet, or they did not answer.'));
        for (const { e, relays } of seen.values()) {
          const box = el('div', 'mark'); box.append(el('div', null, 'a key · formal')); fresh.append(box); await renderFormal(box, { event: e });
          const dl = el('button', 'copy', 'download the event'); dl.onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(e, null, 2) + '\n'], { type: 'application/json' })); a.download = `${e.pubkey}.json`; a.click(); };
          const p = el('div', 'muted'); p.append(`seen on ${[...relays].join(', ')} · not on the record yet: `, dl, ' and open a pull request adding it as attestations/' + (sub => `${sub.network}-${sub.height}`)(JSON.parse(e.content).subject) + `/${e.pubkey}.json`); box.append(p);
        }
      })().catch(() => { head.textContent = 'on the relays · could not ask'; });
    }
    if (doc.note) root.append(el('p', 'muted', doc.note));
    const how = el('p', 'muted', 'Load it with any node that reads the dumptxoutset v2 format, then compare its txoutset hash with the one above. The hash is the claim; the comparison is the check.');
    root.append(how);
  },
});
