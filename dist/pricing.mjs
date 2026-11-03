export function calculateSavings(amount) {
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 100_000_000) {
    throw new RangeError('사용 금액은 0원부터 1억 원까지의 정수여야 합니다.');
  }
  const saved = Math.round(amount * 0.2);
  return { original: amount, discounted: amount - saved, saved, annual: saved * 12 };
}

export function validCreditAmount(amount) {
  return Number.isSafeInteger(amount) && amount >= 10_000 && amount <= 10_000_000 && amount % 1_000 === 0;
}
