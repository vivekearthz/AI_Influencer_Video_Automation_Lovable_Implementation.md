// Dummy, non-secret values so `requireEnv()` checks pass in tests -- every
// test injects a fake client/HTTP layer, so these values are never actually
// sent anywhere over the network.
process.env.ANTHROPIC_API_KEY ||= 'test-anthropic-key';
process.env.ELEVENLABS_API_KEY ||= 'test-elevenlabs-key';
process.env.YOUTUBE_CLIENT_ID ||= 'test-client-id';
process.env.YOUTUBE_CLIENT_SECRET ||= 'test-client-secret';
process.env.YOUTUBE_REFRESH_TOKEN ||= 'test-refresh-token';
process.env.BUFFER_ACCESS_TOKEN ||= 'test-buffer-token';
process.env.BUFFER_CHANNEL_IDS ||= 'channel-1,channel-2';
process.env.POSTIZ_API_KEY ||= 'test-postiz-key';
process.env.POSTIZ_INTEGRATION_IDS ||= 'integration-1';
process.env.DATABASE_URL ||= '';
process.env.AUTO_APPROVE ||= 'false';
