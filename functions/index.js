import { onSchedule } from 'firebase-functions/v2/scheduler';
import { syncStock } from './sync-stock.js';

// Every 30 minutes, 07:07–22:37 Skopje time: copies out-of-stock status from the shop app to the kiosk.
// Runs as stock-sync@perfume-filtering-app (read/write on the kiosk database, read-only on maison-loyalty).
export const stockSync = onSchedule(
  {
    schedule: '7,37 7-22 * * *',
    timeZone: 'Europe/Skopje',
    region: 'europe-west1',
    serviceAccount: 'stock-sync@perfume-filtering-app.iam.gserviceaccount.com',
    memory: '256MiB',
    timeoutSeconds: 120,
    retryCount: 0,
  },
  () => syncStock(),
);
