import { env } from '../../config/env.js';
import { BufferPublisher } from './buffer-publisher.js';
import { PostizPublisher } from './postiz-publisher.js';
import type { SocialPublisher } from './types.js';

export function createSocialPublisher(): SocialPublisher | null {
  switch (env.SOCIAL_PUBLISHER) {
    case 'buffer':
      return new BufferPublisher();
    case 'postiz':
      return new PostizPublisher();
    case 'none':
    default:
      return null;
  }
}

export * from './types.js';
