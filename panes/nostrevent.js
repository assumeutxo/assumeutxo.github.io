// The NostrEvent pane: the event checked in the page: its id is the hash of its serialisation, its signature verifies for its author.
const NOSTR_KINDS = { 0: 'profile', 1: 'note', 3: 'follows', 2003: 'torrent (NIP-35)', 2004: 'torrent comment', 30333: 'tip attestation (provisional)' };
wiki.panes.push({
  name: 'nostrevent',
  label: 'event',
  canHandle: (subject, store) => wiki.has(store.get(subject) || {}, 'NostrEvent'),
  render(subject, store, root, raw) {
    const doc = raw || store.get(subject);
    const { el, link, hash, facts, card, light } = wiki;
    const ev = doc.event || doc; const when = ev.created_at ? new Date(ev.created_at * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : null;
    root.append(facts([['kind', `${ev.kind}${NOSTR_KINDS[ev.kind] ? ' · ' + NOSTR_KINDS[ev.kind] : ''}`], ['created', when], ['tags', (ev.tags || []).length]]));
    root.append(card([['author', hash(wiki.npub(ev.pubkey))], ['id', hash(ev.id)], ['sig', hash(ev.sig)]]));
    // the facts the event carries are its tags; the content is prose written for a relay and stays in the raw view
    if (ev.tags && ev.tags.length) {
      root.append(el('h3', null, 'what it states'));
      const LABEL = { x: 'infohash', t: 'topics', r: 'references', n: 'network', d: 'identifier', tracker: 'trackers', file: 'file', title: 'title', sha256: 'sha256', txoutset_hash: 'txoutset hash', height: 'height', hash: 'block', muhash: 'muhash', coins: 'coins', rules: 'rules', engine: 'engine', base: 'base block', e: 'event', p: 'key' };
      const SKIP = new Set(['alt', 'i']); const groups = new Map();
      for (const tag of ev.tags) { if (SKIP.has(tag[0])) continue; (groups.get(tag[0]) || groups.set(tag[0], []).get(tag[0])).push(tag.slice(1)); }
      const t = el('table');
      for (const [k, vals] of groups) {
        const tr = el('tr'); tr.append(el('td', 'k', LABEL[k] || k)); const v = el('td', 'v');
        if (k === 'file') { for (const f of vals) { const d = el('div'); d.append(el('span', null, f[0]), f[1] ? el('span', 'muted', ` · ${Number(f[1]).toLocaleString('en-US')} bytes`) : ''); v.append(d); } }
        else if (k === 't') v.append(el('span', null, vals.map((x) => x[0]).join(' · ')));
        else if (vals.length === 1 && vals[0].length === 1) v.append(wiki.value(vals[0][0]));
        else { const ul = el('ul'); for (const x of vals) { const li = el('li'); li.append(wiki.value(x.length === 1 ? x[0] : x)); ul.append(li); } v.append(ul); }
        tr.append(v); t.append(tr);
      }
      root.append(t);
    }
    const lights = el('div'); root.append(lights);
    wiki.nostrCheck(ev).then(({ idOK, sigOK }) => { lights.append(light(idOK ? 'ok' : 'bad', idOK ? 'the id is the hash of the event as serialised (checked here)' : 'the id does not match the event'), light(sigOK ? 'ok' : 'bad', sigOK ? 'the signature verifies for the author (checked here)' : 'the signature does not verify')); }).catch((e) => lights.append(light('bad', 'could not check: ' + e.message)));
  },
});
