import { describe, expect, it, vi } from 'vitest';
import { publishToYoutube, type YoutubeClient } from '../src/pipeline/4-publish-youtube.js';
import { BufferPublisher, type HttpClient as BufferHttp } from '../src/pipeline/social-publishers/buffer-publisher.js';
import { PostizPublisher, type HttpClient as PostizHttp } from '../src/pipeline/social-publishers/postiz-publisher.js';
import { publishToSoundcloud, SoundCloudPublisher } from '../src/pipeline/4-publish-soundcloud.js';
import { notifyForReview } from '../src/pipeline/5-notify-review.js';

describe('publishToYoutube', () => {
  it('delegates to the injected client and reports zero marginal cost', async () => {
    const fakeClient: YoutubeClient = { uploadVideo: async () => 'yt-abc123' };
    const result = await publishToYoutube('/tmp/video.mp4', 'Dare to Build', 'desc', fakeClient);
    expect(result.videoId).toBe('yt-abc123');
    expect(result.costCents).toBe(0);
  });
});

describe('BufferPublisher', () => {
  it('creates one post per configured channel via the GraphQL API', async () => {
    const calls: unknown[] = [];
    const fakeHttp: BufferHttp = {
      fetch: async (url, init) => {
        calls.push(JSON.parse(init.body as string));
        return new Response(
          JSON.stringify({ data: { createPost: { post: { id: 'post-' + calls.length } } } }),
          { status: 200 }
        );
      },
    };

    const publisher = new BufferPublisher('token-123', ['chan-a', 'chan-b'], fakeHttp);
    const result = await publisher.publish('https://youtu.be/xyz', 'caption text');

    expect(result.postIds).toEqual(['post-1', 'post-2']);
    expect(calls).toHaveLength(2);
  });

  it('surfaces a MutationError from Buffer as a thrown error', async () => {
    const fakeHttp: BufferHttp = {
      fetch: async () =>
        new Response(JSON.stringify({ data: { createPost: { message: 'channel not connected' } } }), {
          status: 200,
        }),
    };
    const publisher = new BufferPublisher('token-123', ['chan-a'], fakeHttp);
    await expect(publisher.publish('https://youtu.be/xyz', 'caption')).rejects.toThrow(/channel not connected/);
  });

  it('refuses to run with no configured channels', async () => {
    const publisher = new BufferPublisher('token-123', [], { fetch: vi.fn() as any });
    await expect(publisher.publish('url', 'caption')).rejects.toThrow(/BUFFER_CHANNEL_IDS/);
  });
});

describe('PostizPublisher', () => {
  it('publishes to every configured integration in one call', async () => {
    let capturedBody: any = null;
    const fakeHttp: PostizHttp = {
      fetch: async (_url, init) => {
        capturedBody = JSON.parse(init.body as string);
        return new Response(JSON.stringify({ postIds: ['p1', 'p2'] }), { status: 200 });
      },
    };
    const publisher = new PostizPublisher('http://localhost:5000', 'key', ['i1', 'i2'], fakeHttp);
    const result = await publisher.publish('https://youtu.be/xyz', 'caption');

    expect(result.postIds).toEqual(['p1', 'p2']);
    expect(capturedBody.posts).toHaveLength(2);
  });
});

describe('publishToSoundcloud', () => {
  it('is a no-op returning null when SOUNDCLOUD_ENABLED is false (default)', async () => {
    const trackId = await publishToSoundcloud('/tmp/song.mp3', 'title', 'desc');
    expect(trackId).toBeNull();
  });
});

describe('SoundCloudPublisher', () => {
  it('uploads via multipart form data when enabled with valid credentials', async () => {
    const fakeHttp = {
      fetch: vi.fn(async (_url: string, init: RequestInit) => {
        expect(init.headers).toMatchObject({ Authorization: 'OAuth token-xyz' });
        return new Response(JSON.stringify({ id: 999 }), { status: 201 });
      }),
    };
    const client = new SoundCloudPublisher('client-id', 'token-xyz', fakeHttp);

    // Use this test file itself as a stand-in "audio" file -- only the byte
    // stream matters for exercising the multipart request path.
    const trackId = await client.uploadTrack(new URL(import.meta.url).pathname, 'title', 'desc');
    expect(trackId).toBe('999');
    expect(fakeHttp.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('notifyForReview', () => {
  it('makes no network calls when Slack/email/WhatsApp are all unconfigured (the test default)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await notifyForReview('song-1', 'title', '/tmp/v.mp4', 'org/repo');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
