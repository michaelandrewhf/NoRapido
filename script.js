const form = document.querySelector('#loan-form');
const nameInput = document.querySelector('#requester-name');
const amountInput = document.querySelector('#requested-amount');
const termsAcceptanceInput = document.querySelector('#terms-acceptance');
const errorElement = document.querySelector('#form-error');
const submitButton = document.querySelector('#submit-button');
const summaryCard = document.querySelector('.summary-card');
const summaryNoteElement = document.querySelector('#summary-note');

const requestedElement = document.querySelector('#summary-requested');
const rateElement = document.querySelector('#summary-rate');
const interestElement = document.querySelector('#summary-interest');
const totalElement = document.querySelector('#summary-total');

const WHATSAPP_PHONE = '5541998446101';
const MAX_AMOUNT = 100;

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

let previousTotal = 0;

function formatCurrency(value) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

function normalizeAmountValue(value) {
  return String(value)
    .trim()
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
}

function parseRawAmount(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return NaN;
  return Number.parseFloat(normalizeAmountValue(value));
}

function formatAmountInput(value) {
  const amount = clampAmount(parseAmount(value));
  if (!Number.isFinite(amount) || amount <= 0) return '';

  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseAmount(value) {
  return clampAmount(parseRawAmount(value));
}

function clampAmount(value) {
  if (!Number.isFinite(value)) return NaN;
  if (value < 0) return 0;
  if (value > MAX_AMOUNT) return MAX_AMOUNT;
  return Math.round(value * 100) / 100;
}

function getRate(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (amount <= 50) return 0.1;
  if (amount <= 70) return 0.15;
  return 0.2;
}

function getCalculation(amount) {
  const safeAmount = clampAmount(amount);
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    return { requested: 0, rate: 0, interest: 0, total: 0 };
  }

  const rate = getRate(safeAmount);
  const interest = Math.round(safeAmount * rate * 100) / 100;
  const total = Math.round((safeAmount + interest) * 100) / 100;

  return { requested: safeAmount, rate, interest, total };
}

function updateSummary() {
  const amount = parseAmount(amountInput.value);
  const calculation = getCalculation(amount);

  requestedElement.textContent = formatCurrency(calculation.requested);
  rateElement.textContent = `${(calculation.rate * 100).toFixed(0)}%`;
  interestElement.textContent = formatCurrency(calculation.interest);
  totalElement.textContent = formatCurrency(calculation.total);

  const hasValidName = nameInput.value.trim().length >= 2;
  const hasValidAmount = calculation.requested > 0 && calculation.requested <= MAX_AMOUNT;
  const hasAcceptedTerms = termsAcceptanceInput?.checked === true;
  submitButton.disabled = !(hasValidName && hasValidAmount && hasAcceptedTerms);
  submitButton.textContent = hasValidAmount
    ? `Concluir solicitação de ${formatCurrency(calculation.requested)}`
    : 'Concluir solicitação';

  if (summaryCard) {
    summaryCard.classList.toggle('is-active', hasValidAmount);
  }

  if (summaryCard && calculation.total !== previousTotal) {
    summaryCard.classList.remove('is-active');
    window.requestAnimationFrame(() => {
      summaryCard.classList.toggle('is-active', hasValidAmount);
    });
  }

  if (summaryNoteElement) {
    summaryNoteElement.textContent = hasValidAmount
      ? `Você devolverá ${formatCurrency(calculation.total)} com taxa de ${(calculation.rate * 100).toFixed(0)}%.`
      : 'Preencha os campos para visualizar o cálculo automaticamente antes de enviar.';
  }

  previousTotal = calculation.total;

  return calculation;
}

function showError(message = '') {
  errorElement.textContent = message;
}

amountInput.addEventListener('input', () => {
  const rawAmount = parseRawAmount(amountInput.value);

  if (Number.isFinite(rawAmount) && rawAmount > MAX_AMOUNT) {
    amountInput.value = formatAmountInput(MAX_AMOUNT);
    showError('O valor máximo permitido é R$ 100,00.');
  } else {
    showError('');
  }

  updateSummary();
});

amountInput.addEventListener('blur', () => {
  const parsedAmount = parseAmount(amountInput.value);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    amountInput.value = '';
    updateSummary();
    return;
  }

  amountInput.value = formatAmountInput(parsedAmount);
  updateSummary();
});

nameInput.addEventListener('input', () => {
  if (nameInput.value.trim().length >= 2) {
    showError('');
  }

  updateSummary();
});

termsAcceptanceInput?.addEventListener('change', () => {
  if (termsAcceptanceInput.checked) {
    showError('');
  }

  updateSummary();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const requesterName = nameInput.value.trim();
  const amount = parseAmount(amountInput.value);
  const calculation = getCalculation(amount);

  if (requesterName.length < 2) {
    showError('Informe o nome do solicitante.');
    nameInput.focus();
    return;
  }

  if (!Number.isFinite(amount) || calculation.requested <= 0) {
    showError('Informe um valor válido para a solicitação.');
    amountInput.focus();
    return;
  }

  if (calculation.requested > MAX_AMOUNT) {
    showError('O valor máximo permitido é R$ 100,00.');
    amountInput.focus();
    return;
  }

  if (!termsAcceptanceInput?.checked) {
    showError('Você precisa aceitar os termos para concluir a solicitação.');
    termsAcceptanceInput?.focus();
    return;
  }

  showError('');

  const message = [
    'Olá! Segue uma nova solicitação de vale:',
    '',
    `Nome: ${requesterName}`,
    `Valor solicitado: ${formatCurrency(calculation.requested)}`,
    `Taxa aplicada: ${(calculation.rate * 100).toFixed(0)}%`,
    `Juros: ${formatCurrency(calculation.interest)}`,
    `Valor para devolução: ${formatCurrency(calculation.total)}`,
    'Aceite dos termos: Li e aceito os termos da solicitação e o valor total informado para devolução.',
  ].join('\n');

  const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
});

updateSummary();
