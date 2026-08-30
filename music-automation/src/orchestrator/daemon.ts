import cron from 'node-cron';
import { logger } from '../lib/logger.js';
import { runOnce } from './run-once.js';

/**
 * Always-on variant for self-hosting on a VM you keep running 24/7 (e.g.
 * the Oracle Cloud Always Free ARM instance in README "Free, self-hosted
 * alternative"). Not used by the default GitHub Actions workflow -- that
 * one calls run-once.ts directly on a schedule instead, which is the
 * cheaper and more robust fit for a serverless/ephemeral host. Use this
 * daemon only if you specifically want a long-lived process (e.g. running
 * next to a self-hosted Postiz instance on the same box).
 */
const CRON_EXPRESSION = process.env.PIPELINE_CRON ?? '0 * * * *'; // hourly by default

logger.info('starting music-automation daemon', { cron: CRON_EXPRESSION });

cron.schedule(CRON_EXPRESSION, () => {
  runOnce().catch((err) => logger.error('scheduled run-once failed', { error: String(err) }));
});

// Also run once immediately on boot so a freshly-deployed VM doesn't sit
// idle until the first cron tick.
runOnce().catch((err) => logger.error('initial run-once failed', { error: String(err) }));
