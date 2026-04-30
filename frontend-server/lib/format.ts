export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function formatSeconds(value: number) {
  if (value < 60) return `${value}초`;

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  return seconds ? `${minutes}분 ${seconds}초` : `${minutes}분`;
}
