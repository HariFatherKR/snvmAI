import { calculateSavings } from './pricing.mjs';

const won = new Intl.NumberFormat('ko-KR');
const models = [
  { id: 'claude', name: 'Claude', provider: 'Anthropic', categories: ['text'], label: '텍스트 · 코드', logo: './images/models/claude.svg', description: '문서 작성과 코드 작업에 사용하는 Anthropic의 언어 모델입니다.' },
  { id: 'openai', name: 'ChatGPT', provider: 'OpenAI 모델 API', categories: ['text'], label: '텍스트 · 코드', logo: './images/models/openai.svg', description: '대화, 문서 작성, 코딩에 사용하는 OpenAI 모델 API입니다. ChatGPT Plus 구독과 별도로 이용합니다.' },
  { id: 'gemini', name: 'Gemini', provider: 'Google', categories: ['text'], label: '텍스트 · 멀티모달', logo: './images/models/gemini.svg', description: '텍스트와 여러 형식의 자료를 함께 분석하는 Google의 모델입니다.' },
  { id: 'deepseek', name: 'DeepSeek', provider: 'DeepSeek', categories: ['text'], label: '추론 · 코드', logo: './images/models/deepseek.svg', description: '추론과 코드 작성에 사용하는 DeepSeek의 언어 모델입니다.' },
  { id: 'glm', name: 'GLM', provider: 'Z.ai', categories: ['text'], label: '텍스트 · 코드', logo: './images/models/glm.svg', description: '텍스트 작성과 코드 작업에 사용하는 Z.ai의 언어 모델입니다.' },
  { id: 'seedance', name: 'Seedance', provider: 'ByteDance', categories: ['video'], label: '영상 생성', logo: './images/models/seedance.svg', description: '텍스트나 이미지를 입력해 영상을 만드는 ByteDance의 모델입니다.' },
  { id: 'kling', name: 'Kling', provider: 'Kuaishou', categories: ['video'], label: '영상 생성', logo: './images/models/kling.svg', description: '영상 제작에 사용하는 Kuaishou의 모델입니다.' },
];

const grid = document.querySelector('#model-grid');
const search = document.querySelector('#model-search');
let category = 'all';
// shortcut: 확정 할인율 수령 전에는 모든 모델에 20%를 임시 표시합니다.
function renderModels() {
  const query = search.value.trim().toLocaleLowerCase();
  const filtered = models.filter(model => (category === 'all' || model.categories.includes(category)) && `${model.name} ${model.provider} ${model.label}`.toLocaleLowerCase().includes(query));
  grid.innerHTML = filtered.map(model => `<button class="model-card" data-model="${model.id}" aria-label="${model.name}, 20% 할인, 모델 자세히 보기"><div class="model-card-top"><span class="model-logo logo-${model.id}" aria-hidden="true"><img src="${model.logo}" width="40" height="40" alt="" loading="lazy" decoding="async"></span><span class="discount-badge">20% 할인</span></div><h3>${model.name}</h3><p>${model.provider}</p><div class="model-card-bottom"><span class="category-tag">${model.label}</span><span class="model-card-arrow" aria-hidden="true">↗</span></div></button>`).join('');
  grid.hidden = filtered.length === 0;
  document.querySelector('#model-empty').hidden = filtered.length > 0;
  document.querySelector('#model-count').textContent = `${filtered.length}개의 모델이 표시됩니다.`;
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  category = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(item => {
    const selected = item === button;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  renderModels();
}));
search.addEventListener('input', renderModels);
renderModels();

