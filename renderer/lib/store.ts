/**
 * Calls `apply` whenever another notch (one on another display) saves `key`.
 * Returns the unsubscribe, so it can be a useEffect's whole body.
 */
export const onStoreChange = <T>(key: string, apply: (value: T) => void) =>
  window.bridge?.on<unknown>('store:changed', (changed, value) => {
    if (changed === key) apply(value as T)
  })
