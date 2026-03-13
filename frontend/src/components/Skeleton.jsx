function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className}`} />
  )
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Month selector */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <Skeleton className="w-10 h-10" />
        <Skeleton className="w-48 h-10" />
        <Skeleton className="w-10 h-10" />
      </div>

      {/* Summary card */}
      <Skeleton className="w-full h-32 mb-6 rounded-2xl" />

      {/* Income section */}
      <Skeleton className="w-full h-24 mb-6 rounded-2xl" />

      {/* Add expense + pie chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>

      {/* Bar chart */}
      <Skeleton className="w-full h-48 mb-6 rounded-2xl" />

      {/* Budget goals */}
      <Skeleton className="w-full h-40 mb-6 rounded-2xl" />

      {/* Expenses list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
        <Skeleton className="w-40 h-6 mb-4" />
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <Skeleton key={i} className="w-full h-16 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Profile card */}
      <Skeleton className="w-full h-48 mb-6 rounded-2xl" />

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>

      {/* Best month */}
      <Skeleton className="w-full h-28 mb-6 rounded-2xl" />

      {/* Currency */}
      <Skeleton className="w-full h-48 mb-6 rounded-2xl" />

      {/* Account info */}
      <Skeleton className="w-full h-40 rounded-2xl" />
    </div>
  )
}

export default Skeleton