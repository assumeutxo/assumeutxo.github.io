#!/usr/bin/env node
// Announce every snapshot in data/snapshots.json that has no announcement yet as a NIP-35 (kind 2003) torrent event,
// signed with the knots key (git config nostr.privkey in ~/ideas/knots, never argv), the key that announced the first two.
// An announcement is not an attestation: the content says where each fact was read and that we have not loaded the file.
//   node tools/announce-snapshots.mjs [--dry]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'); const HOME = homedir(); const dry = process.argv.includes('--dry');
const { finalizeEvent, parsePrivateKey, publicKey, RelayPool } = await import(`${HOME}/remote/github.com/bitcoin-desktop/headers/publisher/nostr.js`);
const RELAYS = ['wss://nos.lol', 'wss://relay.damus.io', 'wss://nostr.mom', 'wss://relay.primal.net', 'wss://relay.nostr.band', 'wss://nostr.oxtr.dev'];
const WIKI = 'https://assumeutxo.com/'; // the record's address appears only as an r tag, never in the content: a host is where the data is, not a fact about the snapshot
const D = JSON.parse(readFileSync(`${ROOT}/data/snapshots.json`, 'utf8'));
const CHAIN_WORDS = { btc: ['mainnet'], xbt: ['mainnet', 'blake2b'], tbtc3: ['testnet', 'testnet3'], tbtc4: ['testnet', 'testnet4'], txbt4: ['testnet', 'testnet4', 'blake2b'], signet: ['signet'] };
const priv = dry ? null : parsePrivateKey(execFileSync('git', ['config', 'nostr.privkey'], { cwd: `${HOME}/ideas/knots`, encoding: 'utf8' }));
const pub = dry ? 'cccccc0a8338a4aba51691f309f2f892c6c58f655a1ec3fc30522c894c166d9c' : publicKey(priv);
if (pub !== 'cccccc0a8338a4aba51691f309f2f892c6c58f655a1ec3fc30522c894c166d9c') throw new Error('not the knots key that announced the first two');
const todo = D.snapshots.filter((s) => !s.announcedAt && s.infohash);
const events = [];
for (const s of todo) {
  const q = new URLSearchParams(s.magnet.split('?')[1] || ''); const dn = q.get('dn') || `utxo-${s.network}-${s.height}.dat`; const trackers = q.getAll('tr');
  const refs = (s.sourceRefs || []).map((k) => D.sources[k]).filter(Boolean);
  const page = `${WIKI}snapshots/${s.network}-${s.height}.html`;
  const title = `${s.chain} assumeUTXO snapshot at block ${s.height}`;
  const content = [
    `UTXO set of ${s.chain} at height ${s.height}, in Bitcoin Core's dumptxoutset v2 format.`,
    `txoutset hash (hash_serialized, the entry in Core's chainparams): ${s.txoutsetHash}`,
    s.sha256 ? `sha256 of the file: ${s.sha256}` : null,
    s.bytes ? `size: ${s.bytes} bytes${s.bytesFrom ? ' (' + s.bytesFrom + ')' : ''}` : null,
    s.chainTxCount ? `chain tx count: ${s.chainTxCount}` : null,
    s.sharedWith ? `Also valid for ${s.sharedWith}.` : null,
    '',
    `Provenance: ${s.source}.`, ...refs.map((r) => `${r.name}: ${r['@id']}`),
    s.mirror ? `Direct copy (also the web seed here): ${s.mirror}` : null,
    s.note ? s.note : null,
    '',
    'This is an announcement, not an attestation: the facts above were read from the sources named; the announcer has not loaded this file. Anyone who loads it and compares the txoutset hash can say so.',
  ].filter((l) => l !== null).join('\n');
  const tags = [['title', title], ['x', s.infohash], ['file', dn, String(s.bytes || 0)], ...trackers.map((t) => ['tracker', t]), ...(s.mirror ? [['tracker', s.mirror]] : []),
    ['alt', `Torrent: ${title}`], ['i', 'tcat:other'], ['t', 'assumeutxo'], ['t', 'utxo'], ['t', 'bitcoin'], ...CHAIN_WORDS[s.network].map((w) => ['t', w]), ['t', s.network], ['t', 'bitcoin-core'], ['t', 'bitcoin-kernel'],
    ['txoutset_hash', s.txoutsetHash], ...(s.sha256 ? [['sha256', s.sha256]] : []), ['n', s.network], ['height', String(s.height)], ...refs.map((r) => ['r', r['@id']]), ['r', page]];
  const ev = { kind: 2003, pubkey: pub, created_at: Math.floor(Date.now() / 1000), content, tags };
  events.push({ s, ev });
}
console.log(`${events.length} snapshot(s) to announce from ${pub.slice(0, 12)}…`);
if (dry) { const { s, ev } = events[0]; console.log(`\n--- sample: ${s.network} ${s.height}\n${JSON.stringify(ev.tags)}\n${ev.content}`); process.exit(0); }
mkdirSync(`${ROOT}/data/events`, { recursive: true });
const pool = new RelayPool(RELAYS); const up = await pool.connect(); console.log(`relays up: ${up}/${RELAYS.length}`);
for (const { s, ev } of events) {
  const signed = finalizeEvent(ev, priv); const oks = await pool.publish(signed);
  writeFileSync(`${ROOT}/data/events/${signed.id}.json`, JSON.stringify(signed, null, 2));
  s.announcedAt = { id: signed.id, kind: 2003, event: `data/events/${signed.id}.json`, relays: oks };
  console.log(`${s.network} ${s.height}: ${signed.id.slice(0, 12)}… acked by ${oks}`);
}
pool.close();
writeFileSync(`${ROOT}/data/snapshots.json`, JSON.stringify(D, null, 2) + '\n');
console.log('data/snapshots.json updated');
process.exit(0);
