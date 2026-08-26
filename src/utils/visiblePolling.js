export function startVisiblePolling(load, intervalMs) {
  let stopped = false
  const run = () => { if (!stopped && !document.hidden) load() }
  run()
  const timer = window.setInterval(run, intervalMs)
  const onVisibilityChange = () => { if (!document.hidden) run() }
  document.addEventListener('visibilitychange', onVisibilityChange)
  return () => { stopped = true; window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisibilityChange) }
}
