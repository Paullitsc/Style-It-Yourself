import * as React from "react"

import { cn } from "../lib/cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[var(--size-control-md)] w-full min-w-0 rounded-none border-0 border-b border-ink bg-transparent px-0 font-display text-[18px] text-ink transition-colors outline-none selection:bg-ink selection:text-paper placeholder:text-ink-3 disabled:cursor-not-allowed disabled:opacity-60",
        "focus-visible:border-accent",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
