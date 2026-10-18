import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded border-[1.5px] border-foreground text-sm font-semibold whitespace-nowrap transition-colors duration-150 outline-none select-none disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background hover:bg-foreground/85",
        outline: "bg-card text-foreground hover:bg-muted aria-expanded:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        ghost: "border-transparent text-foreground hover:bg-muted aria-expanded:bg-muted",
        destructive: "border-destructive bg-card text-destructive hover:bg-destructive/10",
        link: "border-transparent text-foreground underline underline-offset-4 hover:no-underline",
      },
      size: {
        default: "h-11 gap-2 px-4",
        xs: "h-8 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-11 gap-1.5 px-3 text-[0.85rem]",
        lg: "h-12 gap-2.5 px-5 text-base [&_svg:not([class*='size-'])]:size-5",
        icon: "size-11",
        "icon-xs": "size-8",
        "icon-sm": "size-11",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
