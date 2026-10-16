// The Key pane: one key as the record sees it. Identity (DID, npub, work in the key); the controller it claims in its profile, checked
// against the controller's NIP-51 key set; the keys it controls, each checked for the back-reference; a GitHub identity (NIP-39),
// checked against the gist; every attestation it signed on the record (data/attestations.json) and on the relays (kinds 3332, 3331).
(() => {
  const CH = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l', GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  const pm = (v) => { let c = 1; for (const x of v) { const b = c >>> 25; c = ((c & 0x1ffffff) << 5) ^ x; for (let i = 0; i < 5; i++) if ((b >> i) & 1) c ^= GEN[i]; } return c >>> 0; };
  const npub = (hex) => { const bytes = hex.match(/../g).map((h) => parseInt(h, 16)); const w = []; let acc = 0, bits = 0; for (const b of bytes) { acc = (acc << 8) | b; bits += 8; while (bits >= 5) { bits -= 5; w.push((acc >> bits) & 31); } } if (bits) w.push((acc << (5 - bits)) & 31); const hrp = 'npub'; const exp = [...[...hrp].map((c) => c.charCodeAt(0) >> 5), 0, ...[...hrp].map((c) => c.charCodeAt(0) & 31)]; const p = pm([...exp, ...w, 0, 0, 0, 0, 0, 0]) ^ 1; const chk = []; for (let i = 0; i < 6; i++) chk.push((p >> (5 * (5 - i))) & 31); return hrp + '1' + [...w, ...chk].map((d) => CH[d]).join(''); };
  const bitsOf = (pk) => { let b = 0; for (const c of pk) { const n = parseInt(c, 16); if (n === 0) { b += 4; continue; } b += Math.clz32(n) - 28; break; } return b; };
  const RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net', 'wss://relay.nostr.band', 'wss://nostr.mom', 'wss://purplepag.es'];
  // one query against all relays; resolves with the newest event per (pubkey, kind, d) for replaceables, every event otherwise
  const query = (filter, ms = 8000) => new Promise((res) => { const got = new Map(); let open = 0; const done = () => { if (--open <= 0) res([...got.values()]); };
    for (const url of RELAYS) { let ws; try { ws = new WebSocket(url); } catch { continue; } open++; const t = setTimeout(() => { try { ws.close(); } catch {} }, ms);
      ws.onopen = () => ws.send(JSON.stringify(['REQ', 'k', filter])); ws.onerror = () => {}; ws.onclose = () => { clearTimeout(t); done(); };
      ws.onmessage = (m) => { try { const d = JSON.parse(m.data); if (d[0] === 'EOSE') { ws.close(); return; } if (d[0] !== 'EVENT') return; const e = d[2]; const rep = e.kind === 0 || (e.kind >= 30000 && e.kind < 40000); const key = rep ? `${e.pubkey}:${e.kind}:${(e.tags.find((x) => x[0] === 'd') || [])[1] || ''}` : e.id; const old = got.get(key); if (!old || (rep && e.created_at > old.created_at)) got.set(key, e); } catch {} }; }
    if (!open) res([]); });
  const tag = (e, n) => (e.tags.find((t) => t[0] === n) || [])[1];
  wiki.panes.push({
    name: 'key', label: 'key',
    canHandle: (subject, store) => wiki.has(store.get(subject) || {}, 'Key'),
    async render(subject, store, root, raw) {
      const doc = raw || store.get(subject); const { el, link, light } = wiki; const hex = ((doc.sameAs && doc.sameAs['@id'] || '').match(/^did:nostr:([0-9a-f]{64})$/) || [])[1];
      if (!hex) { root.append(el('p', 'muted', doc.description)); return; }
      const did = 'did:nostr:' + hex; const copy = (text) => { const b = el('button', 'copy', 'copy'); b.onclick = () => navigator.clipboard.writeText(text).then(() => { b.textContent = 'copied'; setTimeout(() => (b.textContent = 'copy'), 1200); }); return b; };
      root.append(wiki.card([['did', el('span', 'hash', did), copy(did)], ['npub', el('span', 'hash', npub(hex)), copy(npub(hex))], ['work in the key', `${bitsOf(hex)} leading zero bits`], ['elsewhere', link('https://nostr.social/' + hex, 'nostr.social'), ' · ', link('https://nostr.at/' + npub(hex), 'nostr.at')]]));
      const sec = (title) => { root.append(el('h3', null, title)); const d = el('div'); root.append(d); return d; };
      // the profile and the two directions
      const who = sec('who this key is'); who.append(el('p', 'muted', 'fetching the profile from the relays…'));
      const [profiles, ownSets, signed] = await Promise.all([query({ kinds: [0], authors: [hex], limit: 1 }), query({ kinds: [30000], authors: [hex], '#d': ['keys'] }), query({ kinds: [3332, 3331], authors: [hex], limit: 200 })]);
      const prof = profiles[0]; let p = {}; try { p = JSON.parse(prof?.content || '{}'); } catch {}
      who.textContent = '';
      if (!prof) who.append(light('grey', 'no profile on these relays'));
      else { who.append(wiki.card([['name', p.name || p.display_name || ''], ['about', p.about || ''], ['nip05', p.nip05 || '']])); await wiki.nostrCheck(prof).then(({ idOK, sigOK }) => who.append(light(idOK && sigOK ? 'ok' : 'bad', idOK && sigOK ? 'profile signed by this key (checked here)' : 'the profile signature does not verify ✗'))); }
      // controller: claimed in the profile, confirmed by the controller's own key set
      const claimed = (p.controller || '').match(/^did:nostr:([0-9a-f]{64})$/)?.[1] || (prof?.tags || []).find((t) => t[0] === 'p' && t[3] === 'controller')?.[1];
      const ctl = sec('controlled by');
      if (!claimed) ctl.append(light('grey', 'this key names no controller; it stands for itself'));
      else { const sets = await query({ kinds: [30000], authors: [claimed], '#d': ['keys'] }); const set = sets[0]; const named = set && set.tags.some((t) => t[0] === 'p' && t[1] === hex); const role = set && set.tags.find((t) => t[0] === 'p' && t[1] === hex);
        ctl.append(wiki.card([['claims', link('key.html?did=did:nostr:' + claimed, 'did:nostr:' + claimed.slice(0, 8) + '…' + claimed.slice(-4))], role ? ['as', `${role[3] || ''}${role[4] ? ' · ' + role[4] : ''}`] : null].filter(Boolean)));
        if (named) { const ok = (await wiki.nostrCheck(set)); ctl.append(light(ok.idOK && ok.sigOK ? 'ok' : 'bad', ok.idOK && ok.sigOK ? 'the controller\'s key set names this key, signed by the controller (checked here): both directions hold' : 'the controller\'s key set does not verify ✗')); }
        else ctl.append(light('grey', set ? 'the controller\'s key set does not name this key: a claim, not confirmed' : 'the controller has published no key set: a claim, not confirmed')); }
      // keys this key controls
      const own = ownSets[0]; if (own) { const ks = sec('keys this key controls'); const members = own.tags.filter((t) => t[0] === 'p'); const backs = await query({ kinds: [0], authors: members.map((t) => t[1]) });
        for (const m of members) { const bp = backs.find((e) => e.pubkey === m[1]); let bc = {}; try { bc = JSON.parse(bp?.content || '{}'); } catch {} const back = bc.controller === did || (bp?.tags || []).some((t) => t[0] === 'p' && t[1] === hex && t[3] === 'controller');
          const box = el('div', 'mark'); const h = el('div'); h.append(link('key.html?did=did:nostr:' + m[1], (bc.name || 'did:nostr:' + m[1].slice(0, 8) + '…' + m[1].slice(-4))), ` · ${m[3] || 'key'}${m[4] ? ' · ' + m[4] : ''}`); box.append(h); box.append(light(back ? 'ok' : 'grey', back ? 'its profile names this key as controller: both directions hold' : 'its profile does not name this key back: named, not confirmed')); ks.append(box); } }
      // GitHub identity, NIP-39: the gist must contain this key's npub
      const gh = (prof?.tags || []).find((t) => t[0] === 'i' && String(t[1]).startsWith('github:')); if (gh) { const g = sec('GitHub'); const handle = gh[1].slice(7); g.append(wiki.card([['claims', link('https://github.com/' + handle, handle)], ['proof', link('https://gist.github.com/' + handle + '/' + gh[2], 'gist ' + String(gh[2]).slice(0, 10) + '…')]]));
        try { const j = await (await fetch('https://api.github.com/gists/' + gh[2])).json(); const text = Object.values(j.files || {}).map((f) => f.content || '').join('\n'); const owner = j.owner && j.owner.login; g.append(light(owner && owner.toLowerCase() === handle.toLowerCase() && text.includes(npub(hex)) ? 'ok' : 'bad', owner && owner.toLowerCase() === handle.toLowerCase() && text.includes(npub(hex)) ? `the gist is ${owner}'s and contains this key's npub (checked here)` : 'the gist does not prove it ✗')); } catch { g.append(light('grey', 'the gist could not be fetched')); } }
      // rows on the record, and events on the relays
      const rows = sec('what this key signed'); let idx = { attestations: [] }; try { idx = await (await fetch(new URL('data/attestations.json', wiki.ROOT))).json(); } catch {}
      const mine = idx.attestations.filter((a) => a.pubkey === hex); const onRelays = signed.filter((e) => !mine.some((a) => a.id === e.id));
      if (!mine.length && !onRelays.length) rows.append(light('grey', 'no attestations by this key, on the record or on these relays'));
      for (const a of mine) { const box = el('div', 'mark'); const h = el('div'); h.append(link(`snapshots/${a.network}-${a.height}.html`, `${a.network} ${a.height.toLocaleString('en-US')}`), ` · ${a.method}${a.chainstate === 'full' ? ', full sync' : ' (' + a.chainstate + ')'} · ${a.at}`); box.append(h); box.append(el('div', 'muted', a.txoutsetHash)); box.append(light('ok', 'on the record; checked on the snapshot page')); box.append((() => { const d = el('div', 'muted'); d.append(link(a.file, 'the event')); return d; })()); rows.append(box); }
      for (const e of onRelays) { let st = {}; try { st = JSON.parse(e.content); } catch {} const s = st.subject || {}, c = st.claim || {}; const box = el('div', 'mark'); const h = el('div'); h.append(`${st['@type'] === 'Dispute' ? 'DISPUTE · ' : ''}${s.network || '?'} ${s.height ? Number(s.height).toLocaleString('en-US') : '?'} · ${c.method || '?'} · ${new Date(e.created_at * 1000).toISOString().slice(0, 10)}`); box.append(h); if (s.txoutsetHash) box.append(el('div', 'muted', s.txoutsetHash)); const v = await wiki.nostrCheck(e); box.append(light(v.idOK && v.sigOK ? 'ok' : 'bad', v.idOK && v.sigOK ? 'signed by this key (checked here) · on the relays, not on the record' : 'the signature does not verify ✗')); rows.append(box); }
      root.append(el('p', 'muted', 'Green is what this page checked: signatures, and that a controller and its key agree in both directions. A name is a claim; the history is the key\'s.'));
    },
  });
})();
