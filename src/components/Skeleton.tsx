export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 animate-pulse"
        >
          <div className="w-9 h-9 rounded-full bg-neutral-800 mb-3" />
          <div className="h-4 bg-neutral-800 rounded w-2/3 mb-2" />
          <div className="h-3 bg-neutral-800 rounded w-1/3" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 animate-pulse">
          <div className="h-4 bg-neutral-800 rounded w-1/2 mb-2" />
          <div className="h-3 bg-neutral-800 rounded w-1/4" />
        </div>
      ))}
    </div>
  )
}
