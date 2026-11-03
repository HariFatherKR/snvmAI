import { calculateSavings } from './pricing.mjs';

const won = new Intl.NumberFormat('ko-KR');
const models = [
  { id: 'claude', name: 'Claude', provider: 'Anthropic', categories: ['text'], label: '텍스트 · 코드', logo: '✳', description: '정교한 글쓰기부터 복잡한 코드 작업까지. 사고를 확장하는 AI를 만나보세요.' },
  { id: 'openai', name: 'ChatGPT', provider: 'OpenAI 모델 API', categories: ['text'], label: '텍스트 · 코드', logo: '<svg aria-hidden="true"><use href="#icon-openai"/></svg>', description: '대화, 문서 작성, 코딩에 활용하는 OpenAI 모델 API입니다. ChatGPT Plus 구독 상품과는 별개입니다.' },
  { id: 'gemini', name: 'Gemini', provider: 'Google', categories: ['text'], label: '텍스트 · 멀티모달', logo: '✦', description: '텍스트와 다양한 자료를 함께 이해하는 멀티모달 AI. 문서 분석부터 아이디어 탐색까지 활용하세요.' },
  { id: 'deepseek', name: 'DeepSeek', provider: 'DeepSeek', categories: ['text'], label: '추론 · 코드', logo: '<svg aria-hidden="true" viewBox="0 0 40 40"><path fill="currentColor" d="M5 21c-2-3-2-7 0-10 1 5 3 7 5 7 3-7 14-9 20-2l7-3-1 6 4 2-6 3c-5 10-18 11-25 4L3 32l1-7-4-3z"/><circle cx="27" cy="19" r="1.5" fill="#fbfaf5"/></svg>', description: '추론과 코드 작업을 위한 언어 모델입니다. 개발과 분석 작업에 필요한 모델을 선택해 보세요.' },
  { id: 'glm', name: 'GLM', provider: 'Z.ai', categories: ['text'], label: '텍스트 · 코드', logo: '≋', description: '다양한 언어 작업과 개발에 활용하는 GLM 모델 계열입니다. 필요한 작업에 맞춰 이용할 수 있습니다.' },
  { id: 'seedance', name: 'Seedance', provider: 'ByteDance', categories: ['video'], label: '영상 생성', logo: '◈', description: '텍스트나 이미지를 영상으로 연결하는 생성형 AI. 브랜드 콘텐츠와 새로운 장면을 구상해 보세요.' },
  { id: 'kling', name: 'Kling', provider: 'Kuaishou', categories: ['video'], label: '영상 생성', logo: 'K', description: '아이디어를 움직이는 장면으로. 영상 생성에 활용하는 Kling 모델의 지원을 준비하고 있습니다.' },
  { id: 'wand', name: 'WAND', provider: 'Tencent', categories: ['image', 'video'], label: '이미지 · 미디어', logo: 'W', description: 'Tencent의 미디어 AI 제품입니다. 이미지·영상 생성과 미디어 처리의 지원 범위를 준비하고 있습니다.' }
];

