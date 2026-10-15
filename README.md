# datawiki

An experiment: a wiki whose pages are data. Every page is an HTML file whose truth is its JSON-LD
island (`<script type="application/ld+json">`); `wiki.js` renders the island as an outline, with
links, and the raw JSON underneath. No build, no server logic: a link loads the next page, which
carries its own island. The repo is the wiki, git is its history, and a Blocktrails git-mark on
this repo is its spine: each anchored commit is one state on a trail on Bitcoin BLAKE2b testnet4.

## Pages

- `index.html#this`: the front door, an Index of every entry.
- `me.html#me`: the identity behind the wiki, a Nostr key (`agent.did.json`, written by `npm init agent`).
- `snapshots/txbt4-150307.html#this`: the txbt4 assumeUTXO snapshot, with its torrent and announcement.
- `faucet.html#this`: the txbt4 faucet.
- `trail.html#this`: this wiki's trail, every mark given by value (bytes and block in the island).
- `torrents/`, `events/`, `epochs/`, `attestations/`, `fraudproofs/`, `marks/`: one page per thing, by value where the thing has bytes. The attestation is real, signed by this wiki's key; the fraud proof and the marking objects are examples and say so.

## Panes

Views by type, on [LOSOS](https://losos.org/)'s contract: a pane is `{ label, icon?, canHandle(subject, store), render(subject, store, container, rawData) }`.
The subject is a named node for the island's `@id`, the store answers `store.get(iri)` with the island, `rawData` is the island as parsed.
A pane is found in LOSOS's order, with two amendments:

1. local panes: `panes/<type>.js` for every `@type` on the page (the directory is the registry), plus any `<script data-pane src>` ES module;
2. `ui:view` on the node: the page may name a pane for itself, shown after the local ones and never first, so a pane that verifies the page is never displaced by one the page chose;
3. the public registry, [solid-panes.github.io](https://solid-panes.github.io/): `@type` → manifest → pane URL, consulted only when 1 and 2 gave nothing; the manifest's schema is set on the node first, as solid-panes' `autoSchema` does, so a schema-driven pane can take it (a `Note` with no local pane gets LOSOS's editor this way);
4. the floor: the outline and the raw JSON, always the last two tabs, so a page with no pane still renders and the data is never hidden.

A pane may verify, not only display: the Blocktrail pane checks every mark given by value in the page, with the kernel's codec and the
trail key code pinned by commit, and shows what it checked (green or red) apart from what is only claimed (grey).

- `panes/index.js`: the entries as cards.
- `panes/agent.js`: a profile card: npub and DID with copy, the address (balance from a local explorer when one answers), what it maintains.
- `panes/snapshot.js`: a download card: the txoutset hash as the identity, block, sha256 and infohash, magnet, .torrent and webseed buttons.
- `panes/faucet.js`: a service card: address, limits, the voucher format, where to redeem, what it paid this wiki.
- `panes/blocktrail.js`: the trail verified in the page.
- `panes/transactionoutput.js`, `panes/transaction.js`: a coin and a whole transaction from their bytes, txid recomputed; `coin.html?txo=…` and `tx.html?hex=…` build their island from the query, the value riding in the name.
- `panes/torrent.js`, `panes/nostrevent.js` (id and signature checked), `panes/epoch.js`, `panes/attestation.js` (the signed event checked: author, signature, that it says what the page says), `panes/fraudproof.js`.
- `panes/mark.js`, `bounty.js`, `submission.js`, `verdict.js`: the marking vocabulary, signatures checked when present.
- `panes/person.js`: a human's profile.

The shim exports a toolkit for panes that verify (`wiki.kit()`: the kernel's codec, hashes and curve, pinned by commit), Nostr and marking signature checks, bech32 for addresses and npubs, and the shared pieces (`facts`, `card`, `light`, `copyBtn`).

## Rules

- A page's `@id` is a fragment, `#this` for a thing and `#me` for an agent, so the document and the
  thing it describes have different names and relative links survive a move or a mirror.
- Name and value side by side: a property may be a link (`{"@id": …}`) or the object itself.
- The README says nothing the index does not also say as data.
- Hosts are facts about where a copy was found, never part of an identity. Identity is a hash or a key.

## Try it

Serve the folder with any static server and open `index.html`; or open the files directly.
