// Format seconds as m:ss (or h:mm:ss for long tracks).
export function formatTime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 0 || !isFinite(totalSeconds)) return '0:00';
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  const ss = s.toString().padStart(2, '0');
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${ss}`;
  return `${m}:${ss}`;
}
