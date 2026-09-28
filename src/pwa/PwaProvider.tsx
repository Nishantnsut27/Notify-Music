import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { CheckCircle, WifiOff, Wifi, RefreshCw } from 'lucide-react';

export function PwaProvider() {
  const wasOffline = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      if (wasOffline.current) {
        toast('Back online', {
          description: 'Your connection has been restored.',
          icon: <Wifi size={18} />,
          duration: 3000,
        });
      }
      wasOffline.current = false;
    };

    const handleOffline = () => {
      wasOffline.current = true;
      toast('No internet connection', {
        description: 'Some features may be unavailable.',
        icon: <WifiOff size={18} />,
        duration: 5000,
      });
    };

    const handleAppInstalled = () => {
      toast('Soundrift installed', {
        description: 'You can now launch it from your home screen.',
        icon: <CheckCircle size={18} />,
        duration: 5000,
      });
    };

    /* clientsClaim hands a first visit its very first controller, which is an
       install rather than an update. Only a page that was already controlled is
       now running older code than its service worker. */
    const hadController = Boolean(navigator.serviceWorker?.controller);
    const handleControllerChange = () => {
      if (!hadController) return;
      toast('Update available', {
        description: 'A new version of Soundrift is ready. Reload to use it.',
        icon: <RefreshCw size={18} />,
        duration: 10000,
        action: { label: 'Reload', onClick: () => window.location.reload() },
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('appinstalled', handleAppInstalled);
    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('appinstalled', handleAppInstalled);
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return null;
}
