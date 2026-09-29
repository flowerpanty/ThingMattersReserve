(function () {
  const root = document.getElementById('nm-order-flow');
  const core = window.NMOrderCore;
  if (!root || !core) return;

  const products = {
    cookieFlight: {
      name: '쿠키 플라이트', unit: 'BOX', unitPrice: 16000,
      image: '/public/cookie-flight-assets/cookie-flight-hero.webp',
      imageAlt: '쿠키 플라이트 4개입 선물 박스',
      tagline: '클래식버터 · 더블초코 · 제주말차 · 오렌지',
      description: '4가지 맛을 담은 4개입 선물 박스',
      facts: [['CLASSIC', '클래식버터'], ['CHOCO', '더블초코'], ['MATCHA', '제주말차'], ['ORANGE', '오렌지']],
      note: '4가지 맛이 1 BOX의 기본 구성입니다. 맛은 선택 옵션이 아닙니다.',
    },
    airplaneButter: {
      name: '비행기 버터쿠키', unit: '개', unitPrice: 2500,
      image: '/public/airplane-cookie-assets/hero.webp',
      imageAlt: '개별 포장된 비행기 버터쿠키',
      tagline: '비행기 모양 버터쿠키 · 단품 · 개별포장',
      description: '가볍게 건네기 좋은 비행기 모양 버터쿠키',
      facts: [['PRODUCT', '비행기 버터쿠키'], ['TYPE', '단품 · 개별포장'], ['PRICE', '1개 2,500원']],
      note: '1개씩 개별 포장해 준비합니다.',
    },
    cookieCrew: {
      name: '쿠키크루', unit: '개', pricingPending: true,
      image: '/public/cookie-crew-assets/cookie-crew-hero-main.webp',
      imageAlt: '쿠키크루 캐릭터 쿠키',
      tagline: '마음에 드는 쿠키크루를 종류별로 골라주세요.',
      description: '쿠키 4종을 원하는 수량만큼 선택할 수 있어요.',
      note: '마그넷은 현재 주문 항목에 포함되지 않습니다.',
      crew: [
        ['captain', '쿠키기장', '/public/cookie-crew-assets/cookie-crew-pilot-hero.webp'],
        ['blue', '쿠키블루', '/public/cookie-crew-assets/cookie-crew-color-crew-02.webp'],
        ['orange', '쿠키오렌지', '/public/cookie-crew-assets/cookie-crew-color-crew-01.webp'],
        ['green', '쿠키그린', '/public/cookie-crew-assets/cookie-crew-color-crew-03.webp'],
      ],
    },
  };
  const source = root.dataset.source;
  const product = products[source];
  if (!product) return;

  const state = {
    step: 1,
    quantity: 1,
    crewQuantities: { captain: 0, blue: 0, orange: 0, green: 0 },
    submitting: false,
    submitted: false,
  };
  const byId = (id) => document.getElementById(id);
  const won = (value) => `${value.toLocaleString('ko-KR')}원`;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stepNames = ['상품 선택', '주문 정보', '주문 확인'];
  const submitLabel = product.pricingPending ? '가격 상담 요청 보내기' : '주문 요청 보내기';
  const counter = (key, label, count) => `
    <div class="nm-order-counter" role="group" aria-label="${label} 수량">
      <button type="button" data-delta="-1" ${key ? `data-crew="${key}"` : ''} aria-label="${label} 한 개 줄이기">−</button>
      <output ${key ? `data-crew-count="${key}"` : 'id="nm-order-count"'} aria-live="polite">${count}</output>
      <button type="button" data-delta="1" ${key ? `data-crew="${key}"` : ''} aria-label="${label} 한 개 늘리기">+</button>
    </div>`;
  const controls = product.crew
    ? `<div class="nm-order-crew-list">${product.crew.map(([key, label, image]) => `
        <div class="nm-order-quantity nm-order-crew-row">
          <img src="${image}" alt="${label}" width="76" height="76" loading="lazy" decoding="async">
          <strong class="nm-order-quantity-name">${label}</strong>
          ${counter(key, label, 0)}
        </div>`).join('')}</div>`
    : `<div class="nm-order-quantity nm-order-main-quantity">
        <strong class="nm-order-quantity-name">${product.name}</strong>
        ${counter('', product.name, 1)}
      </div>`;
  const facts = product.facts
    ? `<div class="nm-order-facts">${product.facts.map(([tag, value]) => `<div><small>${tag}</small><strong>${value}</strong></div>`).join('')}</div>`
    : '';

  root.innerHTML = `
    <header class="nm-order-header">
      <div class="nm-order-header-inner">
        <a class="nm-order-brand" href="/order">NOTHINGMATTERS.</a>
        <a class="nm-order-back" href="/order">← 다른 상품 보기</a>
        <nav class="nm-order-steps" aria-label="주문 단계">
          ${stepNames.map((name, index) => `<button type="button" data-step-link="${index + 1}" aria-label="${index + 1}단계 ${name}"><span>${index + 1}</span>${name}</button>`).join('')}
        </nav>
        <div class="nm-order-mobile-progress" aria-live="polite">
          <div><span id="nm-mobile-count">1 / 3</span><strong id="nm-mobile-title">상품 선택</strong></div>
          <div class="nm-order-track"><span id="nm-mobile-bar"></span></div>
        </div>
      </div>
    </header>
    <main class="nm-order-main">
      <section class="nm-order-page" data-order-step="1" aria-labelledby="nm-step-one-title">
        <div class="nm-order-hero"><img src="${product.image}" alt="${product.imageAlt}" fetchpriority="high" decoding="async"></div>
        <div class="nm-order-page-head"><p>STEP 01 · 상품 선택</p><h1 id="nm-step-one-title">${product.name}</h1><p>${product.tagline}</p><p>${product.description}</p></div>
        ${facts}
        <article class="nm-order-card">
          <h2>${product.crew ? '쿠키크루 종류별 수량' : '몇 개 준비할까요?'}</h2>
          ${controls}
          <p class="nm-order-hint">${product.note}</p>
          <p id="nm-order-selection-error" class="nm-order-alert" role="alert" hidden></p>
        </article>
        <article class="nm-order-card nm-order-selection-card">
          <h2>현재 선택</h2>
          <div id="nm-order-selected-lines" class="nm-order-selected-lines" aria-live="polite"></div>
          <dl class="nm-order-price-list">
            <dt>선택 수량</dt><dd id="nm-order-selected-quantity"></dd>
            ${product.pricingPending ? '' : `<dt>${product.unitPrice === 16000 ? '1 BOX 가격' : '1개 가격'}</dt><dd>${won(product.unitPrice)}</dd>`}
            <dt>${product.pricingPending ? '가격' : '예상 총액'}</dt><dd class="nm-order-highlight" id="nm-order-selection-total"></dd>
          </dl>
          <button class="nm-order-primary" type="button" data-next>주문 정보 입력하기 →</button>
        </article>
      </section>
      <section class="nm-order-page" data-order-step="2" aria-labelledby="nm-step-two-title" hidden>
        <div class="nm-order-page-head"><p>STEP 02 · 주문 정보</p><h1 id="nm-step-two-title">주문 정보를 알려주세요</h1></div>
        <div class="nm-order-mini-summary"><img src="${product.image}" alt="" width="84" height="84"><div><strong>${product.name}</strong><span id="nm-order-mini-detail"></span></div></div>
        <div class="nm-order-card">
          <h2>주문자 정보</h2>
          <div class="nm-order-fields">
            <label><span>고객명 <b>*</b></span><input id="nm-customerName" type="text" autocomplete="name" placeholder="성함" /><small class="fieldError" id="nm-customerNameError" hidden></small></label>
            <label><span>핸드폰 <b>*</b></span><input id="nm-customerPhone" type="tel" autocomplete="tel" inputmode="tel" placeholder="010-0000-0000" /><small class="fieldError" id="nm-customerPhoneError" hidden></small></label>
            <label class="nm-order-full"><span>이메일 (선택)</span><input id="nm-customerEmail" type="email" autocomplete="email" placeholder="example@email.com" /><small class="fieldError" id="nm-customerEmailError" hidden></small></label>
          </div>
        </div>
        <div class="nm-order-card">
          <h2>수령 정보</h2>
          <div class="nm-order-fields">
            <label><span>수령 희망일 <b>*</b></span><input id="nm-deliveryDate" type="date" /><small class="fieldError" id="nm-deliveryDateError" hidden></small></label>
            <label><span>희망 시간 <b>*</b></span><select id="nm-pickupTime"><option value="">시간 선택</option></select><small class="fieldError" id="nm-pickupTimeError" hidden></small></label>
          </div>
          <p class="nm-order-field-label">수령 방식</p>
          <div class="nm-order-methods" role="group" aria-label="수령 방식">
            <button type="button" data-method="pickup" aria-pressed="true">매장 픽업<small>공항동 송정로 25</small></button>
            <button type="button" data-method="quick" aria-pressed="false">퀵 배송<small>지역 상담 필요</small></button>
          </div>
          <input id="nm-deliveryMethod" type="hidden" value="pickup">
          <label id="nm-address-row" class="nm-order-address" hidden><span>퀵 배송 주소 <b>*</b></span><input id="nm-deliveryAddress" type="text" autocomplete="street-address" placeholder="주소를 입력해 주세요" /><small class="fieldError" id="nm-deliveryAddressError" hidden></small></label>
        </div>
        <div class="nm-order-card"><label class="nm-order-request"><span>요청사항 (선택)</span><textarea id="nm-request" rows="3" placeholder="필요한 내용을 적어주세요"></textarea></label></div>
        <div class="nm-order-actions"><button type="button" class="nm-order-secondary" data-prev>← 이전</button><button type="button" class="nm-order-primary" data-next>주문 확인하기 →</button></div>
      </section>
      <section class="nm-order-page" data-order-step="3" aria-labelledby="nm-step-three-title" hidden>
        <div class="nm-order-page-head"><p>STEP 03 · 주문 확인</p><h1 id="nm-step-three-title">주문 내용을 확인해 주세요</h1></div>
        <div class="nm-order-card"><h2>선택한 상품</h2><ul id="nm-order-summary-items" class="nm-order-summary-items"></ul><dl class="nm-order-price-list"><dt>${product.pricingPending ? '가격' : '상품 합계'}</dt><dd class="nm-order-highlight" id="nm-order-confirm-total"></dd></dl></div>
        <div class="nm-order-card"><h2>주문자 · 수령 정보</h2><dl id="nm-order-customer-summary" class="nm-order-customer-summary"></dl></div>
        <p class="nm-order-hint">${product.pricingPending ? '가격은 상담 후 안내해 드립니다.' : '주문 접수 후 관리자가 내용을 확인합니다.'}</p>
        <p id="nm-order-submit-error" class="nm-order-alert" role="alert" hidden></p>
        <div class="nm-order-actions"><button type="button" class="nm-order-secondary" data-prev>← 이전</button><button type="button" class="nm-order-primary" id="nm-order-submit">${submitLabel}</button></div>
      </section>
      <div id="nm-order-success" class="nm-order-success" hidden aria-live="polite"><h1>${product.pricingPending ? '가격 상담 요청이 접수됐어요.' : '주문 요청이 접수됐어요.'}</h1><p>관리자가 내용을 확인한 뒤 연락드리겠습니다.</p><a href="/order">다른 상품 보기 →</a></div>
    </main>
    <div class="nm-order-floating" id="nm-order-floating" aria-label="선택 요약">
      <div class="nm-order-floating-progress"><span id="nm-floating-progress"></span></div>
      <div class="nm-order-floating-inner">
        <button type="button" class="nm-order-floating-back" id="nm-floating-back">← 뒤로</button>
        <div class="nm-order-floating-copy"><small id="nm-floating-label">상품 선택</small><strong>${product.name}</strong><span id="nm-floating-detail"></span></div>
        <button type="button" class="nm-order-floating-next" id="nm-floating-next">다음 →</button>
      </div>
    </div>`;

  const dateInput = byId('nm-deliveryDate');
  dateInput.min = core.getMinDeliveryDate();
  const timeSelect = byId('nm-pickupTime');
  core.operatingSettings.pickupTimeOptions.forEach((time) => {
    const option = document.createElement('option');
    option.value = time;
    option.textContent = time;
    timeSelect.append(option);
  });

  function selectedQuantity() {
    return product.crew ? Object.values(state.crewQuantities).reduce((sum, quantity) => sum + quantity, 0) : state.quantity;
  }
  function selectedLines() {
    return product.crew
      ? product.crew.filter(([key]) => state.crewQuantities[key] > 0).map(([key, name]) => `${name} ${state.crewQuantities[key]}개`)
      : [];
  }
  function priceText() {
    return product.pricingPending ? '가격 상담 필요' : won(selectedQuantity() * product.unitPrice);
  }
  function quantityText() {
    return product.unit === 'BOX' ? `${selectedQuantity()} BOX` : `${selectedQuantity()}개`;
  }
  function showMessage(id, message) {
    const node = byId(id);
    node.textContent = message;
    node.hidden = !message;
  }
  function renderSelection() {
    if (product.crew) {
      product.crew.forEach(([key]) => {
        root.querySelector(`[data-crew-count="${key}"]`).textContent = state.crewQuantities[key];
      });
    } else byId('nm-order-count').textContent = state.quantity;
    const lines = byId('nm-order-selected-lines');
    lines.replaceChildren();
    selectedLines().forEach((value) => {
      const line = document.createElement('span');
      line.textContent = value;
      lines.append(line);
    });
    lines.hidden = !selectedLines().length;
    byId('nm-order-selected-quantity').textContent = quantityText();
    byId('nm-order-selection-total').textContent = product.pricingPending ? '가격 상담 후 안내' : priceText();
    byId('nm-order-mini-detail').textContent = `${product.crew ? '총 ' : ''}${quantityText()} · ${priceText()}`;
    byId('nm-floating-detail').textContent = `${product.crew ? '총 ' : ''}${quantityText()} · ${product.pricingPending ? '가격 상담' : priceText()}`;
    showMessage('nm-order-selection-error', '');
  }
  function validateSelection() {
    if (selectedQuantity() > 0) return true;
    showMessage('nm-order-selection-error', '쿠키크루 상품을 한 개 이상 선택해 주세요.');
    if (state.step !== 1) setStep(1, { skipValidation: true });
    root.querySelector('[data-crew="captain"][data-delta="1"]').focus();
    return false;
  }
  function validateDetails() {
    ['nm-customerName', 'nm-customerPhone', 'nm-customerEmail', 'nm-deliveryDate', 'nm-pickupTime', 'nm-deliveryAddress'].forEach(core.clearFieldError);
    const fields = [
      ['nm-customerName', !byId('nm-customerName').value.trim(), '이름을 입력해 주세요.'],
      ['nm-customerPhone', !core.validateKoreanPhone(byId('nm-customerPhone').value), '010 형식의 핸드폰 번호를 입력해 주세요.'],
      ['nm-customerEmail', !!byId('nm-customerEmail').value && !byId('nm-customerEmail').checkValidity(), '이메일 주소를 확인해 주세요.'],
      ['nm-deliveryDate', !dateInput.value || dateInput.value < dateInput.min || core.isUnavailableDeliveryDate(dateInput.value), '가능한 수령 희망일을 선택해 주세요.'],
      ['nm-pickupTime', !timeSelect.value, '희망 시간을 선택해 주세요.'],
      ['nm-deliveryAddress', byId('nm-deliveryMethod').value === 'quick' && !byId('nm-deliveryAddress').value.trim(), '퀵 배송 주소를 입력해 주세요.'],
    ];
    const first = fields.find(([, invalid]) => invalid);
    if (!first) return true;
    if (state.step !== 2) setStep(2, { skipValidation: true });
    core.setFieldError(first[0], first[2]);
    core.focusField(first[0]);
    return false;
  }
  function customerValues() {
    return {
      customerName: byId('nm-customerName').value.trim(),
      customerPhone: byId('nm-customerPhone').value.trim(),
      customerEmail: byId('nm-customerEmail').value.trim(),
      deliveryDate: dateInput.value,
      deliveryMethod: byId('nm-deliveryMethod').value,
      pickupTime: timeSelect.value,
      deliveryAddress: byId('nm-deliveryMethod').value === 'quick' ? byId('nm-deliveryAddress').value.trim() : '',
      request: byId('nm-request').value.trim(),
    };
  }
  function appendSummaryTerm(list, label, value) {
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    detail.textContent = value;
    list.append(term, detail);
  }
  function renderConfirmation() {
    const items = byId('nm-order-summary-items');
    items.replaceChildren();
    const selected = product.crew
      ? [...selectedLines(), `총 수량 · ${quantityText()}`]
      : [`${product.name} · ${quantityText()}`, product.tagline, `단가 · ${won(product.unitPrice)}`];
    selected.forEach((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      items.append(item);
    });
    byId('nm-order-confirm-total').textContent = priceText();
    const customer = customerValues();
    const summary = byId('nm-order-customer-summary');
    summary.replaceChildren();
    appendSummaryTerm(summary, '주문자', customer.customerName);
    appendSummaryTerm(summary, '전화번호', customer.customerPhone);
    if (customer.customerEmail) appendSummaryTerm(summary, '이메일', customer.customerEmail);
    appendSummaryTerm(summary, '수령일', customer.deliveryDate);
    appendSummaryTerm(summary, '시간', customer.pickupTime);
    appendSummaryTerm(summary, '수령방법', customer.deliveryMethod === 'quick' ? '퀵 배송' : '매장 픽업');
    if (customer.deliveryAddress) appendSummaryTerm(summary, '주소', customer.deliveryAddress);
    if (customer.request) appendSummaryTerm(summary, '요청사항', customer.request);
  }

  let pushStep = () => {};
  function setStep(next, options = {}) {
    if (state.submitted) return;
    const previous = state.step;
    const target = Math.max(1, Math.min(3, options.fromHistory ? next : Math.min(next, previous + 1)));
    if (!options.skipValidation && target > state.step) {
      if (state.step === 1 && !validateSelection()) return;
      if (state.step === 2 && !validateDetails()) return;
    }
    state.step = target;
    if (target === 3) renderConfirmation();
    root.querySelectorAll('[data-order-step]').forEach((page) => { page.hidden = Number(page.dataset.orderStep) !== target; });
    root.querySelectorAll('[data-step-link]').forEach((button) => {
      const step = Number(button.dataset.stepLink);
      button.classList.toggle('is-active', step === target);
      button.classList.toggle('is-done', step < target);
      if (step === target) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    byId('nm-mobile-count').textContent = `${target} / 3`;
    byId('nm-mobile-title').textContent = stepNames[target - 1];
    byId('nm-mobile-bar').style.width = `${target / 3 * 100}%`;
    byId('nm-floating-progress').style.width = `${target / 3 * 100}%`;
    byId('nm-floating-label').textContent = stepNames[target - 1];
    byId('nm-floating-back').hidden = target === 1;
    byId('nm-floating-next').textContent = target === 3 ? submitLabel : '다음 →';
    if (!options.fromHistory && target !== previous) pushStep(target);
    core.track('order_step_view', { product: source, step: target });
    if (options.scroll !== false) window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  async function submitOrder() {
    if (state.submitting || state.submitted || !validateSelection() || !validateDetails()) return;
    state.submitting = true;
    const buttons = [byId('nm-order-submit'), byId('nm-floating-next')];
    buttons.forEach((button) => { button.disabled = true; button.textContent = '접수 중...'; });
    showMessage('nm-order-submit-error', '');
    try {
      const payload = {
        source,
        ...customerValues(),
        ...(product.crew ? { crewQuantities: { ...state.crewQuantities }, pricingPending: true } : { quantity: state.quantity }),
      };
      await core.postLandingOrder(payload);
      state.submitted = true;
      core.track('submit_success', { product: source, qty: selectedQuantity() });
      root.querySelectorAll('[data-order-step]').forEach((page) => { page.hidden = true; });
      byId('nm-order-success').hidden = false;
      byId('nm-order-floating').hidden = true;
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    } catch (error) {
      showMessage('nm-order-submit-error', error.message || '주문 저장에 실패했어요. 다시 시도해 주세요.');
      core.track('submit_error', { product: source, message: error.message || 'submit failed' });
      state.submitting = false;
      buttons.forEach((button) => { button.disabled = false; button.textContent = submitLabel; });
      byId('nm-order-submit-error').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }
  }
  function nextStep() {
    if (state.step === 3) submitOrder();
    else setStep(state.step + 1);
  }
  root.addEventListener('click', (event) => {
    const qtyButton = event.target.closest('[data-delta]');
    if (qtyButton) {
      const delta = Number(qtyButton.dataset.delta);
      const crewType = qtyButton.dataset.crew;
      if (crewType) state.crewQuantities[crewType] = Math.min(10000, Math.max(0, state.crewQuantities[crewType] + delta));
      else state.quantity = Math.min(10000, Math.max(1, state.quantity + delta));
      renderSelection();
      core.track('option_select', { product: source, qty: selectedQuantity() });
      return;
    }
    const method = event.target.closest('[data-method]');
    if (method) {
      byId('nm-deliveryMethod').value = method.dataset.method;
      root.querySelectorAll('[data-method]').forEach((button) => button.setAttribute('aria-pressed', button === method ? 'true' : 'false'));
      byId('nm-address-row').hidden = method.dataset.method !== 'quick';
      if (method.dataset.method !== 'quick') core.clearFieldError('nm-deliveryAddress');
      return;
    }
    const stepLink = event.target.closest('[data-step-link]');
    if (stepLink) return setStep(Number(stepLink.dataset.stepLink));
    if (event.target.closest('[data-next]')) nextStep();
    if (event.target.closest('[data-prev]')) setStep(state.step - 1);
  });
  byId('nm-floating-back').addEventListener('click', () => setStep(state.step - 1));
  byId('nm-floating-next').addEventListener('click', nextStep);
  byId('nm-order-submit').addEventListener('click', submitOrder);
  renderSelection();
  pushStep = core.setupStepHistory({ getStep: () => state.step, setStep });
  if (state.step === 1) setStep(1, { fromHistory: true, skipValidation: true, scroll: false });
  core.track('order_start', { product: source });
})();
