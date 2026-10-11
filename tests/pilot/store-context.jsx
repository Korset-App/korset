import React, { useLayoutEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, useLocation } from 'react-router-dom'
import { OfflineProvider } from '../../src/contexts/OfflineContext.jsx'
import { StoreProvider, useStore } from '../../src/contexts/StoreContext.jsx'

function Probe() {
  const location = useLocation()
  const { currentStore, catalogProducts, isCatalogReady, isStoreLoading, isCatalogLoading, routes, updateStoreSettings } = useStore()
  const [settingsResult, setSettingsResult] = useState(null)
  const snapshot = {
    path: location.pathname,
    store: currentStore?.slug ?? null,
    storeName: currentStore?.name ?? null,
    products: catalogProducts.map((product) => product.name),
    ready: isCatalogReady,
    loading: isStoreLoading,
    catalogLoading: isCatalogLoading,
    catalogPath: routes?.catalog ?? null,
    settingsResult,
  }
  useLayoutEffect(() => {
    window.pilotSnapshots ??= []
    window.pilotSnapshots.push(snapshot)
  })
  return <>
    {['pilot-a', 'pilot-b', 'pilot-c'].map((slug) => <Link key={slug} to={`/s/${slug}/catalog`}>{slug}</Link>)}
    <button onClick={() => updateStoreSettings({ name: 'Updated pilot-a' }).then(setSettingsResult)}>Save settings</button>
    <pre data-testid="state">{JSON.stringify(snapshot)}</pre>
  </>
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter><OfflineProvider><StoreProvider><Probe /></StoreProvider></OfflineProvider></BrowserRouter>
)
