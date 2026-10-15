// The Faucet pane: a service card. Where to be paid from, how much, the voucher it mints, where a voucher is redeemed,
// and what it has paid to this wiki, as txo: links.
wiki.panes.push({
  name: 'faucet',
  label: (doc) => [].concat(doc['@type'] || []).includes('Faucet') ? 'faucet' : null,
  render: (doc, root) => {
    const { el, link, value } = wiki;
    const copy = (text) => { const b = el('button', 'copy', 'copy'); b.onclick = () => navigator.clipboard.writeText(text).then(() => { b.textContent = 'copied'; setTimeout(() => (b.textContent = 'copy'), 1200); }); return b; };
    const facts = el('div', 'facts');
    const fact = (k, v) => { const f = el('div', 'fact'); f.append(el('span', 'fk', k), el('span', 'fv', v)); facts.append(f); };
    fact('network', doc.network || '?'); if (doc.defaultPayout) fact('pays', doc.defaultPayout.sats.toLocaleString('en-US') + ' sats'); if (doc.maxPayout) fact('at most', doc.maxPayout.sats.toLocaleString('en-US') + ' sats');
    root.append(facts);
    const card = el('div', 'idcard');
    const row = (k, ...v) => { const r = el('div', 'prow'); r.append(el('span', 'pk', k)); const pv = el('span', 'pv'); pv.append(...v); r.append(pv); card.append(r); };
    if (doc.address) row('its address', el('span', 'hash', doc.address), copy(doc.address));
    if (doc.agent) row('its key', link(doc.agent['@id']));
    if (doc.voucherFormat) row('voucher', el('code', null, doc.voucherFormat));
    for (const r of [].concat(doc.redeemWith || [])) row('redeem at', link(r['@id']));
    root.append(card);
    const paid = [].concat(doc.fundedThisWiki || []);
    if (paid.length) { root.append(el('h3', null, 'paid to this wiki')); const ul = el('ul'); for (const p of paid) { const li = el('li'); li.append(link(p['@id'])); ul.append(li); } root.append(ul); }
    root.append(el('p', 'muted', 'A voucher is a bearer string: whoever holds it can sweep the coin. The faucet prints it once and keeps no copy.'));
  },
});
