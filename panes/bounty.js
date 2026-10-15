// The Bounty pane: the marking vocabulary (https://bitmark.co/marking/): the object's parties, subject and amount, and its signature checked when it has one.
wiki.panes.push({
  name: 'bounty',
  label: (doc) => wiki.has(doc, 'Bounty') ? 'bounty' : null,
  render: (doc, root) => {
    const { el, link, hash, facts, card, light } = wiki;
    const who = doc.from || doc.by; const id = (x) => x && (x['@id'] || x);
    root.append(facts([['amount', doc.amount != null ? doc.amount + ' mark' + (doc.amount === 1 ? '' : 's') : null], ['outcome', doc.verdict ? id(doc.verdict) : null], ['when', doc.at ? String(doc.at).slice(0, 10) : null], ['deadline', doc.deadline ? String(doc.deadline).slice(0, 10) : null]]));
    root.append(card([who ? [doc.from ? 'from' : 'by', link(id(who))] : null, doc.to ? ['to', link(id(doc.to))] : null, doc.subject ? ['subject', link(id(doc.subject))] : null, doc.claim ? ['claim', typeof doc.claim === 'object' ? link(id(doc.claim)) : doc.claim] : null, doc.rule ? ['rule', typeof doc.rule === 'object' ? link(id(doc.rule)) : doc.rule] : null, doc.reason ? ['reason', doc.reason] : null, doc.evidence && typeof doc.evidence === 'string' ? ['evidence', doc.evidence] : null].filter(Boolean)));
    if (doc.evidence && typeof doc.evidence === 'object') { root.append(el('h3', null, 'evidence')); root.append(wiki.table(doc.evidence)); }
    if (doc.example) root.append(light('grey', 'an example object, unsigned: it shows the shape, it gives nothing'));
    wiki.markCheck(doc, id(who)).then((ok) => root.append(ok === null ? light('grey', 'unsigned') : light(ok ? 'ok' : 'bad', ok ? 'signed by ' + (doc.from ? 'from' : 'by') + ' over the canonical object (checked here)' : 'the signature does not verify')));
  },
});
