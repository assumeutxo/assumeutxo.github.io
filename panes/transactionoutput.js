// The TransactionOutput pane: one coin. By value (the transaction's bytes in the island) the txid is recomputed with the
// kernel's codec and the output read from the bytes; by name only the outpoint is shown. Spend status is not known here.
wiki.panes.push({
  name: 'transactionoutput',
  label: 'coin',
  canHandle: (subject, store) => wiki.has(store.get(subject) || {}, 'TransactionOutput'),
  render(subject, store, root, raw) {
    const doc = raw || store.get(subject);
    const { el, link, hash, facts, card, light } = wiki;
    const hex = doc.transaction && doc.transaction.hex; const chain = doc.chain || 'txbt4';
    const head = el('div'); root.append(head);
    if (!hex) { root.append(facts([['chain', chain], ['output', doc.vout]])); root.append(card([['txid', hash(doc.txid)]])); root.append(light('grey', 'given by name only: the bytes are not in this page, so nothing is checked here')); return; }
    wiki.kit().then(({ codec }) => {
      const tx = codec.decode('Transaction', hex); const txid = codec.txid(tx); const o = tx.outputs[doc.vout];
      if (!o) { root.append(light('bad', `the transaction has ${tx.outputs.length} outputs; there is no output ${doc.vout}`)); return; }
      const addr = wiki.address(chain, o.scriptPubKey);
      root.append(facts([['value', o.value.toLocaleString('en-US') + ' sats'], ['', (o.value / 1e8).toFixed(8) + ' ' + (chain === 'txbt4' ? 'tBTC' : chain)], ['output', `${doc.vout} of ${tx.outputs.length}`], ['script', wiki.scriptKind(o.scriptPubKey)]]));
      const txLink = link(new URL('tx.html?hex=' + hex, wiki.ROOT).href, 'the whole transaction');
      root.append(card([['txid', hash(txid)], addr ? ['address', hash(addr)] : null, ['scriptPubKey', hash(o.scriptPubKey)], ['transaction', txLink]].filter(Boolean)));
      root.append(light(txid === doc.txid ? 'ok' : 'bad', txid === doc.txid ? 'the bytes hash to the txid named (checked here)' : `the bytes hash to ${txid.slice(0, 16)}…, not the txid named`));
      root.append(light('grey', 'whether it is spent is not known from the bytes; an explorer or a node would say'));
    }).catch((e) => root.append(light('bad', 'could not decode: ' + e.message)));
  },
});
