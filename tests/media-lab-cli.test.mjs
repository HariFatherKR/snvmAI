import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const cli = fileURLToPath(new URL('../tools/media-lab.mjs', import.meta.url));
function sandbox(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'snvm-lab-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const env = { ...process.env };
  delete env.TOKENHUB_API_KEY;
  delete env.NODE_OPTIONS;
  return { cwd, run: (args, nodeArgs = []) => spawnSync(process.execPath, [...nodeArgs, cli, ...args], { cwd, env, encoding: 'utf8', timeout: 3000 }) };
}

test('CLI dry run writes a readable JSON and HTML report without a key', t => {
  const { cwd, run } = sandbox(t);
  const result = run(['video', '--prompt', '제품 영상']);
  assert.equal(result.status, 0, result.stderr);
  const root = join(cwd, 'artifacts/media-lab');
  const folder = join(root, readdirSync(root)[0]);
  const report = JSON.parse(readFileSync(join(folder, 'report.json'), 'utf8'));
  assert.equal(report.status, 'dry-run');
  assert.equal(report.request.body.content[0].text, '제품 영상');
  assert.ok(readFileSync(join(folder, 'index.html'), 'utf8').includes('dry-run'));
});

test('CLI rejects missing credentials and invalid flags without creating run artifacts', t => {
  const { cwd, run } = sandbox(t);
  for (const args of [['image', '--execute'], ['image', '--execut'], ['image', '--task', 'x'], ['resume', 'video'], ['image', '--prompt', '']]) {
    const result = run(args);
    assert.equal(result.status, 1, result.stdout);
    assert.ok(result.stderr);
  }
  assert.ok(!existsSync(join(cwd, 'artifacts')));
});

test('CLI resume dry run queries the existing task without a generation body', t => {
  const { cwd, run } = sandbox(t);
  const result = run(['resume', 'image', '--task', 'known-image']);
  assert.equal(result.status, 0, result.stderr);
  const root = join(cwd, 'artifacts/media-lab');
  const report = JSON.parse(readFileSync(join(root, readdirSync(root)[0], 'report.json'), 'utf8'));
  assert.equal(report.request.method, 'GET');
  assert.ok(report.request.url.endsWith('/tasks/known-image'));
  assert.equal(report.request.body, undefined);
});

test('accepted task ID stays visible when report storage fails after submission', t => {
  const { cwd, run } = sandbox(t);
  writeFileSync(join(cwd, '.env.local'), 'TOKENHUB_API_KEY=test-key\n');
  const preload = join(cwd, 'storage-failure.mjs');
  writeFileSync(preload, `
    import { readdirSync, rmSync, writeFileSync } from 'node:fs';
    globalThis.fetch = async () => {
      console.log('MOCK_API_CALL');
      const folder = 'artifacts/media-lab/' + readdirSync('artifacts/media-lab')[0];
      rmSync(folder, { recursive: true });
      writeFileSync(folder, 'simulate unavailable storage');
      return new Response(JSON.stringify({ task_id: 'accepted-paid-task' }));
    };
  `);
  const result = run(['image', '--execute'], ['--import', preload]);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /accepted-paid-task/);
  assert.match(result.stdout, /resume image --task accepted-paid-task/);
  assert.equal(result.stdout.split('MOCK_API_CALL').length - 1, 1);
});
