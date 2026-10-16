// The Guide pane: sections, each with a heading; prose, a code block, numbered steps (each with its own command when it has one), and a link or links where the section points somewhere.
wiki.panes.push({
  label: 'guide',
  canHandle: (subject, store) => wiki.has(store.get(subject) || {}, 'Guide'),
  render(subject, store, root, raw) {
    const doc = raw || store.get(subject); const { el, link } = wiki;
    for (const s of [].concat(doc.sections || [])) {
      root.append(el('h3', null, s.name)); if (s.text) root.append(el('p', 'prose', s.text));
      if (s.code) { const pre = el('pre', 'code'); pre.textContent = s.code; root.append(pre); }
      // steps: an ordered list; a step is prose, or { text, code } when it has a command to show
      if (s.steps) { const ol = el('ol', 'steps'); for (const st of s.steps) { const li = el('li'); li.append(el('p', 'prose', typeof st === 'string' ? st : st.text)); if (st.code) { const pre = el('pre', 'code'); pre.textContent = st.code; li.append(pre); } ol.append(li); } root.append(ol); }
      const links = [].concat(s.link || []).concat(s.links || []); if (links.length) { const ul = el('ul', 'links'); for (const l of links) { const li = el('li'); li.append(link(l['@id'], l.name || l['@id'])); ul.append(li); } root.append(ul); }
    }
  },
});
