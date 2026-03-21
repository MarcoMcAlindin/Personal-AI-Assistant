import { Outlet } from "react-router";
import { useState, useEffect } from "react";
import { AIFloatingBubble } from "./AIFloatingBubble";

export function Root() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] via-[#0D0D12] to-[#10101A]">
      <Outlet context={{ isMobile }} />
      <AIFloatingBubble />
    </div>
  );
}