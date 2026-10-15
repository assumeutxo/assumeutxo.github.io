# datawiki

An experiment: a wiki whose pages are data. Every page is a JSON-LD document; the HTML is rendered
from it, never written by hand. The repo is the wiki, git is its history, and a Blocktrails git-mark
on this repo is its spine: each anchored commit is one state on a trail on Bitcoin BLAKE2b testnet4.

Page zero is this repo's own identity, `agent.did.json` (did:nostr), written by `npm init agent`.
