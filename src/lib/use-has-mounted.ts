import { useSyncExternalStore } from 'react'

// False during the server render and the hydration pass, true afterwards. Lets a
// component render something client-only without a hydration mismatch (and
// without setting state in an effect).
export function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}