const grid = document.querySelector('#model-grid');
const search = document.querySelector('#model-search');
let category = 'all';
// shortcut: 확정 할인율 수령 전에는 모든 모델에 20%를 임시 표시합니다.
function renderModels() {
  const query = search.value.trim().toLocaleLowerCase();
  const filtered = models.filter(model => (category === 'all' || model.categories.includes(category)) && `${model.name} ${model.provider} ${model.label}`.toLocaleLowerCase().includes(query));
  grid.innerHTML = filtered.map(model => `<button class="model-card" data-model="${model.id}" aria-label="${model.name}, 20% 할인, 모델 자세히 보기"><div class="model-card-top"><span class="model-logo logo-${model.id}" aria-hidden="true">${model.logo}</span><span class="discount-badge">20% 할인</span></div><h3>${model.name}</h3><p>${model.provider}</p><div class="model-card-bottom"><span class="category-tag">${model.label}</span><span class="model-card-arrow" aria-hidden="true">↗</span></div></button>`).join('');
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
function syncMotionButton() {
  if (reducedMotion.matches) {
    motionButton.textContent = '모션 줄이기 설정 적용 중';
    motionButton.disabled = true;
    motionButton.setAttribute('aria-label', '기기의 모션 줄이기 설정 적용 중');
  } else {
    motionButton.disabled = false;
    const paused = document.documentElement.classList.contains('motion-paused');
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
  showDialog('DEVELOPER QUICKSTART', `<span class="preview-label">연동 방식 안내 · 실제 API 미연결</span><h2 class="dialog-title" id="dialog-title">익숙한 코드로 시작하기.</h2><p class="dialog-subtitle">서비스 출시 후 제공될 통합 API의 이용 흐름입니다.<br>실제 호스트와 모델 ID는 발급된 문서를 확인해 주세요.</p><ol class="guide-steps"><li><strong>크레딧 충전</strong><br>필요한 예산을 충전하고 잔액을 확인합니다.</li><li><strong>API 키 발급</strong><br>발급받은 키는 서버 환경변수로 보관합니다. 프런트엔드 코드에 노출하지 마세요.</li><li><strong>연결 정보 설정</strong><br>예제의 <code>YOUR_SNVM_API_KEY</code>, <code>YOUR_API_HOST</code>, <code>YOUR_MODEL_ID</code>를 실제 발급 정보로 교체합니다.</li><li><strong>모델별 규격 확인</strong><br>영상·미디어 모델은 별도 요청 형식과 비동기 처리 방식이 적용될 수 있습니다.</li></ol><button class="button button-dark dialog-full-button" id="show-code">코드 예시로 이동 <span aria-hidden="true">↓</span></button>`);
  content.querySelector('#show-code').addEventListener('click', () => {
    lastTrigger = document.querySelector('#copy-code');
    dialog.close();
    document.querySelector('#developers').scrollIntoView();
  });
}

function modelDialog(id) {
  const model = models.find(item => item.id === id);
  if (!model) return;
  showDialog('MEET YOUR NEXT MODEL', `<span class="preview-label">지원 예정 라인업</span> <span class="discount-badge">20% 할인</span><div class="model-dialog-logo model-logo logo-${model.id}" aria-hidden="true">${model.logo}</div><h2 class="dialog-title" id="dialog-title">${model.name}</h2><p class="dialog-subtitle">${model.description}</p><div class="model-dialog-facts"><div>제공사<strong>${model.provider}</strong></div><div>활용 분야<strong>${model.label}</strong></div></div><p class="dialog-subtitle">현재 이 모델의 할인율은 20%로 임시 표시됩니다. 동일 모델의 공개 API 가격을 비교 기준으로 하며, 확정 할인율·지원 버전·단가는 출시 시 안내됩니다.</p><a class="button button-yellow dialog-full-button" data-cta="waitlist" href="https://docs.google.com/forms/d/e/1FAIpQLSdNcSwuzh3LBHjDPUgoXGbFQqcpUNlqjviSa2slf0LgYf_6_g/viewform?entry.1408000558=%EC%B6%9C%EC%8B%9C%20%EC%95%8C%EB%A6%BC%20%EC%8B%A0%EC%B2%AD" target="_blank" rel="noopener noreferrer">출시 알림 신청 <span aria-hidden="true">↗</span></a><p class="dialog-note">서비스 출시하면 메일을 드립니다.</p>`);
}

function policyDialog() {
  showDialog('BEFORE WE BEGIN', `<h2 class="dialog-title" id="dialog-title">이용 안내</h2><p class="dialog-subtitle">SNVM AI는 한국 기업과 개발자를 위한<br>AI API 크레딧 서비스입니다.</p><ul class="policy-list"><li>현재 출시 알림 신청과 도입 문의를 접수하고 있습니다. 실제 결제, 회원가입, API 호출은 서비스 출시 후 제공됩니다.</li><li>최대 20% 할인은 동일 모델·동일 사용량의 공급사 공개 API 가격을 비교 기준으로 한 서비스 제안입니다. 할인율은 모델별로 달라질 수 있으며, 현재 모든 모델의 20% 표시는 임시 안내입니다. 실제 할인율과 가격표는 출시 전에 확정해야 합니다.</li><li>모든 브랜드명은 각 권리자에게 속합니다. 로고와 모델 이름의 표시는 공식 파트너십이나 인증을 의미하지 않습니다.</li><li>출시 알림과 문의는 Google Forms로 접수합니다. 입력하신 이메일과 신청 내용은 Google Sheets에 저장되며, 서비스 출시 안내와 문의 답변에 사용됩니다.</li><li>크레딧 환불과 유효기간 등 판매 정책은 실제 결제 서비스 출시 시 안내됩니다.</li></ul>`);
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
