#!/usr/bin/env node
// Open Graph and Twitter card metadata for every page, from its island: title from name, description from description,
// the canonical URL from the path, one site image. Idempotent: the block between the markers is rewritten each run.
//   node tools/ogp.mjs            (all pages)      import { withOgp } from './ogp.mjs'   (for generators)
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'); export const SITE = 'https://assumeutxo.com/';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
export function withOgp(html, path) {
  const m = html.match(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/); let d = {}; try { d = m ? JSON.parse(m[1]) : {}; } catch {}
  const title = d.name || (html.match(/<title>([^<]*)/) || [])[1] || 'assumeUTXO'; const desc = (d.description || 'Every assumeUTXO snapshot we know of, and who verified it.').replace(/\s+/g, ' ').slice(0, 300);
  const url = SITE + (path === 'index.html' ? '' : path); const types = [].concat(d['@type'] || []); const kind = types[0] && path !== 'index.html' ? types[0] + ' · ' : '';
  const block = `<!-- ogp -->\n<meta name="description" content="${esc(desc)}">\n<link rel="canonical" href="${url}">\n<meta property="og:site_name" content="assumeUTXO">\n<meta property="og:type" content="${path === 'index.html' ? 'website' : 'article'}">\n<meta property="og:title" content="${esc(kind + title)}">\n<meta property="og:description" content="${esc(desc)}">\n<meta property="og:url" content="${url}">\n<meta property="og:image" content="${SITE}og.png">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="${esc(kind + title)}">\n<meta name="twitter:description" content="${esc(desc)}">\n<meta name="twitter:image" content="${SITE}og.png">\n<link rel="icon" href="${SITE}favicon.svg" type="image/svg+xml">\n<!-- /ogp -->`;
  if (/<!-- ogp -->[\s\S]*?<!-- \/ogp -->/.test(html)) return html.replace(/<!-- ogp -->[\s\S]*?<!-- \/ogp -->/, block);
  return html.replace(/(<title>[^<]*<\/title>)/, `$1\n${block}`);
}
const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); if (f === 'node_modules' || f.startsWith('.')) return []; return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []; });
if (process.argv[1] === fileURLToPath(import.meta.url)) { let n = 0; for (const f of walk(ROOT)) { const rel = relative(ROOT, f); const before = readFileSync(f, 'utf8'); const after = withOgp(before, rel); if (after !== before) { writeFileSync(f, after); n++; } } console.log(`ogp: ${n} page(s) updated`); }
