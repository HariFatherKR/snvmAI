import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { runGeneration, renderReport } from '../lib/media-lab.mjs';

const key = 'test-secret-never-log';
const imageURL = 'https://media.example.com/image.png?signature=test';
const videoURL = 'https://media.example.com/video.mp4';
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('dry run builds the image request without credentials or any network call', async () => {
  const report = await runGeneration({ kind: 'image', prompt: '제품 사진', fetchImpl: () => assert.fail('network called') });
  assert.equal(report.status, 'dry-run');
  assert.equal(report.request.url, 'https://tokenhub-intl.tencentcloudmaas.com/v1/wand/vega-images/generations');
  assert.deepEqual(report.request.body, { model: 'wand-vega-image-lite', prompt: '제품 사진', size: '1024x1024' });
  assert.equal(report.cost, null);
});

test('image submit saves task ID before polling and reads completed image URLs and usage', async () => {
  const calls = [];
  let checkpoint;
  const report = await runGeneration({ kind: 'image', prompt: '제품 사진', execute: true, key, pollIntervalMs: 1,
    onUpdate: async r => { checkpoint = structuredClone(r); },
    fetchImpl: async (url, init) => {
      calls.push(init.method);
      assert.equal(init.headers.Authorization, `Bearer ${key}`);
      assert.equal(init.redirect, 'error');
      if (init.method === 'POST') return reply({ task_id: 'image-123', request_id: 'req-1' });
      assert.equal(checkpoint.taskId, 'image-123');
      assert.equal(url, 'https://tokenhub-intl.tencentcloudmaas.com/v1/wand/vega-images/tasks/image-123');
      return calls.length === 2 ? reply({ status: 'in_progress' })
        : reply({ status: 'completed', data: [{ url: imageURL }], usage: { total_tokens: 16200 } });
    }
  });
  assert.deepEqual(calls, ['POST', 'GET', 'GET']);
  assert.equal(report.status, 'succeeded');
  assert.deepEqual(report.outputs, [imageURL]);
  assert.deepEqual(report.usage, { total_tokens: 16200 });
  assert.ok(report.elapsedMs >= 0);
  assert.ok(report.submitMs >= 0);
  assert.ok(!JSON.stringify(report).includes(key));
});

test('video uses its own request, task ID and succeeded response schema', async () => {
  const report = await runGeneration({ kind: 'video', prompt: '천천히 회전하는 제품', execute: true, key, pollIntervalMs: 1,
    fetchImpl: async (url, init) => {
      if (init.method === 'POST') {
        assert.equal(url, 'https://tokenhub-intl.tencentcloudmaas.com/v1/wand/vega-videos/tasks');
        assert.deepEqual(JSON.parse(init.body), { model: 'wand-vega-video-1.0-lite', content: [{ type: 'text', text: '천천히 회전하는 제품' }], resolution: '768P', ratio: '16:9', duration: 5 });
        return reply({ id: 'video-123', status: 'queued' }, 201);
      }
      return reply({ id: 'video-123', status: 'succeeded', content: { video_url: videoURL } });
    }
  });
  assert.equal(report.taskId, 'video-123');
  assert.deepEqual(report.outputs, [videoURL]);
});

test('failed submission is never retried and reflected credentials are redacted', async () => {
  let count = 0;
  const report = await runGeneration({ kind: 'video', prompt: 'test', execute: true, key,
    fetchImpl: async () => { count++; return reply({ error: { code: 'unauthorized', message: `invalid ${key}` } }, 401); }
  });
  assert.equal(count, 1);
  assert.equal(report.status, 'error');
  assert.match(report.error, /401.*unauthorized/);
  assert.ok(!JSON.stringify(report).includes(key));
  assert.equal(report.taskId, null);
});

test('terminal provider failure preserves task ID and stops polling', async () => {
  let calls = 0;
  const report = await runGeneration({ kind: 'image', taskId: 'image-existing', execute: true, key,
    fetchImpl: async (_, init) => {
      calls++;
      assert.equal(init.method, 'GET');
      return reply({ status: 'incomplete', error: { code: 'Limit', message: 'Quota exhausted' } });
    }
  });
  assert.equal(calls, 1);
  assert.equal(report.status, 'failed');
  assert.equal(report.providerStatus, 'incomplete');
  assert.match(report.error, /Quota exhausted/);
});

test('poll deadline preserves task for resume without creating a second task', async () => {
  let calls = 0;
  const report = await runGeneration({ kind: 'video', taskId: 'video-existing', execute: true, key, maxWaitMs: 10, pollIntervalMs: 20,
    fetchImpl: async (_, init) => { calls++; assert.equal(init.method, 'GET'); return reply({ status: 'running' }); }
  });
  assert.equal(calls, 1);
  assert.equal(report.status, 'timed-out');
  assert.equal(report.taskId, 'video-existing');
});

test('invalid inputs and missing key are rejected before submitting', async () => {
  for (const options of [
    { kind: 'text', prompt: 'test' }, { kind: 'image', prompt: ' ' },
    { kind: 'image', prompt: 'x'.repeat(2001) }, { kind: 'video', taskId: '../bad' },
    { kind: 'image', prompt: 'test', execute: true },
    { kind: 'image', prompt: 'test', execute: true, key: 'YOUR_API_KEY' }
  ]) await assert.rejects(runGeneration({ ...options, fetchImpl: () => assert.fail('network called') }));
});

test('malformed provider responses cannot be reported as successful', async () => {
  for (const body of [{ status: 'surprise' }, { status: 'completed', data: [] }, { status: 'completed', data: [{ url: 'javascript:alert(1)' }] }]) {
    const report = await runGeneration({ kind: 'image', taskId: 'image-existing', execute: true, key, fetchImpl: async () => reply(body) });
    assert.equal(report.status, 'error');
    assert.equal(report.taskId, 'image-existing');
  }
});

test('report escapes prompt/error HTML and uses safe media previews', async () => {
  const report = await runGeneration({ kind: 'image', prompt: '<script>alert(1)</script>' });
  const html = renderReport({ ...report, outputs: [imageURL, 'javascript:alert(1)'] });
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('src="javascript:'));
  assert.ok(html.includes('referrerpolicy="no-referrer"'));
  assert.ok(html.includes('dry-run'));
});

test('redaction survives JSON escaping inside the credential', async () => {
  const secret = 'test-"quoted-key';
  const report = await runGeneration({ kind: 'image', prompt: 'test', execute: true, key: secret,
    fetchImpl: async () => reply({ error: { message: secret } }, 401)
  });
  assert.ok(!report.error.includes(secret));
});

test('hung HTTP submission times out without a second billable request', async t => {
  let calls = 0;
  const server = createServer(() => { calls++; });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const report = await runGeneration({ kind: 'image', prompt: 'test', execute: true, key, requestTimeoutMs: 50,
    fetchImpl: (_, init) => fetch(`http://127.0.0.1:${server.address().port}`, init)
  });
  assert.equal(report.status, 'error');
  assert.equal(calls, 1);
  assert.equal(report.taskId, null);
  assert.match(report.nextStep, /콘솔/);
});
