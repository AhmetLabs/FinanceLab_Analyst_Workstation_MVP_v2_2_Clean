import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const forbiddenName = ['KIMI', 'API', 'KEY'].join('_');

function filesBelow(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

test('client source contains no server secret identifier or server imports', () => {
  const clientFiles = [join(projectRoot, 'app.js'), join(projectRoot, 'index.html'), ...filesBelow(join(projectRoot, 'src'))];
  clientFiles.forEach((file) => {
    const source = readFileSync(file, 'utf8');
    assert.equal(source.includes(forbiddenName), false, `${file} contains a server-only secret identifier`);
    assert.equal(source.includes('/server/'), false, `${file} imports server code`);
  });
});

test('environment files are ignored and never copied into the client build', () => {
  const ignore = readFileSync(join(projectRoot, '.gitignore'), 'utf8');
  assert.match(ignore, /^\.env$/m);
  const builtFiles = filesBelow(join(projectRoot, 'dist', 'client'));
  assert.equal(builtFiles.some((file) => /(^|[\\/])\.env(?:\.|$)/.test(file)), false);
  builtFiles.filter((file) => statSync(file).size < 2_000_000 && !file.endsWith('.png')).forEach((file) => {
    assert.equal(readFileSync(file, 'utf8').includes(forbiddenName), false, `${file} exposes the server secret identifier`);
  });
});
