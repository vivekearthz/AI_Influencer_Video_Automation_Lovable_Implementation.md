import { db } from './db/client.js';
import { logger } from './lib/logger.js';

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const repo = db();

  switch (command) {
    case 'seed': {
      const theme = args.join(' ');
      if (!theme) throw new Error('usage: npm run cli -- seed "<theme>"');
      const song = await repo.create(theme);
      console.log(`created song ${song.id} for theme "${theme}"`);
      break;
    }

    case 'status': {
      const songs = await repo.all();
      for (const s of songs) {
        console.log(`${s.id}  ${s.status.padEnd(16)}  ${s.sourceTheme}  ($${(s.costCentsSpent / 100).toFixed(2)})`);
      }
      if (songs.length === 0) console.log('no songs yet');
      break;
    }

    case 'approve': {
      const [id] = args;
      if (!id) throw new Error('usage: npm run cli -- approve <songId>');
      const song = await repo.findById(id);
      if (!song) throw new Error(`song ${id} not found`);
      if (song.status !== 'pending_review') {
        throw new Error(`song ${id} is in status "${song.status}", not "pending_review" -- refusing to approve`);
      }
      await repo.update(id, { status: 'approved' });
      console.log(`approved ${id} -- it will publish on the next scheduled run`);
      break;
    }

    case 'reject': {
      const [id, ...reasonParts] = args;
      if (!id) throw new Error('usage: npm run cli -- reject <songId> [reason]');
      const song = await repo.findById(id);
      if (!song) throw new Error(`song ${id} not found`);
      await repo.update(id, { status: 'failed', reviewNotes: reasonParts.join(' ') || 'rejected in review' });
      console.log(`rejected ${id}`);
      break;
    }

    default:
      console.log(
        [
          'usage:',
          '  npm run cli -- seed "<theme>"',
          '  npm run cli -- status',
          '  npm run cli -- approve <songId>',
          '  npm run cli -- reject <songId> [reason]',
        ].join('\n')
      );
  }

  await repo.close();
}

main().catch((err) => {
  logger.error('cli command failed', { error: String(err) });
  process.exitCode = 1;
});
