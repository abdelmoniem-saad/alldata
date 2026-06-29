/**
 * RouteFallback, T0.
 *
 * The Suspense fallback for lazy-loaded routes. A quiet centered pulse in
 * theme tokens, shown once per route on first navigation while its async
 * chunk downloads, then never again (chunk is cached).
 */
export default function RouteFallback() {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}
    >
      <div
        className="animate-pulse"
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '2px solid var(--color-border)',
          borderTopColor: 'var(--color-accent)',
          animation: 'route-fallback-spin 0.7s linear infinite',
        }}
      />
      <style>{`@keyframes route-fallback-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
