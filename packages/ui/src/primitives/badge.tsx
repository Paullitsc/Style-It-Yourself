import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/cn"

// shadcn/ui badge, restyled to the editorial system: 2px radius, mono
// label typography, semantic tokens only. whitespace-nowrap is dropped so
// sentence-length badges can wrap on narrow screens.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border border-input text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
