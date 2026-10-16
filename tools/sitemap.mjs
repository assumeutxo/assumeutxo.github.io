#!/usr/bin/env node
// sitemap.xml from every page on the site, with each file's last commit date; robots.txt points at it.
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'); const SITE = 'https://assumeutxo.com/';
const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); if (f === 'node_modules' || f.startsWith('.') || f === 'tools') return []; return statSync(p).isDirectory() ? walk(p) : f.endsWith('.html') ? [p] : []; });
const pages = walk(ROOT).map((p) => relative(ROOT, p)).filter((p) => !/^(coin|tx|key)\.html$/.test(p)).sort(); // the viewers take a query and have no page of their own
const date = (p) => { try { return execFileSync('git', ['-C', ROOT, 'log', '-1', '--format=%cs', '--', p], { encoding: 'utf8' }).trim() || new Date().toISOString().slice(0, 10); } catch { return new Date().toISOString().slice(0, 10); } };
const pri = (p) => p === 'index.html' ? '1.0' : p.startsWith('snapshots/') ? '0.8' : p.startsWith('attestations/') ? '0.7' : /^(attest|links|networks|pages|me|trail)\.html$/.test(p) ? '0.6' : '0.4';
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` + pages.map((p) => `  <url><loc>${SITE}${p === 'index.html' ? '' : p}</loc><lastmod>${date(p)}</lastmod><priority>${pri(p)}</priority></url>`).join('\n') + '\n</urlset>\n';
writeFileSync(`${ROOT}/sitemap.xml`, xml); writeFileSync(`${ROOT}/robots.txt`, `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);
console.log(`sitemap: ${pages.length} pages`);
