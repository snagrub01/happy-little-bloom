import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

const PWAUpdatePrompt = () => {
  const hasShownToast = useRef(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Check for updates every 30 minutes
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 30 * 60 * 1000);
      }
    },
  });

  useEffect(() => {
    if (needRefresh && !hasShownToast.current) {
      hasShownToast.current = true;
      toast("New version available!", {
        description: "Tap to update to the latest version of Bag Au Pair.",
        duration: Infinity,
        action: {
          label: "Update",
          onClick: () => updateServiceWorker(true),
        },
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
};

export default PWAUpdatePrompt;
