"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";
import { buttonVariants } from "./button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-0", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "flex flex-col gap-4",
        caption: "relative flex items-center justify-center border-b border-[#00FFFF]/10 pb-4",
        caption_label: "text-sm font-semibold uppercase tracking-[0.32em] text-[#DAE2FD]",
        nav: "flex items-center gap-2",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "flex h-9 w-9 items-center justify-center rounded-xl border border-[#00FFFF]/20 bg-[#08090d] p-0 text-[#BBC9CD] opacity-100 transition hover:border-[#00FFFF]/40 hover:bg-[#10131a] hover:text-[#00FFFF]",
        ),
        nav_button_previous: "absolute left-0",
        nav_button_next: "absolute right-0",
        table: "w-full border-separate border-spacing-y-2",
        head_row: "grid grid-cols-7 gap-2",
        head_cell:
          "text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-[#6E7A86]",
        row: "grid grid-cols-7 gap-2",
        cell: cn(
          "relative text-center text-sm focus-within:relative focus-within:z-20",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-12 w-full rounded-2xl border border-transparent bg-[#08090d] p-0 text-sm font-semibold text-[#DAE2FD] aria-selected:opacity-100 hover:border-[#00FFFF]/30 hover:bg-[#0d1117] hover:text-[#00FFFF] focus-visible:ring-[#00FFFF]/30",
        ),
        day_range_start:
          "day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_range_end:
          "day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_selected:
          "border border-[#00FFFF]/50 bg-[#00FFFF]/15 text-[#00FFFF] shadow-[0_0_18px_rgba(0,255,255,0.18)] hover:border-[#00FFFF]/60 hover:bg-[#00FFFF]/20 hover:text-[#00FFFF] focus:bg-[#00FFFF]/20 focus:text-[#00FFFF]",
        day_today: "border border-[#A855F7]/35 bg-[#A855F7]/12 text-[#F4ECFF]",
        day_outside:
          "day-outside bg-transparent text-[#49525D] opacity-60 hover:bg-transparent hover:text-[#6E7A86]",
        day_disabled: "text-[#49525D] opacity-40",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  );
}

export { Calendar };
