import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(dir + '/' + entry.name) : [dir + '/' + entry.name]);
let files;
try {
  files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\0').filter(Boolean);
} catch {
  // Vercel may build a source archive without .git metadata.
  files = ['src', 'scripts', 'contracts', 'public'].filter(existsSync).flatMap(walk);
}
const problems = [];
for (const file of files) {
  if ((/^\.env(?:\.|$)/.test(file) && file !== '.env.example') || /circle-recovery/.test(file)) problems.push('Private settings tracked: ' + file);
  if (!/\.(?:[cm]?js|tsx?|md|txt)$/.test(file) || !existsSync(file)) continue;
  const text = readFileSync(file, 'utf8');
  if (/(?:TEST|LIVE)_API_KEY:[a-zA-Z0-9]{16,}:[a-zA-Z0-9]{16,}/.test(text)) problems.push('Hardcoded Circle key: ' + file);
  if (file.startsWith('src/') && /(?:VITE_CIRCLE_(?:API_KEY|ENTITY_SECRET)|https:\/\/api(?:-sandbox)?\.circle\.com)/.test(text)) problems.push('Privileged Circle API in browser: ' + file);
}
if (process.argv.includes('--bundle')) {
  const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(dir + '/' + entry.name) : [dir + '/' + entry.name]);
  const secrets = ['CIRCLE_API_KEY', 'CIRCLE_ENTITY_SECRET', 'VITE_CIRCLE_API_KEY', 'VITE_CIRCLE_ENTITY_SECRET'].map(key => process.env[key]).filter(Boolean);
  for (const name of ['.env', '.env.local']) {
    if (!existsSync(name)) continue;
    for (const line of readFileSync(name, 'utf8').split('\n')) {
      const match = line.match(/^(?:VITE_)?CIRCLE_(?:API_KEY|ENTITY_SECRET)=(.+)$/);
      if (match) secrets.push(match[1].trim().replace(/^['"]|['"]$/g, ''));
    }
  }
  for (const file of walk('dist')) {
    if (!/\.(?:js|map|html|json)$/.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    if (secrets.some(secret => secret.length > 12 && text.includes(secret)) || /(?:TEST|LIVE)_API_KEY:[a-zA-Z0-9]{16,}:[a-zA-Z0-9]{16,}/.test(text)) problems.push('Credential found in build: ' + file);
  }
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log('Credential checks passed.');
