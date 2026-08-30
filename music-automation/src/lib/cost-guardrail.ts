import type { SongsRepository } from '../db/types.js';
import { env } from '../config/env.js';

/**
 * Mirrors the cost-ledger / spend-cap pattern already used elsewhere in this
 * account's repos (see the main AI Video Studio's "cost guardrails + kill
 * switch"). Keeps a runaway loop of API calls from producing a surprise
 * bill when running fully unattended.
 */
export class MonthlyCostExceededError extends Error {
  constructor(spentCents: number, capCents: number) {
    super(
      `Monthly cost cap reached: $${(spentCents / 100).toFixed(2)} spent of a ` +
        `$${(capCents / 100).toFixed(2)} cap (MAX_MONTHLY_COST_CENTS). Pausing new ` +
        `generation until next month or until the cap is raised.`
    );
    this.name = 'MonthlyCostExceededError';
  }
}

export async function assertUnderMonthlyCostCap(repo: SongsRepository): Promise<void> {
  const spent = await repo.monthlyCostCents();
  if (spent >= env.MAX_MONTHLY_COST_CENTS) {
    throw new MonthlyCostExceededError(spent, env.MAX_MONTHLY_COST_CENTS);
  }
}

/** Rough per-call cost estimates in cents, for the ledger only (not billing-accurate). */
export const ESTIMATED_COST_CENTS = {
  lyricsGeneration: 1,
  musicGeneration: 40,
  videoRender: 0,
  youtubePublish: 0,
  socialPublish: 0,
};
