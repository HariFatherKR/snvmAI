import { setTimeout as delay } from 'node:timers/promises';

const origin = 'https://tokenhub-intl.tencentcloudmaas.com';
export const models = {
  image: { model: 'wand-vega-image-lite', submit: '/v1/wand/vega-images/generations', query: '/v1/wand/vega-images/tasks/', success: 'completed', pending: ['queued', 'in_progress'], failed: ['failed', 'cancelled', 'incomplete'] },
  video: { model: 'wand-vega-video-1.0-lite', submit: '/v1/wand/vega-videos/tasks', query: '/v1/wand/vega-videos/tasks/', success: 'succeeded', pending: ['queued', 'running'], failed: ['failed'] }
};

export function safeURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch { return false; }
}

function errorText(body) {
  const error = body?.error;
  return typeof error === 'string' ? error : [error?.code, error?.message].filter(Boolean).join(': ');
}

export async function runTokenHubGeneration({ kind, prompt, taskId, execute = false, key = '', fetchImpl = fetch,
  pollIntervalMs = 5000, maxWaitMs = 600_000, requestTimeoutMs = 30_000, onUpdate = async () => {} }) {
  if (!Object.hasOwn(models, kind)) throw new Error('image 또는 video를 선택하세요.');
  if (taskId !== undefined && !/^[a-zA-Z0-9_-]{1,256}$/.test(taskId)) throw new Error('올바른 작업 ID가 필요합니다.');
  if (!taskId && (typeof prompt !== 'string' || !prompt.trim() || [...prompt].length > 2000)) throw new Error('프롬프트는 1~2,000자로 입력하세요.');
  if (execute && (!/^[\x21-\x7e]+$/.test(key) || /^(YOUR_|replace|example)/i.test(key))) throw new Error('.env.local에 실제 TOKENHUB_API_KEY를 설정하세요.');
  const spec = models[kind];
  const body = taskId ? undefined : kind === 'image'
    ? { model: spec.model, prompt: prompt.trim(), size: '1024x1024' }
    : { model: spec.model, content: [{ type: 'text', text: prompt.trim() }], resolution: '768P', ratio: '16:9', duration: 5 };
  const started = Date.now();
  const report = {
    provider: 'tokenhub', kind, model: spec.model, startedAt: new Date(started).toISOString(),
    status: execute ? 'starting' : 'dry-run', taskId: taskId || null,
    request: { method: taskId ? 'GET' : 'POST', url: origin + (taskId ? spec.query + taskId : spec.submit), ...(body && { body }) },
    outputs: [], usage: null, cost: null, elapsedMs: 0, submitMs: null
  };
  const snapshot = () => JSON.parse(JSON.stringify(report, (_, value) => key && typeof value === 'string' ? value.replaceAll(key, '[REDACTED]') : value));
  const checkpoint = async () => { report.elapsedMs = Date.now() - started; await onUpdate(snapshot()); };
  await checkpoint();
  if (!execute) return snapshot();

  async function request(method, url, payload, timeout = requestTimeoutMs) {
    const response = await fetchImpl(url, {
      method, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      ...(payload && { body: JSON.stringify(payload) }),
      redirect: 'error', signal: AbortSignal.timeout(Math.max(1, Math.ceil(timeout)))
    });
    let result;
    try { result = await response.json(); }
    catch { throw new Error(`HTTP ${response.status}: JSON 응답이 아닙니다.`); }
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${errorText(result) || 'API 요청 실패'}`);
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('API 응답 형식이 올바르지 않습니다.');
    return result;
  }

  try {
    if (!taskId) {
      report.status = 'submitting';
      await checkpoint();
      const submitted = Date.now();
      // No POST retries: the provider may create another billable task.
      const result = await request('POST', report.request.url, body);
      report.submitMs = Date.now() - submitted;
      report.taskId = kind === 'image' ? result.task_id : result.id;
      if (typeof report.taskId !== 'string' || !/^[a-zA-Z0-9_-]{1,256}$/.test(report.taskId)) {
        report.taskId = null;
        throw new Error('생성 응답에 유효한 작업 ID가 없습니다.');
      }
      if (result.request_id) report.requestId = result.request_id;
      report.status = 'polling';
      await checkpoint();
    }
    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
      const result = await request('GET', origin + spec.query + report.taskId, undefined, Math.min(requestTimeoutMs, deadline - Date.now()));
      report.providerStatus = result.status;
      if (result.request_id) report.requestId = result.request_id;
      if (result.usage) report.usage = result.usage;
      if (result.status === spec.success) {
        const urls = kind === 'image' ? result.data?.map(item => item?.url) : [result.content?.video_url];
        if (!Array.isArray(urls) || !urls.length || !urls.every(safeURL)) throw new Error('완료 응답에 유효한 HTTPS 결과 주소가 없습니다.');
        report.outputs = urls;
        report.status = 'succeeded';
        break;
      }
      if (spec.failed.includes(result.status)) {
        report.status = 'failed';
        report.error = errorText(result) || `작업 종료: ${result.status}`;
        break;
      }
      if (!spec.pending.includes(result.status)) throw new Error(`알 수 없는 작업 상태: ${String(result.status)}`);
      report.status = 'polling';
      await checkpoint();
      const remaining = deadline - Date.now();
      if (remaining > 0) await delay(Math.min(pollIntervalMs, remaining));
    }
    if (!['succeeded', 'failed'].includes(report.status)) {
      report.status = 'timed-out';
      report.error = '조회 대기 시간이 끝났습니다. 작업은 계속 실행될 수 있습니다. 저장된 ID로 resume 하세요.';
    }
  } catch (error) {
    report.status = 'error';
    report.error = error.message;
    report.nextStep = report.taskId
      ? '새로 생성하지 말고 저장된 작업 ID로 resume 하세요.'
      : '제출 여부를 확정할 수 없습니다. 재실행 전 콘솔 작업 내역을 확인하세요.';
  }
  report.finishedAt = new Date().toISOString();
  await checkpoint();
  return snapshot();
}

