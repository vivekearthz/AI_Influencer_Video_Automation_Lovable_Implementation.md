// Builds a naive, evenly-timed SRT file from the spoken script when no
// word-level timestamps are available (spec §27). Replace with a real
// forced-alignment/ASR step (e.g. Whisper) for production-grade sync.

function formatTimestamp(seconds: number): string {
  const ms = Math.floor((seconds % 1) * 1000);
  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

export function buildSrtFromScript(spokenScript: string, totalDurationSeconds: number): string {
  const sentences = spokenScript
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (!sentences.length) return "";

  const perSentence = totalDurationSeconds / sentences.length;
  let cursor = 0;
  const blocks: string[] = [];

  sentences.forEach((sentence, index) => {
    const start = cursor;
    const end = Math.min(cursor + perSentence, totalDurationSeconds);
    blocks.push(`${index + 1}\n${formatTimestamp(start)} --> ${formatTimestamp(end)}\n${sentence}\n`);
    cursor = end;
  });

  return blocks.join("\n");
}
