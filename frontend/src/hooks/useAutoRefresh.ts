import { useEffect, useRef } from 'react'

/**
 * Calls `callback` every `interval` ms while the tab is visible. When a hidden tab becomes
 * visible again after a full interval, it refreshes straight away instead of waiting.
 */
export function useAutoRefresh(callback: () => void, interval?: number) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!interval) return

    let lastRun = Date.now()
    const run = () => {
      lastRun = Date.now()
      callbackRef.current()
    }

    const timer = window.setInterval(() => {
      if (!document.hidden) run()
    }, interval)

    const onVisibilityChange = () => {
      if (!document.hidden && Date.now() - lastRun >= interval) run()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [interval])
}
