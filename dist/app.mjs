import { calculateSavings, validCreditAmount } from './pricing.mjs';

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
function renderModels() {
  const query = search.value.trim().toLocaleLowerCase();
  const filtered = models.filter(model => (category === 'all' || model.categories.includes(category)) && `${model.name} ${model.provider} ${model.label}`.toLocaleLowerCase().includes(query));
  grid.innerHTML = filtered.map(model => `<button class="model-card" data-model="${model.id}" aria-label="${model.name} 모델 자세히 보기"><div class="model-card-top"><span class="model-logo logo-${model.id}" aria-hidden="true">${model.logo}</span><span class="discount-badge">−20%</span></div><h3>${model.name}</h3><p>${model.provider}</p><div class="model-card-bottom"><span class="category-tag">${model.label}</span><span class="model-card-arrow" aria-hidden="true">↗</span></div></button>`).join('');
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
  if (dialog.open) {
    let status = content.querySelector('[data-dialog-status]');
    if (!status) {
      status = document.createElement('p');
      status.className = 'dialog-success';
      status.dataset.dialogStatus = '';
      status.setAttribute('role', 'status');
      content.append(status);
    }
    status.textContent = message;
    status.scrollIntoView({ block: 'nearest' });
    return;
  }
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
let demoBalance = 0;
// shortcut: 크레딧은 탭 메모리에만 보관되는 데모이며, 실결제 출시 시 서버 원장으로 교체합니다.
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

function creditDialog() {
  showDialog('01 / YOUR NEXT POSSIBILITY', `<span class="preview-label">충전 미리보기 · 실제 결제되지 않습니다</span><h2 class="dialog-title" id="dialog-title">필요한 만큼, 가볍게.</h2><p class="dialog-subtitle">예시 크레딧을 충전하고 이용 방식을 살펴보세요.<br>새로고침하면 체험 잔액은 초기화됩니다.</p><form id="credit-form"><label class="field-label" for="credit-amount">충전 금액 선택</label><div class="credit-options"><button type="button" data-credit="50000">5만 원</button><button type="button" data-credit="100000" class="selected">10만 원</button><button type="button" data-credit="300000">30만 원</button></div><div class="form-field"><input id="credit-amount" aria-label="직접 입력하는 충전 금액, 원" aria-describedby="credit-help credit-error" type="number" min="10000" max="10000000" step="1000" value="100000" required><span id="credit-help" class="dialog-note">체험 금액: 1만~1,000만 원, 1,000원 단위</span><span id="credit-error" class="field-error" role="alert" hidden>1만~1,000만 원 사이의 금액을 1,000원 단위로 입력해 주세요.</span></div><div class="credit-summary"><span>충전 후 체험 잔액</span><strong id="credit-total">₩ ${won.format(demoBalance + 100_000)}</strong></div><button class="button button-dark dialog-full-button" type="submit">크레딧 충전 체험하기 <span aria-hidden="true">↗</span></button></form><p class="dialog-note">실제 크레딧 판매 조건과 부가세 적용은 서비스 출시 시 안내됩니다. 결제 정보는 수집하지 않습니다.</p>`);
  const input = content.querySelector('#credit-amount');
  function updateCredit() {
    const amount = Number(input.value);
    const valid = validCreditAmount(amount);
    content.querySelector('#credit-error').hidden = valid;
    input.setAttribute('aria-invalid', String(!valid));
    content.querySelector('#credit-total').textContent = valid ? `₩ ${won.format(demoBalance + amount)}` : '—';
    content.querySelectorAll('[data-credit]').forEach(button => button.classList.toggle('selected', Number(button.dataset.credit) === amount));
  }
  content.querySelectorAll('[data-credit]').forEach(button => button.addEventListener('click', () => {
    input.value = button.dataset.credit;
    updateCredit();
  }));
  input.addEventListener('input', updateCredit);
  content.querySelector('#credit-form').addEventListener('submit', event => {
    event.preventDefault();
    const amount = Number(input.value);
    if (!validCreditAmount(amount)) { updateCredit(); input.focus(); return; }
    demoBalance += amount;
    showDialog('PREVIEW COMPLETE', `<span class="preview-label">실제 결제 없음</span><h2 class="dialog-title" id="dialog-title">충전 흐름을 체험했어요.</h2><div class="dialog-success"><h3>체험 크레딧 + ₩ ${won.format(amount)}</h3><p>현재 체험 잔액은 <strong>₩ ${won.format(demoBalance)}</strong>입니다.<br>예시 잔액은 API 사용이나 결제에 사용할 수 없습니다.</p></div><button class="button button-dark dialog-full-button" data-open="console">체험 콘솔 보기 <span aria-hidden="true">↗</span></button><p class="dialog-note">현재 탭에서만 유지되는 미리보기입니다. 실제 결제나 크레딧 발급은 이루어지지 않았습니다.</p>`);
  });
}

function consoleDialog() {
  showDialog('SNVM AI / CONSOLE PREVIEW', `<span class="preview-label">체험 콘솔 · API 호출 미지원</span><h2 class="dialog-title" id="dialog-title">반가워요, 빌더.</h2><p class="dialog-subtitle">크레딧 한 곳에서, 모든 가능성을 관리하세요.</p><div class="console-balance"><span>내 체험 크레딧</span><strong>₩ ${won.format(demoBalance)}</strong><p>새로고침 시 초기화 · 실제 자산이 아닌 예시 잔액</p></div><div class="console-row"><span>체험 API 사용량</span><strong>0회</strong></div><div class="console-row"><span>지원 예정 라인업</span><strong>8개 브랜드</strong></div><div class="console-row"><span>적용 예정 할인율</span><strong>20%</strong></div><button class="button button-yellow dialog-full-button" data-open="credit">크레딧 충전 체험하기 <span aria-hidden="true">+</span></button><p class="dialog-note">로그인, 실제 API 키 발급, 사용량 집계는 서비스 출시 시 제공됩니다.</p>`);
}

function contactDialog() {
  showDialog('LET’S BUILD TOGETHER', `<span class="preview-label">문의서 작성 · 서버에 전송되지 않습니다</span><h2 class="dialog-title" id="dialog-title">우리 팀에 맞는 AI.</h2><p class="dialog-subtitle">도입에 필요한 내용을 정리해 문의서를 다운로드하세요.<br>상담 접수 채널은 서비스 출시 시 연결됩니다.</p><form id="contact-form"><div class="form-field"><label for="company-name">회사 또는 팀 이름</label><input id="company-name" name="company" autocomplete="organization" required maxlength="100" placeholder="예: 스노비움 스튜디오"></div><div class="form-field"><label for="contact-email">담당자 이메일</label><input id="contact-email" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="you@company.com"></div><div class="form-field"><label for="contact-budget">예상 월 API 사용 금액</label><select id="contact-budget" name="budget"><option>100만 원 미만</option><option>100만~500만 원</option><option>500만~1,000만 원</option><option>1,000만 원 이상</option><option>아직 정해지지 않았어요</option></select></div><div class="form-field"><label for="contact-message">사용 모델과 문의 내용</label><textarea id="contact-message" name="message" maxlength="3000" required placeholder="필요한 모델, 예상 사용량, 결제·증빙 요구사항 등을 알려주세요."></textarea></div><button class="button button-dark dialog-full-button" type="submit">문의서 다운로드 <span aria-hidden="true">↓</span></button></form><p class="dialog-note">작성한 정보는 서버에 저장하거나 전송하지 않습니다. 다운로드한 문의서는 기기에만 저장됩니다.</p>`);
  content.querySelector('#contact-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    for (const field of [form.elements.company, form.elements.message]) {
      field.setCustomValidity(field.value.trim() ? '' : '공백이 아닌 내용을 입력해 주세요.');
      field.addEventListener('input', () => field.setCustomValidity(''), { once: true });
    }
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const text = `SNVM AI 기업 도입 문의서\n\n회사 / 팀: ${data.get('company').trim()}\n담당자 이메일: ${data.get('email').trim()}\n예상 월 사용 금액: ${data.get('budget')}\n\n문의 내용\n${data.get('message').trim()}\n\n이 문서는 문의 내용의 로컬 사본입니다. 상담 접수는 이루어지지 않았습니다.`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'SNVM-AI-기업도입-문의서.txt';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('문의서를 다운로드했습니다. 서버로 전송되지 않았습니다.');
  });
}

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
  showDialog('MEET YOUR NEXT MODEL', `<span class="preview-label">지원 예정 라인업</span><div class="model-dialog-logo model-logo logo-${model.id}" aria-hidden="true">${model.logo}</div><h2 class="dialog-title" id="dialog-title">${model.name}</h2><p class="dialog-subtitle">${model.description}</p><div class="model-dialog-facts"><div>제공사<strong>${model.provider}</strong></div><div>활용 분야<strong>${model.label}</strong></div></div><p class="dialog-subtitle">동일 모델의 공개 API 가격 대비 20% 할인 요금을 준비하고 있습니다. 제공 버전, 요청 형식과 실제 단가는 출시 시 안내됩니다.</p><button class="button button-yellow dialog-full-button" data-open="credit">크레딧 이용 방식 보기 <span aria-hidden="true">↗</span></button>`);
}

