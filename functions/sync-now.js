// Runs the stock sync once from this machine (see sync-stock.js for the key file variables).
import { syncStock } from './sync-stock.js';

await syncStock({ dryRun: process.argv.includes('--dry-run') });
