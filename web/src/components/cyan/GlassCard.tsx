import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  noPadding?: boolean;
  onClick?: () => void;
}

export function GlassCard({ 
  children, 
  className = "", 
  glowColor = "cyan",
  noPadding = false,
  onClick
}: GlassCardProps) {
  const glowClass = glowColor === "cyan" 
    ? "shadow-[0_0_20px_rgba(0,255,255,0.15)]" 
    : glowColor === "purple"
    ? "shadow-[0_0_20px_rgba(168,85,247,0.15)]"
    : "";

  return (
    <div 
      onClick={onClick}
      className={`
        relative rounded-2xl
        bg-[#1A1A1A]/80 
        backdrop-blur-xl 
        border border-[#00FFFF]/20
        ${glowClass}
        ${noPadding ? '' : 'p-6'}
        ${className}
        ${onClick ? 'cursor-pointer hover:border-[#00FFFF]/40 transition-all' : ''}
      `}
      style={{
        boxShadow: `
          0 0 20px rgba(0, 255, 255, 0.1),
          0 8px 32px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.05)
        `
      }}
    >
      {children}
    </div>
  );
}
