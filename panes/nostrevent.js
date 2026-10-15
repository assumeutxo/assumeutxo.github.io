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
    if (ev.content) root.append(el('pre', null, ev.content));
    if (ev.tags && ev.tags.length) { root.append(el('h3', null, 'tags')); const t = el('table'); for (const tag of ev.tags) { const tr = el('tr'); tr.append(el('td', 'k', tag[0])); const v = el('td', 'v'); v.append(wiki.value(tag.slice(1).length === 1 ? tag[1] : tag.slice(1))); tr.append(v); t.append(tr); } root.append(t); }
    const lights = el('div'); root.append(lights);
    wiki.nostrCheck(ev).then(({ idOK, sigOK }) => { lights.append(light(idOK ? 'ok' : 'bad', idOK ? 'the id is the hash of the event as serialised (checked here)' : 'the id does not match the event'), light(sigOK ? 'ok' : 'bad', sigOK ? 'the signature verifies for the author (checked here)' : 'the signature does not verify')); }).catch((e) => lights.append(light('bad', 'could not check: ' + e.message)));
  },
});
