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
- `trail.html#this`: this wiki's trail, the mark given by value (bytes and block in the island).

## Panes

Views by type, as solid-panes does it. A pane is `{ name, label(doc), render(doc, el) }` in `panes/<type>.js`,
loaded by `wiki.js` for every `@type` on the page; `label` returns null when the pane does not apply. The
outline and the raw JSON are always the last two tabs, so a page with no pane still has its floor.
A pane may verify, not only display: the Blocktrail pane checks every mark given by value in the page, with
the kernel's codec and the trail key code pinned by commit, and shows what it checked (green or red) apart
from what is only claimed (grey).

- `panes/index.js`: the entries as cards.
- `panes/blocktrail.js`: the trail verified in the page.

## Rules

- A page's `@id` is a fragment, `#this` for a thing and `#me` for an agent, so the document and the
  thing it describes have different names and relative links survive a move or a mirror.
- Name and value side by side: a property may be a link (`{"@id": …}`) or the object itself.
- The README says nothing the index does not also say as data.
- Hosts are facts about where a copy was found, never part of an identity. Identity is a hash or a key.

## Try it

Serve the folder with any static server and open `index.html`; or open the files directly.
