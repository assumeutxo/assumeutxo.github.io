#!/bin/sh
# Publish the wiki to its public home: a plain static copy, no build. The repo stays the source of truth.
# (.gitmark.json is a dotfile the host refuses to serve; .well-known/txo/txo.json, git-mark's discovery file, is served.)
cd "$(dirname "$0")/.." && rsync -a --exclude .git --exclude node_modules --exclude tools ./ ubuntu@melvin.me:www/melvin.me/public/datawiki/ && echo "published: https://melvin.me/public/datawiki/"
