import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { Card } from "@/components/ui/card";

const Donate = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://www.paypal.com/sdk/js?client-id=sb&components=hosted-buttons&disable-funding=venmo&currency=USD";
    script.async = true;
    script.onload = () => {
      if ((window as any).paypal && containerRef.current) {
        (window as any).paypal.HostedButtons({
          hostedButtonId: "DG88QL8NG87PC",
        }).render(containerRef.current);
      }
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen pb-24 px-5 pt-12 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Heart className="w-6 h-6 text-primary" />
          <span className="text-sm font-semibold tracking-wide text-primary uppercase">Support</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground">Donate</h1>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-6 border border-border">
          <p className="text-card-foreground leading-relaxed mb-6">
            I am an individual who loves to create things that help people. I hope that this app helps you to be more confident in your shopping experience. I spent a lot of time because I wanted to develop something useful. As I said, it is free to use — however, it would be nice if you get value from this, please donate whatever you feel comfortable donating. Thank you.
          </p>
          <div ref={containerRef} id="paypal-container-DG88QL8NG87PC" />
        </Card>
      </motion.div>
    </div>
  );
};

export default Donate;
