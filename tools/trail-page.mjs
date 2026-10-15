#!/usr/bin/env node
// Rebuild trail.html from the trail as git-mark exports it, every mark given by value: the transaction bytes from the
// local node, and the block when the mark is confirmed. The page is then its own proof, bar the blocks.
//   node tools/trail-page.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'); const HOME = homedir();
const GITMARK = process.env.GITMARK ?? `${HOME}/remote/github.com/blocktrails/git-mark`;
const { makeRpc } = await import(`${HOME}/faucet/lib/rpc.mjs`);
const rpc = await makeRpc('~/knots-testnet4/bitcoin.conf', 'btc:testnet4-blake2b');
const trail = JSON.parse(execFileSync('node', [`${GITMARK}/bin/git-mark.js`, 'trail'], { cwd: ROOT, encoding: 'utf8' }));
const txo = [];
for (const uri of trail.txo) {
  const txid = uri.split(':')[2];
  const tx = await rpc('getrawtransaction', txid, 1);
  const entry = { '@id': uri, hex: tx.hex };
  if (tx.blockhash) entry.block = { hash: tx.blockhash, height: (await rpc('getblockheader', tx.blockhash)).height };
  txo.push(entry);
}
const island = { '@context': 'https://bitcoin-desktop.github.io/schema/context.jsonld', '@id': '#this', name: "this wiki's trail on txbt4",
  description: 'Each anchored commit of this repo is a state on a Blocktrails git-mark trail. Every mark is given by value: the transaction bytes, and the block once it has one, are in this island, so the commitments can be checked with no explorer.',
  creator: { '@id': 'me.html#me' }, verifier: { '@id': 'https://blocktrails.org/verify/' }, ...trail, txo };
const html = `<!doctype html>\n<meta charset="utf-8"><title>datawiki trail</title>\n<script type="application/ld+json">\n${JSON.stringify(island, null, 2)}\n</script>\n<script src="wiki.js"></script>\n`;
writeFileSync(`${ROOT}/trail.html`, html);
console.log(`trail.html: ${txo.length} mark(s) by value, ${txo.filter((t) => t.block).length} with a block`);
