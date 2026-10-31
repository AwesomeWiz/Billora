import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function NetworkNotice() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return offline ? <div className="network-notice" role="status"><WifiOff size={17} aria-hidden="true" />You’re offline. Reconnect before submitting changes.</div> : null;
}
