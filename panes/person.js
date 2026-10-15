// The Person pane: a profile for a human: name, homepage, the same person elsewhere, what they maintain.
wiki.panes.push({
  name: 'person',
  label: (doc) => wiki.has(doc, 'Person') ? 'profile' : null,
  render: (doc, root) => {
    const { el, link, card } = wiki; const id = (x) => x && (x['@id'] || x);
    root.append(card([doc.homepage ? ['homepage', link(id(doc.homepage))] : null, ...[].concat(doc.sameAs || []).map((s) => ['same as', link(id(s))]), ...[].concat(doc.maintains || []).map((m) => ['maintains', link(id(m))]), ...[].concat(doc.knows || []).map((k) => ['knows', link(id(k))])].filter(Boolean)));
    root.append(el('p', 'muted', 'A person is named here by what they publish and the keys that sign it; nothing on this page is checked, since a person is not a hash.'));
  },
});
