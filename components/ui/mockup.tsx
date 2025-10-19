import * as React from "react"
import { cn } from "@/lib/utils"

interface MockupFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "small" | "medium" | "large"
}

export function MockupFrame({
  children,
  className,
  size = "medium",
  ...props
}: MockupFrameProps) {
  const sizeClasses = {
    small: "max-w-[640px]",
    medium: "max-w-[768px]",
    large: "max-w-[1024px]",
  }

  return (
    <div
      className={cn(
        "relative mx-auto w-full overflow-hidden rounded-xl border border-border bg-card shadow-xl",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <div className="flex h-8 items-center border-b border-border bg-muted/40 px-4">
        <div className="flex space-x-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
        </div>
      </div>
      <div className="overflow-auto">{children}</div>
    </div>
  )
}

interface MockupProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "browser" | "phone" | "responsive"
}

export function Mockup({
  children,
  className,
  type = "browser",
  ...props
}: MockupProps) {
  return (
    <div
      className={cn(
        "overflow-hidden",
        {
          "rounded-b-xl": type === "browser",
          "rounded-[2rem] border-8 border-foreground": type === "phone",
        },
        className
      )}
      {...props}
    >
      {type === "browser" && (
        <div className="flex h-10 items-center border-b border-border bg-muted/40 px-4">
          <div className="flex w-full items-center space-x-2">
            <div className="h-2 w-2/3 rounded-full bg-border" />
          </div>
        </div>
      )}
      <div className="overflow-auto">{children}</div>
    </div>
  )
} 