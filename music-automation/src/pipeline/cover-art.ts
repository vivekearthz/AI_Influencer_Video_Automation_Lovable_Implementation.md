import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { env } from '../config/env.js';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Generates a simple, branded 1080x1080 cover image (gradient background +
 * title overlay) with no external image-generation API call -- keeps this
 * stage at $0 marginal cost regardless of how many songs run per month.
 */
export async function generateCoverArt(title: string, subtitle: string, outputPath: string): Promise<string> {
  await mkdir(dirname(outputPath), { recursive: true });

  const titleLines = wrapText(title, 18);
  const titleTspans = titleLines
    .map((line, i) => `<tspan x="540" dy="${i === 0 ? 0 : 64}">${escapeXml(line)}</tspan>`)
    .join('');

  const svg = `
<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${env.COVER_BACKGROUND_COLOR_FROM}" />
      <stop offset="100%" stop-color="${env.COVER_BACKGROUND_COLOR_TO}" />
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)" />
  <text x="540" y="460" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="56" font-weight="700" fill="${env.COVER_TITLE_FONT_COLOR}">${titleTspans}</text>
  <text x="540" y="620" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="28" fill="${env.COVER_TITLE_FONT_COLOR}" opacity="0.75">${escapeXml(subtitle)}</text>
  <text x="540" y="980" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="22" fill="${env.COVER_TITLE_FONT_COLOR}" opacity="0.5">InnoVexis Consulting</text>
</svg>`.trim();

  await sharp(Buffer.from(svg)).png().toFile(outputPath);
  return outputPath;
}
