import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { Card } from "@/components/ui/card";

const Donate = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Check if script already loaded
    const existingScript = document.querySelector(
      'script[src*="paypal.com/sdk/js"][data-hosted-buttons]'
    );

    const renderButton = () => {
      if ((window as any).paypal?.HostedButtons && containerRef.current) {
        containerRef.current.innerHTML = "";
        (window as any).paypal
          .HostedButtons({
            hostedButtonId: "L3J2VLJ37LJVW",
          })
          .render(containerRef.current)
          .then(() => setLoading(false))
          .catch(() => {
            setLoading(false);
            setError(true);
          });
      }
    };

    if (existingScript && (window as any).paypal?.HostedButtons) {
      renderButton();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://www.paypal.com/sdk/js?client-id=BAABPm33q4ECE8dAsykEDtcFFU-x_XO2EdmKDQJkKQEJ_T-nsoN-AyampB83JpeDr6Vh5xHL7v3xr47UXE&components=hosted-buttons&enable-funding=venmo&currency=USD";
    script.setAttribute("data-hosted-buttons", "true");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = renderButton;
    script.onerror = () => {
      setLoading(false);
      setError(true);
    };
    document.head.appendChild(script);

    return () => {
      // Don't remove the script on unmount to avoid reloading issues
    };
  }, []);

  return (
    <div className="min-h-screen pb-24 px-5 pt-12 max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-1">
          <Heart className="w-6 h-6 text-primary" />
          <span className="text-sm font-semibold tracking-wide text-primary uppercase">
            Support
          </span>
        </div>
        <h1 className="text-3xl font-bold text-foreground">Donate</h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6 border border-border">
          <p className="text-card-foreground leading-relaxed mb-6">
            I am an individual who loves to create things that help people. I
            hope that this app helps you to be more confident in your shopping
            experience. I spent a lot of time because I wanted to develop
            something useful. As I said, it is free to use — however, it would
            be nice if you get value from this, please donate whatever you feel
            comfortable donating. Thank you.
          </p>

          {loading && !error && (
            <p className="text-sm text-muted-foreground">Loading PayPal…</p>
          )}
          {error && (
            <p className="text-sm text-destructive">
              PayPal failed to load. Please disable ad-blockers or try again
              later.
            </p>
          )}
          <div ref={containerRef} id="paypal-container-L3J2VLJ37LJVW" />
        </Card>
      </motion.div>
    </div>
  );
};

export default Donate;