const spend = document.querySelector('#monthly-spend');
const slider = document.querySelector('#spend-slider');
function updateSavings(amount, formatInput = true) {
  const result = calculateSavings(amount);
  if (formatInput) spend.value = won.format(amount);
  slider.value = Math.min(amount, Number(slider.max));
  slider.style.setProperty('--range-fill', `${Math.min(amount / Number(slider.max), 1) * 100}%`);
  slider.setAttribute('aria-valuetext', `${won.format(Number(slider.value))}원`);
  document.querySelector('#discounted-amount').innerHTML = `${won.format(result.discounted)}<span>원 / 월</span>`;
  document.querySelector('#saved-amount').innerHTML = `${won.format(result.saved)}<span>원</span>`;
  document.querySelector('#annual-amount').textContent = `${won.format(result.annual)}원`;
  document.querySelector('#amount-error').hidden = true;
  spend.removeAttribute('aria-invalid');
  document.querySelectorAll('[data-spend]').forEach(button => button.classList.toggle('selected', Number(button.dataset.spend) === amount));
}
spend.addEventListener('input', () => {
  const raw = spend.value.replaceAll(',', '').trim();
  const amount = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(amount) || amount > 100_000_000) {
    document.querySelector('#amount-error').hidden = false;
    spend.setAttribute('aria-invalid', 'true');
    return;
  }
  updateSavings(amount, false);
});
spend.addEventListener('blur', () => {
  if (!spend.hasAttribute('aria-invalid')) spend.value = won.format(Number(spend.value.replaceAll(',', '')));
});
slider.addEventListener('input', () => updateSavings(Number(slider.value)));
document.querySelectorAll('[data-spend]').forEach(button => button.addEventListener('click', () => updateSavings(Number(button.dataset.spend))));
updateSavings(1_000_000);

const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', '메뉴 열기');
  mobileNav.hidden = true;
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  mobileNav.hidden = !open;
});
mobileNav.addEventListener('click', event => { if (event.target.closest('a,button')) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
const motionButton = document.querySelector('.motion-toggle');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
// 제목은 JS와 Observer가 준비된 경우에만 숨겨서 등장시킵니다.
const kineticObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add('kinetic-visible');
    kineticObserver.unobserve(entry.target);
  }
}, { threshold: 0.15 }) : null;
document.querySelectorAll('[data-kinetic]').forEach(element => kineticObserver?.observe(element));
function syncMotionButton() {
  const paused = document.documentElement.classList.contains('motion-paused');
  document.documentElement.classList.toggle('kinetic-enabled', Boolean(kineticObserver) && !reducedMotion.matches && !paused);
  if (reducedMotion.matches) {
    motionButton.textContent = '모션 줄이기 설정 적용 중';
    motionButton.disabled = true;
    motionButton.setAttribute('aria-label', '기기의 모션 줄이기 설정 적용 중');
  } else {
    motionButton.disabled = false;
    motionButton.innerHTML = paused ? '<span aria-hidden="true">▷</span> 모션 재생' : '<span aria-hidden="true">Ⅱ</span> 모션 정지';
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.setAttribute('aria-label', paused ? '애니메이션 재생' : '애니메이션 일시정지');
  }
}
motionButton.addEventListener('click', () => {
  document.documentElement.classList.toggle('motion-paused');
  syncMotionButton();
});
reducedMotion.addEventListener('change', syncMotionButton);
syncMotionButton();

let toastTimeout;
function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), 3500);
}
document.querySelector('#copy-code').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(document.querySelector('#api-code').textContent);
    showToast('연동 예시 코드를 복사했습니다.');
  } catch {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('#api-code'));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    showToast('코드를 선택했습니다. Ctrl+C 또는 ⌘C로 복사해 주세요.');
  }
});

const dialog = document.querySelector('#app-dialog');
const content = document.querySelector('#dialog-content');
let lastTrigger;
function showDialog(eyebrow, html) {
  if (!dialog.open) lastTrigger = document.activeElement;
  document.querySelector('#dialog-eyebrow').textContent = eyebrow;
  content.innerHTML = html;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  document.querySelector('#dialog-close').focus();
}
document.querySelector('#dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }
});
dialog.addEventListener('close', () => { if (lastTrigger?.isConnected) lastTrigger.focus(); });

