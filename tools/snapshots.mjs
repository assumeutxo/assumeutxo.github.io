#!/usr/bin/env node
// From data/snapshots.json: a page per snapshot that has no hand-made page, and the landing page's island. One source, many pages.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'); const CTX = 'https://bitcoin-desktop.github.io/schema/context.jsonld';
const D = JSON.parse(readFileSync(`${ROOT}/data/snapshots.json`, 'utf8'));
const page = (path, title, island, up) => writeFileSync(`${ROOT}/${path}`, `<!doctype html>\n<meta charset="utf-8"><title>${title}</title>\n<script type="application/ld+json">\n${JSON.stringify(island, null, 2)}\n</script>\n<script src="${up}wiki.js"></script>\n`);
import { readdirSync } from 'node:fs';
// every announcement we hold, as a NostrEvent page by value (id and signature are checked in the page)
const evPages = new Map();
for (const f of (existsSync(`${ROOT}/data/events`) ? readdirSync(`${ROOT}/data/events`) : []).filter((f) => f.endsWith('.json'))) {
  const ev = JSON.parse(readFileSync(`${ROOT}/data/events/${f}`, 'utf8')); const short = ev.id.slice(0, 8); const title = (ev.tags.find((t) => t[0] === 'title') || [])[1] || 'announcement';
  page(`events/${short}.html`, `announcement: ${title}`, { '@context': CTX, '@id': '#this', '@type': 'NostrEvent', name: `announcement: ${title}`, description: 'A kind 2003 torrent announcement on Nostr, by value: id, author and signature are checked here. An announcement states facts read from named sources; it is not an attestation that the file was loaded.', event: ev, creator: { '@id': '../me.html#me' } }, '../');
  evPages.set(ev.id, `events/${short}.html#this`);
}
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
      announcedAt: s.announcedAt && s.announcedAt.id ? [{ '@id': '../' + evPages.get(s.announcedAt.id), '@type': 'NostrEvent', kind: 2003, id: s.announcedAt.id, browse: { '@id': 'https://nostrapps.github.io/ntorrent/?q=assumeutxo' } }] : undefined,
      creator: { '@id': '../me.html#me' } };
    for (const k of Object.keys(island)) if (island[k] === undefined) delete island[k]; if (island.torrent && island.torrent.webseed === undefined) delete island.torrent.webseed;
    page(path, `${s.network} snapshot at ${s.height}`, island, '../'); made++;
  }
  entries.push({ '@id': id, '@type': 'Snapshot', name: `${s.network} at ${s.height.toLocaleString('en-US')}`, network: s.network, chain: s.chain, height: s.height, coins: s.coins, bytes: s.bytes, txoutsetHash: s.txoutsetHash, source: s.source, sharedWith: s.sharedWith,
    torrent: s.infohash && s.page ? { '@id': path.replace('snapshots/', 'torrents/').replace(/^torrents\/(txbt4|xbt)-(\d+)\.html/, (m, n, h) => n === 'txbt4' ? 'torrents/utxo-knots-150307.html' : 'torrents/utxo-976000.html') + '#this' } : undefined, magnet: s.magnet, webseed: !!(s.webseed || s.mirror), announcedAt: typeof s.announcedAt === 'string' ? { '@id': s.announcedAt } : s.announcedAt && s.announcedAt.id ? { '@id': evPages.get(s.announcedAt.id) } : undefined });
}
for (const e of entries) for (const k of Object.keys(e)) if (e[k] === undefined) delete e[k];
entries.push({ '@id': 'https://nostrapps.github.io/ntorrent/?q=assumeutxo', '@type': 'WebPage', name: 'browse assumeutxo torrents on ntorrent', description: 'every kind 2003 announcement tagged assumeutxo, on Nostr, whoever posted it' },
  { '@id': 'https://bitcoin-snapshots.jaonoctus.dev/', '@type': 'WebPage', name: 'bitcoin-snapshots.jaonoctus.dev', description: 'torrents of the Core snapshots for mainnet, testnet3, testnet4 and signet, with SHA-512 sums and a GPG signature' },
  { '@id': 'https://github.com/bitcoin/bitcoin/blob/master/src/kernel/chainparams.cpp', '@type': 'WebPage', name: 'Bitcoin Core chainparams', description: 'the assumeutxo entries a Core node accepts, by height and txoutset hash' });
const island = { '@context': CTX, '@id': '#this', '@type': ['SnapshotIndex', 'Index'], name: 'assumeUTXO snapshots',
  description: 'Every UTXO set snapshot we know of, across Bitcoin and the BLAKE2b chains: Core\'s chain-parameter entries with their torrents, Knots\' mainnet entry, and ours. A snapshot is named by its txoutset hash; a file is proven by its sha256 and its infohash; a torrent or a host is only where a copy was. Attestations of who loaded what are to come.',
  creator: { '@id': 'me.html#me' }, trail: { '@id': 'trail.html#this' }, data: { '@id': 'data/snapshots.json' }, entries };
page('assumeutxo.html', 'assumeUTXO snapshots', island, '');
console.log(`${made} snapshot pages, ${evPages.size} announcement pages written, ${entries.length} entries on assumeutxo.html`);
