import { cn } from "@/lib/utils";

/** A grey placeholder block shown while a page loads. Size it with className. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block rounded-lg bg-muted motion-safe:animate-pulse", className)} />;
}