function guideDialog() {
  showDialog('API 연동 안내', `<span class="preview-label">출시 후 연동 절차 · 현재 API 미연결</span><h2 class="dialog-title" id="dialog-title">API 연동 순서</h2><p class="dialog-subtitle">서비스 출시 후에는 아래 순서로 API를 연결합니다.<br>호스트 주소와 모델 ID는 출시 시 제공하는 문서에서 확인하세요.</p><ol class="guide-steps"><li><strong>크레딧 충전</strong><br>사용할 금액만큼 크레딧을 충전합니다.</li><li><strong>API 키 발급</strong><br>발급받은 키는 서버 환경변수로 보관합니다. 프런트엔드 코드에 노출하지 마세요.</li><li><strong>연결 정보 설정</strong><br>예제의 <code>YOUR_SNVM_API_KEY</code>, <code>YOUR_API_HOST</code>, <code>YOUR_MODEL_ID</code>를 실제 발급 정보로 교체합니다.</li><li><strong>모델별 규격 확인</strong><br>영상·미디어 모델은 요청 형식이나 비동기 처리 방식이 다를 수 있습니다.</li></ol><button class="button button-dark dialog-full-button" id="show-code">코드 예시로 이동 <span aria-hidden="true">↓</span></button>`);
  content.querySelector('#show-code').addEventListener('click', () => {
    lastTrigger = document.querySelector('#copy-code');
    dialog.close();
    document.querySelector('#developers').scrollIntoView();
  });
}

function modelDialog(id) {
  const model = models.find(item => item.id === id);
  if (!model) return;
  showDialog('모델 안내', `<span class="preview-label">지원 예정 모델</span> <span class="discount-badge">20% 할인</span><div class="model-dialog-logo model-logo logo-${model.id}" aria-hidden="true"><img src="${model.logo}" width="40" height="40" alt="" decoding="async"></div><h2 class="dialog-title" id="dialog-title">${model.name}</h2><p class="dialog-subtitle">${model.description}</p><div class="model-dialog-facts"><div>제공사<strong>${model.provider}</strong></div><div>활용 분야<strong>${model.label}</strong></div></div><p class="dialog-subtitle">현재 표시한 20% 할인율은 임시 안내입니다. 동일 모델의 공개 API 가격을 기준으로 비교하며, 확정 할인율과 지원 버전, 단가는 출시 시 안내합니다.</p><a class="button button-yellow dialog-full-button" data-cta="waitlist" href="https://docs.google.com/forms/d/e/1FAIpQLSdNcSwuzh3LBHjDPUgoXGbFQqcpUNlqjviSa2slf0LgYf_6_g/viewform?entry.1408000558=%EC%B6%9C%EC%8B%9C%20%EC%95%8C%EB%A6%BC%20%EC%8B%A0%EC%B2%AD" target="_blank" rel="noopener noreferrer">출시 알림 신청 <span aria-hidden="true">↗</span></a><p class="dialog-note">서비스 출시하면 메일을 드립니다.</p>`);
}

function policyDialog() {
  showDialog('이용 안내', `<h2 class="dialog-title" id="dialog-title">이용 안내</h2><p class="dialog-subtitle">SNVM AI는 한국 기업과 개발자를 위한<br>AI API 크레딧 서비스입니다.</p><ul class="policy-list"><li>현재 출시 알림 신청과 도입 문의를 받고 있습니다. 결제, 회원가입, API 호출은 서비스 출시 후 이용할 수 있습니다.</li><li>할인율은 동일 모델·동일 사용량의 공급사 공개 API 가격을 기준으로 계산합니다. 최대 할인율은 20%이며, 현재 모델별 20% 표시는 임시 안내입니다. 확정 할인율은 모델별로 달라질 수 있으며, 가격표는 출시 시 안내합니다.</li><li>모든 브랜드명은 각 권리자에게 속합니다. 로고와 모델 이름의 표시는 공식 파트너십이나 인증을 의미하지 않습니다.</li><li>출시 알림과 문의는 Google Forms로 받습니다. 이메일과 신청 내용은 Google Sheets에 저장하고, 출시 안내와 문의 답변에 사용합니다.</li><li>크레딧 환불 기준과 유효기간은 결제 서비스 출시 시 안내합니다.</li></ul>`);
}

const dialogs = { guide: guideDialog, policy: policyDialog };
document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-open]');
  if (trigger && dialogs[trigger.dataset.open]) {
    dialogs[trigger.dataset.open]();
    if (trigger.closest('#mobile-nav')) lastTrigger = menuButton;
  }
  const modelTrigger = event.target.closest('[data-model]');
  if (modelTrigger) modelDialog(modelTrigger.dataset.model);
});
