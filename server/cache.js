// Lightweight In-Memory RAM Cache for Ultra-Fast API Responses (< 20ms)
// NOTE FOR SCALING: This in-memory JavaScript Map is optimized for single-instance deployments.
// If scaling to multi-node server clusters behind a load balancer, replace this with a shared cache (e.g. Redis).

const cacheStore = new Map();

export const cacheGet = (key) => {
  const item = cacheStore.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return item.value;
};

export const cacheSet = (key, value, ttlSeconds = 30) => {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  cacheStore.set(key, { value, expiresAt });
};

export const cacheClear = () => {
  cacheStore.clear();
};
