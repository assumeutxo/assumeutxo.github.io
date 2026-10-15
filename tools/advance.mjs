#!/usr/bin/env node
// Advance this wiki's git-mark trail to a commit (HEAD by default): spend the head output, whose key is the base key
// tweaked by every state so far, to the address the next state derives, through the local Knots node's wallet, then
// record the new mark with git-mark. The head's spending key goes from git-mark into the node's wallet as a rawtr()
// descriptor and nowhere else; nothing is printed but addresses, txids and amounts.
//   node tools/advance.mjs [--commit <hash>] [--fee-rate <sat/vB>] [--dry]
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOME = homedir();
const GITMARK = process.env.GITMARK ?? `${HOME}/remote/github.com/blocktrails/git-mark`;
const { Gitmark } = await import(`${GITMARK}/index.js`);
const { makeRpc } = await import(`${HOME}/faucet/lib/rpc.mjs`);
const { wif } = await import(`${HOME}/faucet/lib/keys.mjs`);
const CFG = { conf: '~/knots-testnet4/bitcoin.conf', network: 'btc:testnet4-blake2b', wallet: 'datawiki-trail', hrp: 'tb' };
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const DRY = process.argv.includes('--dry'); const FEE = Number(arg('--fee-rate', '1'));
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8' }).trim();
const commit = arg('--commit', git('rev-parse', 'HEAD'));
const state = JSON.parse(readFileSync(`${ROOT}/.gitmark.json`, 'utf8'));
if (state.commits.includes(commit)) throw new Error(`commit ${commit} is already on the trail`);
const priv = git('config', '--get', 'nostr.privkey'); if (!/^[0-9a-f]{64}$/.test(priv)) throw new Error('no agent key');
const gm = new Gitmark(priv, state.network); gm.import(state);
const head = gm.txos.at(-1); if (!head) throw new Error('no genesis: nothing to advance from');
const headKey = gm.spendingKey();                                     // the private key of the head output
const probe = new Gitmark(priv, state.network); probe.import(state); const next = probe.advance(commit, '00'.repeat(32), 0, 0).address; // the next address, nothing saved
console.log(`trail ${state.network}: ${gm.txos.length} mark(s); head ${head.txid.slice(0, 12)}…:${head.vout} (${head.amount} sats)\nnext state ${commit}\nnext address ${next}`);
if (DRY) process.exit(0);

const rpc = await makeRpc(CFG.conf, CFG.network, CFG.wallet); const w = rpc.wallet();
if (!(await rpc('listwallets')).includes(CFG.wallet)) { try { await rpc('createwallet', CFG.wallet, false, true, '', false, true, true); } catch (e) { if (e.code !== -4) throw e; await rpc('loadwallet', CFG.wallet, true); } }
// the head key into the wallet, scanning from the block the head was funded in
const headTx = await rpc('getrawtransaction', head.txid, 1);
const since = headTx.blockhash ? (await rpc('getblockheader', headTx.blockhash)).time - 1 : 'now';
const desc = `rawtr(${wif(headKey, CFG.hrp !== 'bc')})`; const info = await rpc('getdescriptorinfo', desc);
const imp = await w('importdescriptors', [{ desc: `${desc}#${info.checksum}`, timestamp: since, label: `trail head ${gm.txos.length - 1}`, active: false }]);
if (!imp[0].success) throw new Error(`import: ${imp[0].error?.message}`);
const coin = await rpc('gettxout', head.txid, head.vout, true); if (!coin) throw new Error('the head output is already spent');
// one input, one output, the fee taken from the output: the whole head moves to the next state
const r = await w('send', [{ [next]: head.amount / 1e8 }], null, 'unset', FEE, { add_inputs: false, inputs: [{ txid: head.txid, vout: head.vout }], subtract_fee_from_outputs: [0] });
if (!r.complete) throw new Error('send did not complete');
const tx = await w('gettransaction', r.txid, true, true); const out = tx.decoded.vout.find((o) => o.scriptPubKey.address === next);
const sats = Math.round(out.value * 1e8);
console.log(`spent to ${next}\ntxid ${r.txid} vout ${out.n} amount ${sats} sats (fee ${head.amount - sats})`);
// record it with git-mark's own CLI so its files stay in its formats
console.log(execFileSync('node', [`${GITMARK}/bin/git-mark.js`, 'advance', '--txid', r.txid, '--vout', String(out.n), '--amount', String(sats), '--commit', commit], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').slice(-4).join('\n'));
console.log(execFileSync('node', [`${GITMARK}/bin/git-mark.js`, 'verify'], { cwd: ROOT, encoding: 'utf8' }).trim());
