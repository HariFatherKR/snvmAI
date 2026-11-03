import { models as tokenHubModels, runTokenHubGeneration, safeURL } from './providers/tokenhub.mjs';

export const providers = {
  tokenhub: { label: 'TokenHub API · 제품1팀', status: '연결 코드 준비됨', models: tokenHubModels },
  wand: { label: 'WAND 전용 API · 제품5팀', status: '전용 API 규격 확인 대기', models: {} }
};

export async function runGeneration({ provider = 'tokenhub', ...options }) {
  if (!Object.hasOwn(providers, provider)) throw new Error('지원하지 않는 공급자입니다. tokenhub 또는 wand를 선택하세요.');
  if (provider === 'wand') throw new Error('WAND 전용 API 주소와 호출 문서 확인 후 연결합니다. 현재 연동 준비 중이며 API를 호출하지 않습니다.');
  return runTokenHubGeneration(options);
}

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function renderReport(report) {
  const providerLabel = providers[report.provider ?? 'tokenhub']?.label ?? '알 수 없는 공급자';
  const media = report.outputs.filter(safeURL).map(url => {
    const escaped = escape(url);
    return `<figure>${report.kind === 'video' ? `<video controls preload="none" src="${escaped}"></video>` : `<img alt="생성 결과" referrerpolicy="no-referrer" src="${escaped}">`}<figcaption><a href="${escaped}" target="_blank" rel="noopener noreferrer">결과 원본 열기 · 저장</a></figcaption></figure>`;
  }).join('');
  return `<!doctype html>
<html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https:; media-src https:; base-uri 'none'; form-action 'none'">
<title>SNVM · 생성 테스트 결과</title>
<style>body{font:16px/1.6 system-ui,sans-serif;margin:32px auto;padding:0 24px;max-width:960px;color:#151515;background:#f7f6f2}h1{font-size:32px;line-height:1.2}mark{background:#e5ff00;padding:4px 10px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:white;border:2px solid;padding:20px;font-size:14px}figure{margin:24px 0}img,video{display:block;max-width:100%;max-height:65vh;border:2px solid}a{color:inherit;text-underline-offset:4px}p{overflow-wrap:anywhere}</style>
<main><p>SNVM AI · LOCAL MEDIA LAB</p><p>공급자: ${escape(providerLabel)}</p><h1>${escape(report.model)}</h1>
<p><mark>${escape(report.status)}</mark> · 경과 ${(report.elapsedMs / 1000).toFixed(1)}초</p>
<p>${report.status === 'dry-run' ? '요청 미리보기입니다. API 호출과 과금은 발생하지 않았습니다.' : '실제 API 요청 기록입니다. 청구 금액은 TokenHub 콘솔에서 확인하세요.'}</p>
${media || '<p>표시할 생성 결과가 없습니다.</p>'}
<p>결과 URL은 임시 주소입니다. 영상은 12시간 이내에 저장하세요. 이 보고서에는 프롬프트와 결과 접근 주소가 포함됩니다.</p>
<details open><summary>요청 · 상태 · 사용량</summary><pre>${escape(JSON.stringify(report, null, 2))}</pre></details></main></html>`;
}
