// The FraudProof pane: a claim that an attestation is wrong, with the evidence that lets anyone rerun the check.
wiki.panes.push({
  name: 'fraudproof',
  label: (doc) => wiki.has(doc, 'FraudProof') ? 'fraud proof' : null,
  render: (doc, root) => {
    const { el, link, hash, facts, card, light } = wiki;
    root.append(facts([['kind', doc.kind], ['against', doc.against && doc.against.height != null ? `height ${doc.against.height}` : null], ['filed', doc.at ? String(doc.at).slice(0, 10) : null]]));
    root.append(card([['against', doc.against && doc.against['@id'] ? link(doc.against['@id']) : null], ['prover', doc.prover ? link(doc.prover['@id']) : null], ['claim', doc.claim]].filter((r) => r[1])));
    if (doc.evidence) { root.append(el('h3', null, 'evidence')); root.append(wiki.table(doc.evidence)); }
    if (doc.example) root.append(light('grey', 'an example: no such attestation was wrong; this shows the shape a proof takes'));
    root.append(light('grey', 'the verdict is the kernel\'s: rerun the evidence and see whether the claim holds; not run here'));
  },
});
