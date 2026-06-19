export type LrcLine = { time: number; text: string };

const TS = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

// Parse an LRC string ("[mm:ss.xx] line") into time-sorted lines.
export function parseLrc(lrc: string): LrcLine[] {
  const lines: LrcLine[] = [];
  for (const raw of lrc.split('\n')) {
    const stamps = [...raw.matchAll(TS)];
    if (!stamps.length) continue;
    const text = raw.replace(TS, '').trim();
    for (const s of stamps) {
      const min = parseInt(s[1], 10);
      const sec = parseInt(s[2], 10);
      const frac = s[3] ? parseInt(s[3].padEnd(3, '0').slice(0, 3), 10) : 0;
      lines.push({ time: min * 60 + sec + frac / 1000, text });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

// Index of the active line for the given playback position (seconds).
export function activeLineIndex(lines: LrcLine[], position: number): number {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= position) idx = i;
    else break;
  }
  return idx;
}
