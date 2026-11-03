// Run against the local page: agent-browser --session twenty-qa eval --stdin < tests/browser-smoke.js
(async () => {
  const checks = [];
  const $ = selector => document.querySelector(selector);
  const assert = (condition, message) => { if (!condition) throw new Error(message); checks.push(message); };
  const enter = (selector, value) => {
    $(selector).value = value;
    $(selector).dispatchEvent(new Event('input', { bubbles: true }));
  };
  const tick = () => new Promise(resolve => setTimeout(resolve, 30));
  const close = async () => { $('#dialog-close').click(); await tick(); };

  assert(document.fonts.check('800 20px Pretendard'), 'Korean font loaded');
  assert(document.documentElement.scrollWidth <= innerWidth, 'No horizontal page overflow');
  $('[data-filter="video"]').click();
  assert(document.querySelectorAll('.model-card').length === 3, 'Video filter includes Seedance, Kling and WAND');
  enter('#model-search', 'Kling');
  assert(document.querySelectorAll('.model-card').length === 1, 'Search combines with the active category');
  enter('#model-search', '<invalid>');
  assert(!$('#model-empty').hidden && $('#model-grid').hidden, 'Unknown query shows an empty state');
  enter('#model-search', '');
  $('[data-filter="all"]').click();
  assert(document.querySelectorAll('.model-card').length === 8, 'All eight models restored');
  $('[data-model="claude"]').click();
  assert($('#app-dialog').open && $('#dialog-title').textContent === 'Claude', 'Model details open');
  await close();

  enter('#monthly-spend', '5000000');
  assert($('#discounted-amount').textContent === '4,000,000원 / 월' && $('#saved-amount').textContent === '1,000,000원', 'Live savings calculation is correct');
  enter('#monthly-spend', '-1');
  assert(!$('#amount-error').hidden && $('#monthly-spend').getAttribute('aria-invalid') === 'true', 'Negative spending is rejected');
  enter('#monthly-spend', '100000001');
  assert(!$('#amount-error').hidden, 'Amounts over one hundred million are rejected');
  $('[data-spend="1000000"]').click();
  assert($('#amount-error').hidden && $('#annual-amount').textContent === '2,400,000원', 'Preset restores valid amounts');

  $('.header [data-open="credit"]').click();
  enter('#credit-amount', '10001');
  assert(!$('#credit-error').hidden && !$('#credit-form').checkValidity(), 'Credit precision is validated');
  $('[data-credit="50000"]').click();
  $('#credit-form').requestSubmit();
  assert($('#dialog-title').textContent.includes('체험했어요'), 'Credit preview completes');
  $('#dialog-content [data-open="console"]').click();
  assert($('.console-balance strong').textContent === '₩ 50,000', 'Preview console reflects the credit balance');
  await close();

  $('[data-open="guide"]').click();
  $('#show-code').click();
  await tick();
  assert(document.activeElement === $('#copy-code'), 'Guide returns focus to the code copy action');

  $('#business [data-open="contact"]').click();
  enter('#company-name', '   ');
  enter('#contact-email', 'qa@example.com');
  enter('#contact-message', '   ');
  $('#contact-form').requestSubmit();
  assert(!$('#company-name').validity.valid, 'Whitespace-only contact information is rejected');
  enter('#company-name', 'TWENTY QA');
  enter('#contact-message', '테스트용 로컬 문의서입니다.');
  $('#contact-form').requestSubmit();
  assert($('#dialog-content [role="status"]').textContent.includes('다운로드'), 'Download feedback remains inside the modal');
  await close();

  if (innerWidth <= 640) {
    $('.menu-toggle').click();
    assert(!$('#mobile-nav').hidden, 'Mobile navigation opens');
    $('#mobile-nav [data-open="console"]').click();
    assert($('#mobile-nav').hidden && $('#app-dialog').open, 'Mobile console opens and navigation closes');
    await close();
    assert(document.activeElement === $('.menu-toggle'), 'Mobile modal restores focus to visible menu control');
  }
  const faq = $('.faq-list details');
  faq.querySelector('summary').click();
  assert(faq.open, 'FAQ expands');
  faq.open = false;
  if (!$('.motion-toggle').disabled) {
    $('.motion-toggle').click();
    assert(document.documentElement.classList.contains('motion-paused'), 'Motion can be paused');
  }
  assert(document.documentElement.scrollWidth <= innerWidth, 'No overflow after interactions');
  window.scrollTo({ top: 0, behavior: 'instant' });
  return { passed: checks.length, checks };
})()
