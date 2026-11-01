import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Extend window object for Echo / Pusher
declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: Echo<any> | null;
  }
}

let echoInstance: Echo<any> | null = null;

export const getEcho = (): Echo<any> | null => {
  if (typeof window === 'undefined') return null;

  if (!echoInstance) {
    window.Pusher = Pusher;

    const host = process.env.NEXT_PUBLIC_REVERB_HOST || window.location.hostname || 'localhost';
    const port = Number(process.env.NEXT_PUBLIC_REVERB_PORT || 8080);
    const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY || '6aqrzhgz80dn2aztwhaj';
    const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME || 'http';

    echoInstance = new Echo({
      broadcaster: 'reverb',
      key: key,
      wsHost: host,
      wsPort: port,
      wssPort: port,
      forceTLS: scheme === 'https',
      enabledTransports: ['ws', 'wss'],
    });

    window.Echo = echoInstance;
  }

  return echoInstance;
};
