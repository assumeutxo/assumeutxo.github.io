#!/usr/bin/env node
// From data/snapshots.json: a page per snapshot that has no hand-made page, and the landing page's island. One source, many pages.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'); const CTX = 'https://bitcoin-desktop.github.io/schema/context.jsonld';
const D = JSON.parse(readFileSync(`${ROOT}/data/snapshots.json`, 'utf8'));
import { withOgp } from './ogp.mjs';
const page = (path, title, island, up) => writeFileSync(`${ROOT}/${path}`, withOgp(`<!doctype html>\n<meta charset="utf-8"><title>${title}</title>\n<script type="application/ld+json">\n${JSON.stringify(island, null, 2)}\n</script>\n<script src="${up}wiki.js"></script>\n`, path));
import { readdirSync } from 'node:fs';
// every announcement we hold, as a NostrEvent page by value (id and signature are checked in the page)
const evPages = new Map();
for (const f of (existsSync(`${ROOT}/data/events`) ? readdirSync(`${ROOT}/data/events`) : []).filter((f) => f.endsWith('.json'))) {
  const ev = JSON.parse(readFileSync(`${ROOT}/data/events/${f}`, 'utf8')); const short = ev.id.slice(0, 8); const title = (ev.tags.find((t) => t[0] === 'title') || [])[1] || 'announcement';
  page(`events/${short}.html`, `announcement: ${title}`, { '@context': CTX, '@id': '#this', '@type': 'NostrEvent', name: `announcement: ${title}`, description: 'A kind 2003 torrent announcement on Nostr, by value: id, author and signature are checked here. An announcement states facts read from named sources; it is not an attestation that the file was loaded.', event: ev, creator: { '@id': '../me.html#me' } }, '../');
  evPages.set(ev.id, `events/${short}.html#this`);
}
// formal attestations held by value under attestations/<network>-<height>/<pubkey>.json: indexed for the pages, checked in the page
const formal = [];
for (const dir of (existsSync(`${ROOT}/attestations`) ? readdirSync(`${ROOT}/attestations`, { withFileTypes: true }) : []).filter((d) => d.isDirectory())) {
  const m = dir.name.match(/^(\w+)-(\d+)$/); if (!m) continue;
  for (const f of readdirSync(`${ROOT}/attestations/${dir.name}`).filter((f) => /^[0-9a-f]{64}\.json$/.test(f))) {
    const ev = JSON.parse(readFileSync(`${ROOT}/attestations/${dir.name}/${f}`, 'utf8')); if (ev.kind !== 3332) continue; const st = JSON.parse(ev.content);
    let bits = 0; for (const c of ev.pubkey) { const n = parseInt(c, 16); if (n === 0) { bits += 4; continue; } bits += Math.clz32(n) - 28; break; }
    formal.push({ network: m[1], height: Number(m[2]), file: `attestations/${dir.name}/${f}`, id: ev.id, pubkey: ev.pubkey, bits, method: st.claim.method, chainstate: st.claim.chainstate, implementation: st.claim.implementation, computedAt: st.claim.computedAt, txoutsetHash: st.subject.txoutsetHash, at: new Date(ev.created_at * 1000).toISOString().slice(0, 10) });
  }
}
writeFileSync(`${ROOT}/data/attestations.json`, JSON.stringify({ '@type': 'AttestationIndex', description: 'every formal attestation held on this site, by file; each file is a kind 3332 Nostr event (NIP-332) whose signature and statement are checked in the page that shows it', attestations: formal }, null, 2) + '\n');
const formalFor = (s) => formal.filter((a) => a.network === s.network && a.height === s.height);
let made = 0; const entries = [];
for (const s of D.snapshots) {
  const path = s.page || `snapshots/${s.network}-${s.height}.html`; const id = path + '#this';
  if (!s.page) {
    const refs = (s.sourceRefs || []).map((k) => D.sources[k]).filter(Boolean);
    const island = { '@context': CTX, '@id': '#this', '@type': 'Snapshot', name: `${s.network} assumeUTXO snapshot at ${s.height}`,
      description: `UTXO set of ${s.chain} at height ${s.height.toLocaleString('en-US')}, as Bitcoin Core's chain parameters name it: the txoutset hash is the entry a node compares against after loading. ${s.sharedWith ? 'Shared with ' + s.sharedWith + '. ' : ''}Facts read from the sources below; we have not loaded this one ourselves.`,
      network: s.network, chain: s.chain, height: s.height, txoutsetHash: s.txoutsetHash, chainTxCount: s.chainTxCount, bytes: s.bytes, sha256: s.sha256, sharedWith: s.sharedWith,
      torrent: s.infohash ? { '@type': 'Torrent', infohash: s.infohash, magnet: s.magnet, webseed: s.mirror ? [{ '@id': s.mirror }] : undefined } : undefined, bytesFrom: s.bytesFrom,
      source: refs[0], sources: refs, producedBy: s.source, note: s.note,
      attestations: (s.attestations || formalFor(s).length) ? [...formalFor(s).map((a) => ({ '@id': '../' + a.file, '@type': 'Attestation', form: 'formal', kind: 3332, signer: { '@id': 'did:nostr:' + a.pubkey }, bits: a.bits, method: a.method, at: a.at })), ...(s.attestations || []).map((a) => ({ '@type': 'Attestation', form: a.form, by: a.by, at: a.at, did: a.did, says: a.txoutsetHash ? { height: s.height, txoutsetHash: a.txoutsetHash } : undefined, where: a.where ? { '@id': a.where } : undefined }))] : undefined,
      announcedAt: s.announcedAt && s.announcedAt.id ? [{ '@id': '../' + evPages.get(s.announcedAt.id), '@type': 'NostrEvent', kind: 2003, id: s.announcedAt.id, browse: { '@id': 'https://nostrapps.github.io/ntorrent/?q=assumeutxo' } }] : undefined,
      creator: { '@id': '../me.html#me' } };
    for (const k of Object.keys(island)) if (island[k] === undefined) delete island[k]; if (island.torrent && island.torrent.webseed === undefined) delete island.torrent.webseed;
    page(path, `${s.network} snapshot at ${s.height}`, island, '../'); made++;
  }
  entries.push({ '@id': id, '@type': 'Snapshot', name: `${s.network} at ${s.height.toLocaleString('en-US')}`, attested: (s.attestations || formalFor(s).length) ? { formal: formalFor(s).length + (s.attestations || []).filter((a) => a.form === 'formal').length, informal: (s.attestations || []).filter((a) => a.form !== 'formal').length } : undefined, network: s.network, chain: s.chain, height: s.height, coins: s.coins, bytes: s.bytes, txoutsetHash: s.txoutsetHash, source: s.source, sharedWith: s.sharedWith,
    torrent: s.infohash && s.page ? { '@id': path.replace('snapshots/', 'torrents/').replace(/^torrents\/(txbt4|xbt)-(\d+)\.html/, (m, n, h) => n === 'txbt4' ? 'torrents/utxo-knots-150307.html' : 'torrents/utxo-976000.html') + '#this' } : undefined, magnet: s.magnet, webseed: !!(s.webseed || s.mirror), announcedAt: typeof s.announcedAt === 'string' ? { '@id': s.announcedAt } : s.announcedAt && s.announcedAt.id ? { '@id': evPages.get(s.announcedAt.id) } : undefined });
}
for (const e of entries) for (const k of Object.keys(e)) if (e[k] === undefined) delete e[k];
entries.push({ '@id': 'https://nostrapps.github.io/ntorrent/?q=assumeutxo', '@type': 'WebPage', name: 'browse assumeutxo torrents on ntorrent', description: 'every kind 2003 announcement tagged assumeutxo, on Nostr, whoever posted it' },
  { '@id': 'https://bitcoin-snapshots.jaonoctus.dev/', '@type': 'WebPage', name: 'bitcoin-snapshots.jaonoctus.dev', description: 'torrents of the Core snapshots for mainnet, testnet3, testnet4 and signet, with SHA-512 sums and a GPG signature' },
  { '@id': 'https://github.com/bitcoin/bitcoin/blob/master/src/kernel/chainparams.cpp', '@type': 'WebPage', name: 'Bitcoin Core chainparams', description: 'the assumeutxo entries a Core node accepts, by height and txoutset hash' });
