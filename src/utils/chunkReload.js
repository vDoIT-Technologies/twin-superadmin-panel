const RELOAD_KEY = 'superadmin:chunk-reload-at';
const RELOAD_COOLDOWN_MS = 10_000;

const CHUNK_ERROR_PATTERN = /dynamically imported module|Importing a module script failed|Unable to preload CSS/i;

export function isChunkLoadError(error) {
  return CHUNK_ERROR_PATTERN.test(error?.message ?? '');
}

// A deploy replaces the hashed chunks, so tabs opened before it fail on their next lazy route.
// Reload once to pick up the new index.html; the cooldown stops a loop if the chunk is truly missing.
export function installChunkReloadHandler() {
  window.addEventListener('vite:preloadError', () => {
    let lastReload = 0;
    try {
      lastReload = Number(sessionStorage.getItem(RELOAD_KEY)) || 0;
    } catch {
      return;
    }

    if (Date.now() - lastReload < RELOAD_COOLDOWN_MS) return;

    try {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch {
      return;
    }
    window.location.reload();
  });
}
