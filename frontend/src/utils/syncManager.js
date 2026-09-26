import { getPendingSyncQueue, removeSyncQueueItem, markInvoiceSynced, getSyncStats, requestPersistentStorage } from './localDb.js';
import { createInvoice, sendInvoiceReceipt } from '../api/client.js';

let isSyncing = false;
let isOnlineState = typeof navigator !== 'undefined' ? navigator.onLine : true;
const listeners = new Set();

export const getOnlineStatus = () => isOnlineState;

const notifyListeners = (stats) => {
  for (const fn of listeners) {
    try {
      fn({ isOnline: isOnlineState, isSyncing, ...stats });
    } catch {}
  }
};

export const onSyncStatusChange = (fn) => {
  listeners.add(fn);
  getSyncStats().then(stats => fn({ isOnline: isOnlineState, isSyncing, ...stats }));
  return () => listeners.delete(fn);
};

export const processSyncQueue = async () => {
  if (isSyncing || !isOnlineState) return;
  isSyncing = true;
  notifyListeners(await getSyncStats());

  try {
    const queue = await getPendingSyncQueue();
    for (const item of queue) {
      if (!isOnlineState) break;

      if (item.type === 'CREATE_INVOICE' && item.payload) {
        try {
          const res = await createInvoice({
            ...item.payload,
            client_uuid: item.client_uuid
          });

          if (res?.invoice_id || res?.already_existed) {
            const serverId = res.invoice_id;
            await markInvoiceSynced(item.client_uuid, serverId);
            await removeSyncQueueItem(item.id);

            const emailTarget = item.payload.customer_email || item.payload.recipient_email;
            if (emailTarget && serverId && !res.email_sent) {
              sendInvoiceReceipt(serverId, { recipient_email: emailTarget }).catch(() => {});
            }
          }
        } catch (err) {
          if (err?.status >= 400 && err?.status < 500 && err?.status !== 408) {
            await removeSyncQueueItem(item.id);
          }
        }
      }
    }
  } catch {}

  isSyncing = false;
  notifyListeners(await getSyncStats());
};

export const initSyncManager = () => {
  if (typeof window === 'undefined') return;

  requestPersistentStorage();

  const handleOnline = () => {
    isOnlineState = true;
    processSyncQueue();
  };

  const handleOffline = () => {
    isOnlineState = false;
    getSyncStats().then(stats => notifyListeners(stats));
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  window.addEventListener('beforeunload', (e) => {
    getSyncStats().then(({ pendingCount }) => {
      if (pendingCount > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsynced offline invoices. Leaving may cause delays in syncing.';
      }
    });
  });

  const interval = setInterval(() => {
    if (navigator.onLine) {
      isOnlineState = true;
      processSyncQueue();
    } else {
      isOnlineState = false;
    }
  }, 25000);

  getSyncStats().then(stats => notifyListeners(stats));

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    clearInterval(interval);
  };
};
