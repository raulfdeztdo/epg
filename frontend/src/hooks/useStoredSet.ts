import { useState, useCallback } from 'react'

function readSet(key: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(key)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.filter(v => typeof v === 'string') : [])
  } catch {
    return new Set()
  }
}

/** A Set of strings persisted in localStorage (works without storage, just not persisted). */
export function useStoredSet(key: string): [Set<string>, (value: string) => void] {
  const [values, setValues] = useState(() => readSet(key))

  const toggle = useCallback(
    (value: string) => {
      setValues(prev => {
        const next = new Set(prev)
        if (next.has(value)) next.delete(value)
        else next.add(value)
        try {
          window.localStorage.setItem(key, JSON.stringify([...next]))
        } catch {
          // Storage unavailable (private mode, blocked): keep the state in memory only
        }
        return next
      })
    },
    [key]
  )

  return [values, toggle]
}
