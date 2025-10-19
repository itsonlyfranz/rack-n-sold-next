import * as React from "react"
import { cn } from "@/lib/utils"

interface GlowProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "top" | "bottom" | "both"
}

export function Glow({
  className,
  variant = "both",
  ...props
}: GlowProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[-1] overflow-hidden",
        className
      )}
      {...props}
    >
      {(variant === "both" || variant === "top") && (
        <div className="absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-purple-500 to-amber-500 opacity-20 blur-[100px]" />
      )}
      {(variant === "both" || variant === "bottom") && (
        <div className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 translate-y-1/2 rounded-full bg-gradient-to-r from-amber-500 to-purple-500 opacity-20 blur-[100px]" />
      )}
    </div>
  )
} 