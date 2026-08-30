import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AceStepMusicProvider,
  parseGradioSseForAudio,
  type HttpClient,
} from '../src/pipeline/music-providers/acestep-provider.js';
import type { Lyrics } from '../src/db/types.js';

const lyrics: Lyrics = {
  title: 'Dare to Build',
  genre: 'indie folk-pop',
  mood: 'hopeful',
  structure: [
    { section: 'verse', lines: ['line one', 'line two'] },
    { section: 'chorus', lines: ['line three', 'line four'] },
  ],
  tags: ['startup', 'founder'],
};

// A real "event: complete" SSE block captured from a live, successful
// generation against the public ACE-Step Space on 2026-08-30 (see
// acestep-provider.ts for the full verification note).
const REAL_COMPLETE_SSE =
  'event: complete\n' +
  'data: [{"path": "/tmp/gradio/abc/output.mp3", ' +
  '"url": "https://ace-step-ace-step.hf.space/gradio_api/file=/tmp/gradio/abc/output.mp3", ' +
  '"size": null, "orig_name": "output.mp3", "mime_type": null, "is_stream": false, ' +
  '"meta": {"_type": "gradio.FileData"}}, {"task": "text2music"}]\n\n';

describe('parseGradioSseForAudio', () => {
  it('extracts the audio FileData from a real captured complete event', () => {
    const file = parseGradioSseForAudio(REAL_COMPLETE_SSE);
    expect(file.url).toBe('https://ace-step-ace-step.hf.space/gradio_api/file=/tmp/gradio/abc/output.mp3');
  });

  it('picks the last complete event when there were earlier heartbeat/progress events', () => {
    const stream = 'event: heartbeat\ndata: {}\n\n' + REAL_COMPLETE_SSE;
    const file = parseGradioSseForAudio(stream);
    expect(file.orig_name).toBe('output.mp3');
  });

  it('throws with the server message on an error event', () => {
    const stream = 'event: error\ndata: "GPU quota exceeded"\n\n';
    expect(() => parseGradioSseForAudio(stream)).toThrow(/GPU quota exceeded/);
  });

  it('throws a clear error if the stream never completes', () => {
    expect(() => parseGradioSseForAudio('event: heartbeat\ndata: {}\n\n')).toThrow(/without a complete/);
  });
});

describe('AceStepMusicProvider', () => {
  it('submits the exact 22-parameter payload verified against the live Space, then downloads the result', async () => {
    let submittedBody: any = null;
    const fakeHttp: HttpClient = {
      fetch: async (url, init) => {
        if (url.endsWith('/gradio_api/call/__call__')) {
          submittedBody = JSON.parse(init.body as string);
          return new Response(JSON.stringify({ event_id: 'evt-123' }), { status: 200 });
        }
        if (url.includes('/gradio_api/call/__call__/evt-123')) {
          return new Response(REAL_COMPLETE_SSE, { status: 200 });
        }
        if (url.includes('gradio_api/file=')) {
          return new Response(new Uint8Array([1, 2, 3, 4]).buffer, { status: 200 });
        }
        throw new Error(`unexpected fetch: ${url}`);
      },
    };

    const provider = new AceStepMusicProvider('https://ace-step-ace-step.hf.space', '', fakeHttp);
    const dir = mkdtempSync(join(tmpdir(), 'music-automation-'));
    const outputPath = join(dir, 'song.mp3');

    const result = await provider.generateSong(lyrics, outputPath);

    expect(result.audioPath).toBe(outputPath);
    expect(result.costCents).toBe(0); // free
    expect(readFileSync(outputPath)).toEqual(Buffer.from([1, 2, 3, 4]));

    expect(submittedBody.data).toHaveLength(22);
    expect(submittedBody.data[1]).toContain('indie folk-pop'); // Tags
    expect(submittedBody.data[2]).toContain('[verse]'); // Lyrics
    expect(submittedBody.data[2]).toContain('line three');
  });

  it('surfaces the server error when job submission fails', async () => {
    const fakeHttp: HttpClient = { fetch: async () => new Response('busy', { status: 503 }) };
    const provider = new AceStepMusicProvider('https://ace-step-ace-step.hf.space', '', fakeHttp);
    await expect(provider.generateSong(lyrics, '/tmp/x.mp3')).rejects.toThrow(/503/);
  });
});
