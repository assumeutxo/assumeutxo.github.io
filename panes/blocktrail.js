// The Blocktrail pane: the trail verified in the page. The commitment is checked here, from the trail's base key and
// its states (sidestr/spec keys.mjs on the kernel's curve code) against the output in each mark's bytes, decoded by
// the kernel's codec; all pinned by commit, nothing fetched from a moving ref. Two lights per mark: what was checked
// here (green or red), and what is only claimed (grey): the block, which the bytes cannot prove without a header.
(() => {
  const SCHEMA = 'https://cdn.jsdelivr.net/gh/bitcoin-desktop/schema@b8cbf6337c7450fe14ddc5bce00c7280059aab5d/codec/';
  const KEYS = 'https://cdn.jsdelivr.net/gh/sidestr/spec@e8deb63161c7459ed39c01d2ca9fda3d860b65b6/siding/lib/keys.mjs';
  const CORE = 'https://bitcoin-kernel.com/engine/schema/core.jsonld';
  let libs;
  const load = () => (libs ??= (async () => {
    const [hash, secp, { makeKeys }, { Codec }, core] = await Promise.all([import(SCHEMA + 'hash.js'), import(SCHEMA + 'secp256k1.js'), import(KEYS), import(SCHEMA + 'codec.js'), fetch(CORE).then((r) => r.json())]);
    const K = makeKeys({ hash, secp }); const codec = new Codec(core);
    const utf8 = (t) => new TextEncoder().encode(t);
    const jcs = (v) => v === null || typeof v !== 'object' ? JSON.stringify(v) : Array.isArray(v) ? '[' + v.map(jcs).join(',') + ']' : '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + jcs(v[k])).join(',') + '}';
    const stateHash = (st) => hash.sha256(typeof st === 'string' ? utf8(st) : utf8(jcs(st)));
    const walk = (base, states) => { let P = K.basePoint(base); return states.map((st) => { P = K.tweakPoint(P, K.tapTweak(P, stateHash(st))); return K.xOnly(P); }); };
    return { walk, codec };
  })());
  const parseTxo = (entry) => {
    const uri = typeof entry === 'string' ? entry : entry && (entry['@id'] || entry.uri);
    const m = String(uri || '').match(/^txo:([a-z0-9]+):([0-9a-f]{64}):(\d+)(?:\?(.*))?$/i); if (!m) return null;
    const q = new URLSearchParams(m[4] || '');
    const t = { uri, chain: m[1], txid: m[2].toLowerCase(), vout: +m[3], amount: q.get('amount') ? +q.get('amount') : null, commit: q.get('commit') };
    if (q.get('hex')) t.hex = q.get('hex'); if (q.get('block')) { const b = q.get('block').split(':'); t.block = { height: +b[0], hash: b[1] }; }
    if (entry && typeof entry === 'object') { if (entry.hex) t.hex = entry.hex; if (entry.block) t.block = entry.block; }
    return t;
  };
  wiki.panes.push({
    name: 'blocktrail',
    label: (doc) => [].concat(doc['@type'] || []).includes('Blocktrail') ? 'trail' : null,
    render: (doc, root) => {
      const { el, link } = wiki;
      const txos = [].concat(doc.txo || []).map(parseTxo);
      const states = doc.states && doc.states.length ? doc.states : txos.map((t) => t && t.commit);
      const head = el('p', 'muted', `profile ${doc.profile || '?'} · chain ${doc.chain || '?'} · ${txos.length} mark${txos.length === 1 ? '' : 's'} · base key ${String(doc.pubkeyBase || '').slice(0, 12)}…`);
      root.append(head);
      const list = el('div', 'marks'); root.append(list);
      const status = el('p', 'muted', 'loading the key and codec code (pinned by commit)…'); root.append(status);
      load().then(({ walk, codec }) => {
        let base = String(doc.pubkeyBase || '').toLowerCase(); if (/^[0-9a-f]{64}$/.test(base)) base = '02' + base;
        const expected = walk(base, states);
        let ok = 0;
        txos.forEach((t, i) => {
          const m = el('div', 'mark'); list.append(m);
          if (!t) { m.append(el('span', 'err', 'not a txo: URI')); return; }
          const line = (cls, text) => { const p = el('div'); p.append(el('span', 'light ' + cls), text); m.append(p); };
          // the coin link carries the value in the name: coin.html?txo=<uri with hex and block>
          const q = t.hex ? `${t.uri.split('?')[0]}?hex=${t.hex}${t.block ? `&block=${t.block.height}:${t.block.hash}` : ''}` : t.uri.split('?')[0];
          const h = el('div'); h.append(`${i + 1}. state ${String(states[i]).slice(0, 12)}… `, link(new URL('coin.html?txo=' + q, wiki.ROOT).href, t.txid.slice(0, 12) + '…:' + t.vout)); m.append(h);
          if (!t.hex) { line('grey', 'given by name only: nothing to check here without the bytes'); return; }
          try {
            const d = codec.decode('Transaction', t.hex); const txid = codec.txid(d);
            if (txid !== t.txid) { line('bad', `the bytes hash to ${txid.slice(0, 16)}…, not the txid named`); return; }
            line('ok', 'the bytes hash to the txid named (checked here)');
            const o = d.outputs[t.vout];
            const commits = o && o.scriptPubKey === '5120' + expected[i];
            line(commits ? 'ok' : 'bad', commits ? `output ${t.vout} is the key this state derives: it commits to the state (checked here)` : `output ${t.vout} is not the recomputed key ✗`);
            if (t.amount != null) line(o && o.value === t.amount ? 'ok' : 'bad', `${(o ? o.value : 0).toLocaleString()} sats${o && o.value === t.amount ? ', as the trail says' : ' ≠ ' + t.amount}`);
            if (i > 0 && txos[i - 1]) { const links = d.inputs.some((x) => x.prevout.txid === txos[i - 1].txid); line(links ? 'ok' : 'bad', links ? 'spends the previous mark (checked here)' : 'does not spend the previous mark ✗'); } else line('ok', 'genesis');
            line('grey', t.block ? `block ${t.block.height} ${String(t.block.hash).slice(0, 16)}…: as given; a header would be needed to check it here` : 'no block given');
            if (commits && txid === t.txid) ok++;
          } catch (e) { line('bad', 'could not decode the bytes: ' + e.message); }
        });
        status.textContent = `${ok}/${txos.length} marks commit to their states, checked in this page; blocks are as given.`;
      }).catch((e) => { status.className = 'err'; status.textContent = 'could not load the verification code: ' + e.message; });
    },
  });
})();
