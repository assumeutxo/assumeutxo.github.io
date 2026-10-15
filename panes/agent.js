// The Agent pane: a profile card for a key. The DID and its npub form with copy buttons, the address, what it maintains and
// where it is anchored, and the address's balance from the local explorer when one answers (never required).
(() => {
  // bech32 (BIP 173, not m) for npub: the hex pubkey as Nostr shows it
  const CH = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l', GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  const pm = (v) => { let c = 1; for (const x of v) { const b = c >>> 25; c = ((c & 0x1ffffff) << 5) ^ x; for (let i = 0; i < 5; i++) if ((b >> i) & 1) c ^= GEN[i]; } return c >>> 0; };
  const npub = (hex) => { const bytes = hex.match(/../g).map((h) => parseInt(h, 16)); const w = []; let acc = 0, bits = 0; for (const b of bytes) { acc = (acc << 8) | b; bits += 8; while (bits >= 5) { bits -= 5; w.push((acc >> bits) & 31); } } if (bits) w.push((acc << (5 - bits)) & 31); const hrp = 'npub'; const exp = [...[...hrp].map((c) => c.charCodeAt(0) >> 5), 0, ...[...hrp].map((c) => c.charCodeAt(0) & 31)]; const p = pm([...exp, ...w, 0, 0, 0, 0, 0, 0]) ^ 1; const chk = []; for (let i = 0; i < 6; i++) chk.push((p >> (5 * (5 - i))) & 31); return hrp + '1' + [...w, ...chk].map((d) => CH[d]).join(''); };
  const EXPLORER = 'http://127.0.0.1:3491/api';
  wiki.panes.push({
    name: 'agent',
    label: (doc) => [].concat(doc['@type'] || []).includes('Agent') ? 'profile' : null,
    render: (doc, root) => {
      const { el, link } = wiki;
      const copy = (text) => { const b = el('button', 'copy', 'copy'); b.onclick = () => navigator.clipboard.writeText(text).then(() => { b.textContent = 'copied'; setTimeout(() => (b.textContent = 'copy'), 1200); }); return b; };
      const did = doc.sameAs && doc.sameAs['@id'] || ''; const hex = (did.match(/^did:nostr:([0-9a-f]{64})$/) || [])[1];
      const card = el('div', 'profile'); root.append(card);
      const row = (k, ...v) => { const r = el('div', 'prow'); r.append(el('span', 'pk', k)); const pv = el('span', 'pv'); pv.append(...v); r.append(pv); card.append(r); return pv; };
      if (hex) { row('npub', el('span', 'hash', npub(hex)), copy(npub(hex))); row('did', link(did, did), copy(did)); }
      const addr = typeof doc.address === 'string' ? doc.address : doc.address && doc.address.value; const net = doc.address && doc.address.network || doc.network || '';
      if (addr) { const pv = row(net ? `address · ${net}` : 'address', el('span', 'hash', addr), copy(addr)); fetch(`${EXPLORER}/address/${addr}`).then((r) => r.json()).then((a) => { const c = a.chain_stats, m = a.mempool_stats; const sats = c.funded_txo_sum - c.spent_txo_sum + (m.funded_txo_sum - m.spent_txo_sum); pv.append(el('span', 'muted', ` · ${sats.toLocaleString('en-US')} sats, from the local explorer`)); }).catch(() => {}); }
      if (doc.maintains) row('maintains', link(doc.maintains['@id']));
      if (doc.trail) row('anchored by', link(doc.trail['@id']));
      const note = el('p', 'muted', 'The key is the identity; the pages are where it was found. Anything this key signs can be checked against the npub above.'); root.append(note);
    },
  });
})();
