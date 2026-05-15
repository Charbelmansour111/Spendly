export default function EmptyState({ emoji, title, subtitle, actionLabel, onAction, pills }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center card-enter">
      <div className="text-5xl mb-4" style={{ animation: 'fadeInUp 0.4s ease-out both' }}>{emoji}</div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed mb-6">{subtitle}</p>
      {actionLabel && (
        <button onClick={onAction}
          className="bg-violet-600 text-white px-6 py-3 rounded-2xl font-semibold text-sm hover:bg-violet-700 active:scale-95 transition-all duration-150 shadow-sm">
          {actionLabel}
        </button>
      )}
      {pills && pills.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          {pills.map((p, i) => (
            <button key={i} onClick={() => p.onClick?.(p.text)}
              className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium px-3 py-2 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-400 transition">
              {p.text}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