const island = { '@context': CTX, '@id': '#this', '@type': ['SnapshotIndex', 'Index'], name: 'assumeUTXO snapshots',
  description: 'Every UTXO set snapshot we know of, across the SHA256d and BLAKE2b Bitcoin chains: mainnet, testnet3, testnet4 and signet, with their identity by txoutset hash, their torrents and announcements, and who has verified them. A snapshot is named by its txoutset hash; a file is proven by its sha256 and its infohash; a torrent or a host is only where a copy was.',
  creator: { '@id': 'me.html#me' }, trail: { '@id': 'trail.html#this' }, data: { '@id': 'data/snapshots.json' },
  networks: (() => { const N = JSON.parse(readFileSync(`${ROOT}/data/networks.jsonld`, 'utf8')).networks; const order = ['btc', 'xbt', 'tbtc4', 'txbt4', 'tbtc3', 'signet']; return order.map((id) => N.find((n) => n.id === id)).filter(Boolean).map((n) => ({ '@id': 'networks.html#this', id: n.id, name: n.name })); })(),
  status: ['What is here: every published snapshot, its torrents and announcements; the informal verifications found in the Core and Knots review threads, each linked to its source; and the first formal attestations, signed statements (', { '@id': 'https://nip-332.github.io/', name: 'NIP-332' }, ') checked in the page. ', { '@id': 'https://github.com/assumeutxo/assumeutxo.github.io/issues/2', name: 'Fraud proofs' }, ' are coming. You can add yours: see ', { '@id': 'attest.html#this', name: 'attesting a snapshot' }, '.'],
  entries };
page('index.html', 'assumeUTXO snapshots', island, '');
// the networks page, from data/networks.jsonld: the same nodes with ids resolved against the page
{ const N = JSON.parse(readFileSync(`${ROOT}/data/networks.jsonld`, 'utf8')); const isl = { ...N, '@id': '#this', data: { '@id': 'data/networks.jsonld' }, networks: N.networks.map((n) => ({ ...n, '@id': 'data/networks.jsonld' + n['@id'], ...(n.forkOf ? { forkOf: { '@id': 'data/networks.jsonld' + n.forkOf['@id'] } } : {}) })) }; page('networks.html', 'networks', isl, ''); }
console.log(`${made} snapshot pages, ${evPages.size} announcement pages written, ${entries.length} entries on index.html`);
// the sitemap follows the pages
await import('./sitemap.mjs');
