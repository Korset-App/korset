import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext.jsx'
import { OfflineProvider, useOffline } from '../../src/contexts/OfflineContext.jsx'
import { StoreProvider, useStore } from '../../src/contexts/StoreContext.jsx'

function Probe() {
  const { user, loading, logout } = useAuth()
  const { isOnline } = useOffline()
  const { currentStore, catalogProducts, isStoreLoading, isCatalogReady, updateStoreSettings } = useStore()
  const [saved, setSaved] = useState(false)
  return <>
    <button onClick={logout}>Sign out</button>
    <button onClick={() => updateStoreSettings({ is_published: true }).then((result) => setSaved(!result.error))}>Publish fixture</button>
    <pre data-testid="visibility">{JSON.stringify({
      userId: user?.id ?? null,
      authLoading: loading,
      loading: isStoreLoading,
      store: currentStore?.name ?? null,
      products: catalogProducts.map((product) => product.name),
      ready: isCatalogReady,
      saved,
      online: isOnline,
    })}</pre>
  </>
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter><AuthProvider><OfflineProvider><StoreProvider><Probe /></StoreProvider></OfflineProvider></AuthProvider></BrowserRouter>
)