function policyDialog() {
  showDialog('BEFORE WE BEGIN', `<h2 class="dialog-title" id="dialog-title">이용 안내</h2><p class="dialog-subtitle">SNVM AI는 한국 기업과 개발자를 위한<br>AI API 크레딧 서비스 콘셉트입니다.</p><ul class="policy-list"><li>이 사이트는 서비스 소개와 체험을 위한 미리보기입니다. 실제 결제, 회원가입, API 호출은 제공하지 않습니다.</li><li>20% 할인은 동일 모델·동일 사용량의 공급사 공개 API 가격을 비교 기준으로 한 서비스 제안입니다. 실제 공급 조건, 지원 버전 및 가격표는 출시 전에 확정해야 합니다.</li><li>모든 브랜드명은 각 권리자에게 속합니다. 로고와 모델 이름의 표시는 공식 파트너십이나 인증을 의미하지 않습니다.</li><li>문의 정보는 서버로 전송되지 않습니다. 체험 크레딧은 현재 탭의 메모리에서만 유지되며 새로고침 시 초기화됩니다.</li><li>판매 주체, 개인정보 처리방침, 환불 및 크레딧 유효기간 정책은 서비스 출시 시 안내됩니다.</li></ul>`);
}

const dialogs = { credit: creditDialog, console: consoleDialog, contact: contactDialog, guide: guideDialog, policy: policyDialog };
document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-open]');
  if (trigger && dialogs[trigger.dataset.open]) {
    dialogs[trigger.dataset.open]();
    if (trigger.closest('#mobile-nav')) lastTrigger = menuButton;
  }
  const modelTrigger = event.target.closest('[data-model]');
  if (modelTrigger) modelDialog(modelTrigger.dataset.model);
});
