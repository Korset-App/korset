export function isSafeUpdateRoute(pathname) {
  return !/^\/s\/[^/]+\/(?:scan|product)(?:\/|$)/.test(pathname)
}

export function createUpdateReloadHandler({
  hasController,
  canReload,
  reload,
  schedule = (callback) => setTimeout(callback, 1000),
}) {
  let pending = false
  let reloaded = false
  const tryReload = () => {
    if (reloaded) return
    if (!canReload()) {
      schedule(tryReload)
      return
    }
    reloaded = true
    reload()
  }
  return () => {
    if (!hasController) {
      hasController = true
      return
    }
    if (pending || reloaded) return
    pending = true
    tryReload()
  }
}
