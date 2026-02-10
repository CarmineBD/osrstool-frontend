import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
  fillSide?: "start" | "end"
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, fillSide = "start", min = 0, max = 100, value, defaultValue, ...props }, ref) => {
  const currentValue = (value?.[0] ?? defaultValue?.[0] ?? min) as number
  const boundedValue = Math.min(max, Math.max(min, currentValue))
  const percent = max === min ? 0 : ((boundedValue - min) / (max - min)) * 100

  return (
    <SliderPrimitive.Root
      ref={ref}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none select-none items-center cursor-pointer data-[disabled]:cursor-not-allowed",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
        {fillSide === "start" ? (
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        ) : (
          <>
            <SliderPrimitive.Range className="absolute h-full bg-transparent" />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 bg-primary"
              style={{ left: `${percent}%` }}
            />
          </>
        )}
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-4 w-4 cursor-pointer rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
