// The Attestation pane: a node's signed statement of a tip: network, height, block hash, UTXO muhash, and the rules it checked.
// The event carrying it is verified here (id, signature, author); the agreement of the muhash with the chain is not.
wiki.panes.push({
  name: 'attestation',
  label: 'attestation',
  canHandle: (subject, store) => wiki.has(store.get(subject) || {}, 'Attestation'),
  render(subject, store, root, raw) {
    const doc = raw || store.get(subject);
    const { el, link, hash, facts, card, light } = wiki; const ev = doc.event;
    root.append(facts([['network', doc.network], ['height', doc.height], ['signed', ev && ev.created_at ? new Date(ev.created_at * 1000).toISOString().slice(0, 10) : null]]));
    root.append(card([['block', hash(doc.hash)], ['muhash', hash(doc.muhash)], doc.rules ? ['rules', hash(doc.rules.sha256)] : null, doc.rules && doc.rules.engine ? ['engine', hash(doc.rules.engine)] : null, doc.signer ? ['signer', link(doc.signer['@id'])] : null].filter(Boolean)));
    const lights = el('div'); root.append(lights);
    if (!ev) { lights.append(light('grey', 'no signed event in the page: the statement is unsigned here')); return; }
    const tag = (k) => (ev.tags.find((t) => t[0] === k) || [])[1];
    wiki.nostrCheck(ev).then(({ idOK, sigOK }) => {
      lights.append(light(idOK && sigOK ? 'ok' : 'bad', idOK && sigOK ? 'the event is signed by its author (checked here)' : 'the event does not verify'));
      const signer = (String(doc.signer && doc.signer['@id'] || '').match(/^did:nostr:([0-9a-f]{64})$/) || [])[1];
      if (signer) lights.append(light(signer === ev.pubkey ? 'ok' : 'bad', signer === ev.pubkey ? 'the author is the signer named (checked here)' : 'the author is not the signer named'));
      const same = tag('height') === String(doc.height) && tag('hash') === doc.hash && tag('muhash') === doc.muhash && tag('network') === doc.network;
      lights.append(light(same ? 'ok' : 'bad', same ? 'the event says what this page says: network, height, hash, muhash (checked here)' : 'the event and the page disagree'));
      lights.append(light('grey', 'whether the muhash is the chain\'s at that height is the kernel\'s question, and is not run here; a FraudProof is the answer when it is wrong'));
    }).catch((e) => lights.append(light('bad', 'could not check: ' + e.message)));
  },
});
