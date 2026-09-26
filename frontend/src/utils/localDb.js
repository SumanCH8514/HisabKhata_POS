const DB_NAME = 'hisabkhata_pos_local_db';
const DB_VERSION = 1;

let dbPromise = null;

export const openLocalDb = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains('items')) {
        const itemStore = db.createObjectStore('items', { keyPath: 'id' });
        itemStore.createIndex('name', 'name', { unique: false });
        itemStore.createIndex('barcode', 'barcode', { unique: false });
      }

      if (!db.objectStoreNames.contains('parties')) {
        const partyStore = db.createObjectStore('parties', { keyPath: 'id' });
        partyStore.createIndex('name', 'name', { unique: false });
        partyStore.createIndex('phone', 'phone', { unique: false });
        partyStore.createIndex('type', 'type', { unique: false });
      }

      if (!db.objectStoreNames.contains('invoices')) {
        const invoiceStore = db.createObjectStore('invoices', { keyPath: 'client_uuid' });
        invoiceStore.createIndex('invoice_number', 'invoice_number', { unique: false });
        invoiceStore.createIndex('date', 'date', { unique: false });
        invoiceStore.createIndex('synced', 'synced', { unique: false });
      }

      if (!db.objectStoreNames.contains('sync_queue')) {
        const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('status', 'status', { unique: false });
        queueStore.createIndex('created_at', 'created_at', { unique: false });
      }

      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    request.onsuccess = (e) => {
      resolve(e.target.result);
    };

    request.onerror = (e) => {
      reject(e.target.error);
    };
  });
  return dbPromise;
};

export const requestPersistentStorage = async () => {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      return isPersisted;
    }
  } catch {}
  return false;
};

export const generateClientUuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'uuid-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
};

export const getTerminalId = () => {
  try {
    let tid = localStorage.getItem('hk_pos_terminal_id');
    if (!tid) {
      tid = 'C' + Math.floor(100 + Math.random() * 900);
      localStorage.setItem('hk_pos_terminal_id', tid);
    }
    return tid;
  } catch {
    return 'C1';
  }
};

export const getNextOfflineInvoiceNumber = async () => {
  const tid = getTerminalId();
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = now.getMonth() + 1;
  const fy = month >= 4 ? `${year}${Number(year) + 1}` : `${Number(year) - 1}${year}`;

  let seq = 1;
  try {
    const rawSeq = localStorage.getItem(`hk_offline_seq_${fy}_${tid}`);
    if (rawSeq) seq = parseInt(rawSeq, 10) + 1;
    localStorage.setItem(`hk_offline_seq_${fy}_${tid}`, String(seq));
  } catch {
    seq = Date.now().toString().slice(-4);
  }

  const paddedSeq = String(seq).padStart(4, '0');
  return `OFF-${fy}-${tid}-${paddedSeq}`;
};

export const saveLocalItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) return;
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['items'], 'readwrite');
    const store = tx.objectStore('items');
    for (const item of items) {
      if (item && item.id) {
        store.put(item);
      }
    }
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
};

export const getLocalItems = async () => {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['items'], 'readonly');
    const store = tx.objectStore('items');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
};

export const saveLocalParties = async (parties) => {
  if (!Array.isArray(parties) || parties.length === 0) return;
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['parties'], 'readwrite');
    const store = tx.objectStore('parties');
    for (const party of parties) {
      if (party && party.id) {
        store.put(party);
      }
    }
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
};

export const getLocalParties = async (type = null) => {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['parties'], 'readonly');
    const store = tx.objectStore('parties');
    const req = store.getAll();
    req.onsuccess = () => {
      let results = req.result || [];
      if (type && type !== 'ALL') {
        results = results.filter(p => p.type === type);
      }
      resolve(results);
    };
    req.onerror = (e) => reject(e.target.error);
  });
};

export const saveLocalInvoice = async (invoiceData) => {
  const db = await openLocalDb();
  const client_uuid = invoiceData.client_uuid || generateClientUuid();
  const fullInvoice = {
    ...invoiceData,
    client_uuid,
    synced: false,
    created_at: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['invoices', 'sync_queue', 'items'], 'readwrite');
    const invoiceStore = tx.objectStore('invoices');
    const queueStore = tx.objectStore('sync_queue');
    const itemStore = tx.objectStore('items');

    invoiceStore.put(fullInvoice);

    queueStore.add({
      type: 'CREATE_INVOICE',
      client_uuid,
      payload: fullInvoice,
      created_at: Date.now(),
      status: 'pending'
    });

    if (Array.isArray(invoiceData.items)) {
      for (const line of invoiceData.items) {
        if (line.item_id) {
          const itemReq = itemStore.get(line.item_id);
          itemReq.onsuccess = () => {
            const itemRecord = itemReq.result;
            if (itemRecord) {
              itemRecord.current_stock = (Number(itemRecord.current_stock) || 0) - (Number(line.quantity) || 1);
              itemStore.put(itemRecord);
            }
          };
        }
      }
    }

    tx.oncomplete = () => resolve(fullInvoice);
    tx.onerror = (e) => reject(e.target.error);
  });
};

export const getPendingSyncQueue = async () => {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['sync_queue'], 'readonly');
    const store = tx.objectStore('sync_queue');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
};

export const removeSyncQueueItem = async (id) => {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['sync_queue'], 'readwrite');
    const store = tx.objectStore('sync_queue');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
};

export const markInvoiceSynced = async (client_uuid, serverInvoiceId) => {
  const db = await openLocalDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['invoices'], 'readwrite');
    const store = tx.objectStore('invoices');
    const req = store.get(client_uuid);
    req.onsuccess = () => {
      const inv = req.result;
      if (inv) {
        inv.synced = true;
        inv.server_invoice_id = serverInvoiceId;
        store.put(inv);
      }
      resolve();
    };
    req.onerror = (e) => reject(e.target.error);
  });
};

export const getSyncStats = async () => {
  try {
    const db = await openLocalDb();
    return new Promise((resolve) => {
      const tx = db.transaction(['sync_queue'], 'readonly');
      const store = tx.objectStore('sync_queue');
      const countReq = store.count();
      countReq.onsuccess = () => resolve({ pendingCount: countReq.result || 0 });
      countReq.onerror = () => resolve({ pendingCount: 0 });
    });
  } catch {
    return { pendingCount: 0 };
  }
};
