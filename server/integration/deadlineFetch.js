export function createDeadlineFetch({ fetchImpl = globalThis.fetch, timeoutMs = 15000 } = {}) {
  return (input, init = {}) => {
    const caller = init.signal ?? (input instanceof Request ? input.signal : null)
    const deadline = AbortSignal.timeout(timeoutMs)
    const signal = caller ? AbortSignal.any([caller, deadline]) : deadline
    return fetchImpl(input, { ...init, signal })
  }
}
