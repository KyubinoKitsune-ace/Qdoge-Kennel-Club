import { cn } from "@/utils/base.utils";
import type { ComponentPropsWithoutRef } from "react";

type LogoProps = ComponentPropsWithoutRef<"svg">;

const Logo = ({ className, ...props }: LogoProps) => (
  <svg
    viewBox="0 0 360 96"
    role="img"
    aria-label="qubic QDOGE Kennel Club"
    className={cn("h-10 w-auto transition-colors duration-300", className)}
    {...props}
  >
    <title>qubic QDOGE Kennel Club</title>
    <g>
      <rect x="0" y="0" width="360" height="96" fill="none" />
      <rect x="24" y="33" width="10" height="30" fill="hsl(var(--muted-foreground))" />
      <rect x="40" y="33" width="12" height="40" fill="hsl(var(--primary))" />
      <text
        x="70"
        y="60"
        fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
        fontSize="40"
        fontWeight={700}
      >
        <tspan fill="hsl(var(--foreground))">qubic</tspan>
        <tspan fill="hsl(var(--primary))">QDOGE</tspan>
      </text>
      <text
        x="196"
        y="82"
        fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
        fontSize="18"
        fontWeight={600}
        fill="hsl(var(--muted-foreground))"
      >
        Kennel Club
      </text>
    </g>
  </svg>
);

export default Logo;
