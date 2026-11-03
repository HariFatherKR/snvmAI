// Run after verified Google Form URLs have replaced the link sentinels; never submits the external form.
// Run against the local page: agent-browser --session snvm-qa eval --stdin < tests/browser-smoke.js
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
  assert(document.querySelectorAll('.model-card').length === 2, 'Video filter includes Seedance and Kling');
  enter('#model-search', 'Kling');
  assert(document.querySelectorAll('.model-card').length === 1, 'Search combines with the active category');
  enter('#model-search', '<invalid>');
  assert(!$('#model-empty').hidden && $('#model-grid').hidden, 'Unknown query shows an empty state');
  enter('#model-search', '');
  $('[data-filter="all"]').click();
  assert(document.querySelectorAll('.model-card').length === 7, 'All seven models restored');
  $('[data-model="claude"]').click();
  assert($('#app-dialog').open && $('#dialog-title').textContent === 'Claude', 'Model details open');
  assert($('#dialog-content a[data-cta="waitlist"]'), 'Model details include the launch signup link');
  await close();

  enter('#monthly-spend', '5000000');
  assert($('#discounted-amount').textContent === '4,000,000원 / 월' && $('#saved-amount').textContent === '1,000,000원', 'Live savings calculation is correct');
  enter('#monthly-spend', '-1');
  assert(!$('#amount-error').hidden && $('#monthly-spend').getAttribute('aria-invalid') === 'true', 'Negative spending is rejected');
  enter('#monthly-spend', '100000001');
  assert(!$('#amount-error').hidden, 'Amounts over one hundred million are rejected');
  $('[data-spend="1000000"]').click();
  assert($('#amount-error').hidden && $('#annual-amount').textContent === '2,400,000원', 'Preset restores valid amounts');

  const conversionLinks = [...document.querySelectorAll('a[data-cta]')];
  assert(conversionLinks.length >= 7, 'Header, hero, mobile, business, closing and footer CTAs are present');
  assert(conversionLinks.every(link => link.target === '_blank' && link.relList.contains('noopener') && link.relList.contains('noreferrer')), 'Conversion links open safely in a new tab');
  assert(conversionLinks.every(link => {
    const url = new URL(link.href);
    return url.protocol === 'https:' && url.hostname === 'docs.google.com' && url.pathname.startsWith('/forms/');
  }), 'Every conversion link points to a published Google Form');
  assert(!document.querySelector('[data-open="credit"],[data-open="console"],[data-open="contact"]'), 'Demo and download conversion flows are removed');
  assert($('.launch-note').textContent === '서비스 출시하면 메일을 드립니다.', 'Launch email promise is visible beside the primary CTA');

  $('[data-open="guide"]').click();
  $('#show-code').click();
  await tick();
  assert(document.activeElement === $('#copy-code'), 'Guide returns focus to the code copy action');

  if (innerWidth <= 640) {
    $('.menu-toggle').click();
    assert(!$('#mobile-nav').hidden, 'Mobile navigation opens');
    assert($('#mobile-nav a[data-cta="contact"]').textContent === '문의하기', 'Mobile navigation includes the inquiry link');
    $('.menu-toggle').click();
    assert($('#mobile-nav').hidden, 'Mobile navigation closes');
  }
  const faq = $('.faq-list details');
  faq.querySelector('summary').click();
  assert(faq.open, 'FAQ expands');
  faq.open = false;
  if (!$('.motion-toggle').disabled) {
    $('.motion-toggle').click();
    assert(document.documentElement.classList.contains('motion-paused'), 'Motion can be paused');
    assert(!document.documentElement.classList.contains('kinetic-enabled'), 'Scroll entrances stop when motion is paused');
    assert([...document.querySelectorAll('.kinetic-text')].every(text => {
      const style = getComputedStyle(text);
      return style.opacity === '1' && style.transform === 'none';
    }), 'Paused headings remain fully readable, including offscreen headings');
    assert(getComputedStyle($('.rate-roll')).transform === 'none', 'Paused discount shows a complete static number');
    $('.motion-toggle').click();
    assert(document.documentElement.classList.contains('kinetic-enabled'), 'Motion resumes after the second toggle');
  }
  assert(document.documentElement.scrollWidth <= innerWidth, 'No overflow after interactions');
  window.scrollTo({ top: 0, behavior: 'instant' });
  return { passed: checks.length, checks };
})()
