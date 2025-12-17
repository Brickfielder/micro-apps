const memoryFallback = new Map();

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('LocalStorage unavailable, using memory fallback', error);
    memoryFallback.set(key, value);
  }
}

export function loadJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('LocalStorage unavailable, using memory fallback', error);
    return memoryFallback.has(key) ? memoryFallback.get(key) : fallback;
  }
}
