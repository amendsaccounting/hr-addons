type Listener = () => void;

const logoutListeners: Listener[] = [];

export function addLogoutListener(fn: Listener): () => void {
  logoutListeners.push(fn);
  return () => {
    const idx = logoutListeners.indexOf(fn);
    if (idx >= 0) logoutListeners.splice(idx, 1);
  };
}

export function requestLogout(): void {
  try {
    console.log('[session] requestLogout broadcast to', logoutListeners.length, 'listener(s)');
  } catch {}
  logoutListeners.slice().forEach((fn) => {
    try { fn(); } catch {}
  });
}

