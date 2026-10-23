// Config-gated Google sign-in. Renders nothing unless the backend reports
// GOOGLE_CLIENT_ID configured (/api/auth/config), then loads Google Identity
// Services and posts the verified credential to /api/auth/google.
import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';

export function useAuthConfig() {
  const [cfg, setCfg] = useState({ googleEnabled: false, paymentsEnabled: false });
  useEffect(() => { api('/auth/config').then(setCfg).catch(() => {}); }, []);
  return cfg;
}

export function GoogleButton({ onCredential, onError }) {
  const ref = useRef(null);
  const cfg = useAuthConfig();
  useEffect(() => {
    if (!cfg.googleEnabled || !ref.current) return;
    const clientId = document.querySelector('meta[name="google-client-id"]')?.content;
    const render = () => {
      if (!window.google?.accounts?.id || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp) => onCredential(resp.credential).catch((e) => onError?.(e.message)),
      });
      window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', width: 320 });
    };
    if (window.google?.accounts?.id) return render();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = render;
    document.head.appendChild(s);
  }, [cfg.googleEnabled]);
  if (!cfg.googleEnabled) return null;
  return <div ref={ref} style={{ margin: '12px 0' }} />;
}
