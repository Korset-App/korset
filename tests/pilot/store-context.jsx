import React, { useLayoutEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, useLocation } from 'react-router-dom'
import { OfflineProvider } from '../../src/contexts/OfflineContext.jsx'
import { StoreProvider, useStore } from '../../src/contexts/StoreContext.jsx'
import { applyRetailImport } from '../../src/utils/retailImport.js'
import { useCatalogSearch } from '../../src/hooks/useCatalogSearch.js'

function Probe() {
  const location = useLocation()
  const { currentStore, catalogProducts, isCatalogReady, isStoreLoading, isCatalogLoading, routes, updateStoreSettings, refreshCatalog } = useStore()
  const search = useCatalogSearch({ storeId: currentStore?.id, storeSlug: currentStore?.slug, isOnline: true, location })
  const [settingsResult, setSettingsResult] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const snapshot = {
    path: location.pathname,
    store: currentStore?.slug ?? null,
    storeName: currentStore?.name ?? null,
    products: catalogProducts.map((product) => product.name),
    prices: catalogProducts.map((product) => product.priceKzt),
    stocks: catalogProducts.map((product) => product.stockStatus),
    searchPrices: search.serverSearch.results.map((product) => product.priceKzt),
    ready: isCatalogReady,
    loading: isStoreLoading,
    catalogLoading: isCatalogLoading,
    catalogPath: routes?.catalog ?? null,
    settingsResult,
    importResult,
  }
  useLayoutEffect(() => {
    window.pilotSnapshots ??= []
    window.pilotSnapshots.push(snapshot)
  })
  return <>
    {['pilot-a', 'pilot-b', 'pilot-c'].map((slug) => <Link key={slug} to={`/s/${slug}/catalog`}>{slug}</Link>)}
    <button onClick={() => updateStoreSettings({ name: 'Updated pilot-a' }).then(setSettingsResult)}>Save settings</button>
    <button onClick={async () => {
      const storeId = currentStore.id
      const result = await applyRetailImport(storeId, [{ ean: '4870201234567', priceKzt: 200, stockStatus: 'out_of_stock' }])
      if (result.updated > 0) refreshCatalog?.(storeId)
      setImportResult(result)
    }}>Import fixture</button>
    <input aria-label="Search fixture" value={search.q} onChange={(event) => search.setQ(event.target.value)} />
    <pre data-testid="state">{JSON.stringify(snapshot)}</pre>
  </>
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter><OfflineProvider><StoreProvider><Probe /></StoreProvider></OfflineProvider></BrowserRouter>
)
