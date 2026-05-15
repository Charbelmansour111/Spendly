export default function SkeletonCard({ lines = 3, showAvatar = false, compact = false }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl ${compact ? 'p-3' : 'p-4'} animate-pulse`}>
      {showAvatar && (
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full skeleton" />
          <div className="flex-1">
            <div className="h-3.5 skeleton rounded-lg w-1/2 mb-1.5" />
            <div className="h-3 skeleton rounded-lg w-1/3" />
          </div>
        </div>
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i}
          className={`h-3.5 skeleton rounded-lg mb-2 ${i === 0 ? 'w-3/4' : i === lines - 1 ? 'w-1/3' : 'w-full'}`} />
      ))}
    </div>
  )
}
