import { Skeleton } from "@/components/ui/skeleton";

/** Shown while the seasons page reads Supabase: the heading, the chart and the season rows. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading planting seasons" className="flex flex-col gap-8">
      <header className="cn-pagehead">
        <div className="cn-pagehead__text w-full">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-10 w-full max-w-2xl" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </section>

      <section className="flex flex-col gap-3">
        <Skeleton className="h-6 w-48" />
        <ol className="wrt-srows">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="wrt-srow">
              <div className="flex flex-col gap-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-9 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
