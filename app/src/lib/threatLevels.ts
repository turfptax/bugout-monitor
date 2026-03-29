export function levelColor(level: number): string {
  if (level <= 3) return '#3fb950';
  if (level <= 6) return '#d29922';
  if (level <= 8) return '#f85149';
  return '#ff7b72';
}

export function levelLabel(level: number): string {
  if (level <= 2) return 'Minimal';
  if (level <= 3) return 'Low';
  if (level <= 5) return 'Elevated';
  if (level <= 7) return 'High';
  if (level <= 8) return 'Severe';
  return 'Extreme';
}

export function levelBg(level: number): string {
  if (level <= 3) return 'rgba(63, 185, 80, 0.15)';
  if (level <= 6) return 'rgba(210, 153, 34, 0.15)';
  if (level <= 8) return 'rgba(248, 81, 73, 0.15)';
  return 'rgba(248, 81, 73, 0.25)';
}

export function levelBorder(level: number): string {
  if (level <= 3) return 'rgba(63, 185, 80, 0.3)';
  if (level <= 6) return 'rgba(210, 153, 34, 0.3)';
  if (level <= 8) return 'rgba(248, 81, 73, 0.3)';
  return 'rgba(248, 81, 73, 0.5)';
}

export function kpLevelColor(kp: number): string {
  if (kp < 4) return '#3fb950';
  if (kp < 6) return '#d29922';
  if (kp < 8) return '#f85149';
  return '#ff7b72';
}

export function toneColor(tone: number): string {
  if (tone < -5) return '#f85149';
  if (tone < -3) return '#d29922';
  if (tone > 3) return '#3fb950';
  return '#8b949e';
}
