const memoryStore = new Map();

const getStorageKey = (key) => `hk_cache_${key}`;

export const getCachedData = (key) => {
  const mem = memoryStore.get(key);
  const now = Date.now();
  if (mem && mem.expiry > now) {
    return mem.data;
  }

  try {
    const raw = sessionStorage.getItem(getStorageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.expiry > now) {
      memoryStore.set(key, parsed);
      return parsed.data;
    }
    sessionStorage.removeItem(getStorageKey(key));
  } catch {
    return null;
  }
  return null;
};

export const setCachedData = (key, data, ttlMs = 300000) => {
  const expiry = Date.now() + ttlMs;
  const payload = { data, expiry };
  memoryStore.set(key, payload);
  try {
    sessionStorage.setItem(getStorageKey(key), JSON.stringify(payload));
  } catch {}
};

export const invalidateCache = (keyOrPrefix) => {
  for (const k of memoryStore.keys()) {
    if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) {
      memoryStore.delete(k);
      try {
        sessionStorage.removeItem(getStorageKey(k));
      } catch {}
    }
  }
  try {
    const prefix = getStorageKey(keyOrPrefix);
    const toRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const storageKey = sessionStorage.key(i);
      if (storageKey && (storageKey === prefix || storageKey.startsWith(prefix))) {
        toRemove.push(storageKey);
      }
    }
    toRemove.forEach(k => sessionStorage.removeItem(k));
  } catch {}
};

export const prependCachedItem = (companyId, item) => {
  if (!item) return;
  const key = `items_${companyId || 'default'}`;
  const current = getCachedData(key);
  if (Array.isArray(current)) {
    const filtered = current.filter(i => i.id !== item.id);
    const updated = [item, ...filtered];
    setCachedData(key, updated, 300000);
  }
};

export const updateCachedItem = (companyId, id, updatedData) => {
  const key = `items_${companyId || 'default'}`;
  const current = getCachedData(key);
  if (Array.isArray(current)) {
    const updated = current.map(i => i.id === id ? { ...i, ...updatedData } : i);
    setCachedData(key, updated, 300000);
  }
};

export const removeCachedItem = (companyId, id) => {
  const key = `items_${companyId || 'default'}`;
  const current = getCachedData(key);
  if (Array.isArray(current)) {
    const updated = current.filter(i => i.id !== id);
    setCachedData(key, updated, 300000);
  }
};

export const swrFetch = async (key, fetcher, { ttl = 300000, onBackgroundUpdate } = {}) => {
  const cached = getCachedData(key);
  if (cached !== null) {
    if (onBackgroundUpdate) {
      (async () => {
        try {
          const fresh = await fetcher();
          if (JSON.stringify(fresh) !== JSON.stringify(cached)) {
            setCachedData(key, fresh, ttl);
            onBackgroundUpdate(fresh);
          }
        } catch {}
      })();
    }
    return cached;
  }

  const fresh = await fetcher();
  setCachedData(key, fresh, ttl);
  return fresh;
};
