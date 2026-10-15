# assumeUTXO

https://assumeutxo.github.io/ · every assumeUTXO snapshot we know of, as data: identity, torrents, announcements, and who
verified them. Built as a data wiki:

An experiment: a wiki whose pages are data. Every page is an HTML file whose truth is its JSON-LD
island (`<script type="application/ld+json">`); `wiki.js` renders the island as an outline, with
links, and the raw JSON underneath. No build, no server logic: a link loads the next page, which
carries its own island. The repo is the wiki, git is its history, and a Blocktrails git-mark on
this repo is its spine: each anchored commit is one state on a trail on Bitcoin BLAKE2b testnet4.

## Pages

- `index.html#this`: the snapshot table, the front door; generated from `data/snapshots.json` by `tools/snapshots.mjs`.
- `snapshots/<chain>-<height>.html#this`: one page per snapshot; `torrents/`, `events/` beside them.
- `attestations/`: signed statements; `epochs/`: SwiftSync-style epoch packages; `fraudproofs/`: the shape of a dispute.
- `trail.html#this`: this site's git-mark trail; `me.html#me`: its key; `pages.html#this`: every page.
- `coin.html?txo=…`, `tx.html?hex=…`: viewers that build their island from the query.

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

## Attestations, formal and informal

A snapshot (or a tip) can carry `attestations`. A **formal** one is a signed statement carried by value, a Nostr event
whose tags state the height, hash and txoutset hash or muhash, checked in the page: signature, author, and that it states
what the page states. An **informal** one is a claim someone made elsewhere, a PR review, a comment, a post: who (by their
handle there), when, what they did, what they said, and the link. The page never vouches for an informal one beyond the
narrow fact that the number they wrote matches; it shows grey, "said elsewhere, as linked". Three informal is evidence; one
formal is a commitment. An informal record can later be joined by the same person's formal one.

## Rules

- A page's `@id` is a fragment, `#this` for a thing and `#me` for an agent, so the document and the
  thing it describes have different names and relative links survive a move or a mirror.
- Name and value side by side: a property may be a link (`{"@id": …}`) or the object itself.
- The README says nothing the index does not also say as data.
- Hosts are facts about where a copy was found, never part of an identity. Identity is a hash or a key.

## Try it

Serve the folder with any static server and open `index.html`; or open the files directly.
