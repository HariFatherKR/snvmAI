import { setTimeout as delay } from 'node:timers/promises';

const origin = 'https://tokenhub-intl.tencentcloudmaas.com';
export const models = {
  image: { model: 'wand-vega-image-lite', submit: '/v1/wand/vega-images/generations', query: '/v1/wand/vega-images/tasks/', success: 'completed', pending: ['queued', 'in_progress'], failed: ['failed', 'cancelled', 'incomplete'] },
  video: { model: 'wand-vega-video-1.0-lite', submit: '/v1/wand/vega-videos/tasks', query: '/v1/wand/vega-videos/tasks/', success: 'succeeded', pending: ['queued', 'running'], failed: ['failed'] }
};

function safeURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch { return false; }
}

function errorText(body) {
  const error = body?.error;
  return typeof error === 'string' ? error : [error?.code, error?.message].filter(Boolean).join(': ');
}

export async function runGeneration({ kind, prompt, taskId, execute = false, key = '', fetchImpl = fetch,
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
    kind, model: spec.model, startedAt: new Date(started).toISOString(),
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

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function renderReport(report) {
  const media = report.outputs.filter(safeURL).map(url => {
    const escaped = escape(url);
    return `<figure>${report.kind === 'video' ? `<video controls preload="none" src="${escaped}"></video>` : `<img alt="생성 결과" referrerpolicy="no-referrer" src="${escaped}">`}<figcaption><a href="${escaped}" target="_blank" rel="noopener noreferrer">결과 원본 열기 · 저장</a></figcaption></figure>`;
  }).join('');
  return `<!doctype html>
<html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https:; media-src https:; base-uri 'none'; form-action 'none'">
<title>SNVM · 생성 테스트 결과</title>
<style>body{font:16px/1.6 system-ui,sans-serif;margin:32px auto;padding:0 24px;max-width:960px;color:#151515;background:#f7f6f2}h1{font-size:32px;line-height:1.2}mark{background:#e5ff00;padding:4px 10px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:white;border:2px solid;padding:20px;font-size:14px}figure{margin:24px 0}img,video{display:block;max-width:100%;max-height:65vh;border:2px solid}a{color:inherit;text-underline-offset:4px}p{overflow-wrap:anywhere}</style>
<main><p>SNVM AI · LOCAL MEDIA LAB</p><h1>${escape(report.model)}</h1>
<p><mark>${escape(report.status)}</mark> · 경과 ${(report.elapsedMs / 1000).toFixed(1)}초</p>
<p>${report.status === 'dry-run' ? '요청 미리보기입니다. API 호출과 과금은 발생하지 않았습니다.' : '실제 API 요청 기록입니다. 청구 금액은 TokenHub 콘솔에서 확인하세요.'}</p>
${media || '<p>표시할 생성 결과가 없습니다.</p>'}
<p>결과 URL은 임시 주소입니다. 영상은 12시간 이내에 저장하세요. 이 보고서에는 프롬프트와 결과 접근 주소가 포함됩니다.</p>
<details open><summary>요청 · 상태 · 사용량</summary><pre>${escape(JSON.stringify(report, null, 2))}</pre></details></main></html>`;
}
