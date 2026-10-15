// The Transaction pane: a whole transaction from its bytes: txid recomputed, inputs as outpoints, outputs as coins.
wiki.panes.push({
  name: 'transaction',
  label: 'transaction',
  canHandle: (subject, store) => wiki.has(store.get(subject) || {}, 'Transaction'),
  render(subject, store, root, raw) {
    const doc = raw || store.get(subject);
    const { el, link, hash, facts, card, light } = wiki; const chain = doc.chain || 'txbt4';
    if (!doc.hex) { root.append(light('grey', 'given by name only; nothing to decode')); return; }
    wiki.kit().then(({ codec }) => {
      const tx = codec.decode('Transaction', doc.hex); const txid = codec.txid(tx);
      const out = tx.outputs.reduce((n, o) => n + o.value, 0);
      root.append(facts([['inputs', tx.inputs.length], ['outputs', tx.outputs.length], ['out', out.toLocaleString('en-US') + ' sats'], ['bytes', doc.hex.length / 2], ['version', tx.version], ['locktime', tx.lockTime ?? tx.locktime ?? 0]]));
      root.append(card([['txid', hash(txid)]]));
      root.append(light(doc.txid ? (txid === doc.txid ? 'ok' : 'bad') : 'ok', doc.txid ? (txid === doc.txid ? 'the bytes hash to the txid named (checked here)' : 'the bytes do not hash to the txid named') : 'txid recomputed from the bytes'));
      root.append(el('h3', null, 'inputs'));
      const ins = el('ul'); tx.inputs.forEach((i) => { const li = el('li'); const p = i.prevout; if (p && !/^0{64}$/.test(p.txid)) li.append(link(new URL(`coin.html?txo=txo:${chain}:${p.txid}:${p.vout}`, wiki.ROOT).href, `${p.txid.slice(0, 16)}…:${p.vout}`)); else li.append('coinbase'); ins.append(li); }); root.append(ins);
      root.append(el('h3', null, 'outputs'));
      const outs = el('ul'); tx.outputs.forEach((o, n) => { const li = el('li'); const a = wiki.address(chain, o.scriptPubKey); li.append(link(new URL(`coin.html?txo=txo:${chain}:${txid}:${n}?hex=${doc.hex}`, wiki.ROOT).href, `${n}`), ` · ${o.value.toLocaleString('en-US')} sats · ${wiki.scriptKind(o.scriptPubKey)}${a ? ' · ' + a.slice(0, 14) + '…' : ''}`); outs.append(li); }); root.append(outs);
    }).catch((e) => root.append(light('bad', 'could not decode: ' + e.message)));
  },
});
