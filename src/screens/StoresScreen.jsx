import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { getStores } from '../data/stores.js'
import { useI18n } from '../i18n/index.js'
import { filterStoreListings, normalizeStoreListing } from '../domain/stores/listing.js'
import './StoresScreen.css'

const STORE_TONES = ['violet', 'mint', 'amber', 'sky']

const IconSearch = (
  <svg width="24" height="24" viewBox="0 0 72 72" fill="currentColor" aria-hidden="true">
    <path d="M28.131 10.632c-6.262 0-12.141 3.348-15.342 8.738-.282.474-.126 1.089.349 1.37.16.096.336.141.51.141.342 0 .674-.174.861-.489 2.843-4.786 8.062-7.76 13.622-7.76.553 0 1-.447 1-1 0-.553-.447-1-1-1zM11.967 23.646a1 1 0 00-1.201.746c-.299 1.276-.468 2.067-.468 3.487 0 .553.448 1 1 1s1-.447 1-1c0-1.205.135-1.834.415-3.032a1 1 0 00-.746-1.201zM66.613 57.793L50.471 41.652a13.5 13.5 0 00-1.17-.877 24.46 24.46 0 003.33-12.311c0-13.51-10.99-24.5-24.5-24.5S3.631 14.954 3.631 28.464s10.991 24.5 24.5 24.5c4.81 0 9.296-1.399 13.084-3.801.205.339.462.666.77.974l16.142 16.143a5.99 5.99 0 004.244 1.756 5.99 5.99 0 004.243-1.756 5.99 5.99 0 001.756-4.242 5.99 5.99 0 00-1.756-4.244zM7.631 28.465c0-11.304 9.196-20.5 20.5-20.5s20.5 9.196 20.5 20.5-9.197 20.5-20.5 20.5-20.5-9.196-20.5-20.5zm56.153 34.986a2 2 0 01-2.83 0L44.813 47.309c-.14-.139-.192-.232-.199-.232.003-.043.058-.455 1.201-1.596 1.14-1.143 1.552-1.195 1.565-1.203.026.008.119.06.263.203l16.14 16.141a2 2 0 010 2.829z" />
  </svg>
)

function getStoreTone(store, index) {
  const source = store.slug || store.name || String(index)
  const sum = [...source].reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return STORE_TONES[sum % STORE_TONES.length]
}

function StoreLogo({ store }) {
  if (store.logoUrl) {
    return <img className="stores-card__logo-img" src={store.logoUrl} alt="" loading="lazy" />
  }

  return <span className="stores-card__logo-letter">{store.initial}</span>
}

function StoreSkeleton() {
  return (
    <div className="stores-card stores-card--skeleton" aria-hidden="true">
      <div className="stores-card__logo stores-skeleton-pulse" />
      <div className="stores-card__body">
        <div className="stores-skeleton-line stores-skeleton-line--lg" />
        <div className="stores-skeleton-line" />
        <div className="stores-skeleton-line stores-skeleton-line--short" />
      </div>
    </div>
  )
}

function StoreCard({ store, index, onSelect, t }) {
  const tone = getStoreTone(store, index)

  return (
    <button
      type="button"
      className="stores-card"
      data-tone={tone}
      style={{ '--stores-card-index': index }}
      onClick={() => onSelect(store)}
      aria-label={`${t('stores.openStore')}: ${store.name}`}
    >
      <span className="stores-card__logo" aria-hidden="true">
        <StoreLogo store={store} />
      </span>

      <span className="stores-card__body">
        <span className="stores-card__topline">
          <span className="stores-status stores-status--available">
            <span className="stores-status__dot" />
            {t(`stores.status.${store.status}`)}
          </span>
          <span className="stores-card__type">{t(`stores.type.${store.type}`)}</span>
        </span>

        <span className="stores-card__name">{store.name}</span>

        {store.city || store.address ? (
          <span className="stores-card__meta">
            <span className="material-symbols-outlined" aria-hidden="true">
              location_on
            </span>
            {store.city ? <span>{store.city}</span> : null}
            {store.city && store.address ? (
              <span className="stores-card__separator" aria-hidden="true" />
            ) : null}
            {store.address ? <span>{store.address}</span> : null}
          </span>
        ) : null}

        <span className="stores-card__footer">
          <span className="stores-card__hours">
            <span className="material-symbols-outlined" aria-hidden="true">
              schedule
            </span>
            {t('stores.hoursUnknown')}
          </span>
          <span className="stores-card__cta">{t('stores.open')}</span>
        </span>
      </span>
    </button>
  )
}

export default function StoresScreen() {
  const navigate = useNavigate()
  const { rememberStore } = useStore()
  const { t } = useI18n()
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    let cancelled = false

    supabase
      .from('stores')
      .select(
        'id, code, name, city, address, logo_url, type, plan, short_description, description, is_active'
      )
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (cancelled) return
        const source = data?.length ? data.map((s) => ({ ...s, slug: s.code })) : getStores()
        setStores(source.map(normalizeStoreListing))
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setStores(getStores().map(normalizeStoreListing))
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const filteredStores = useMemo(
    () => filterStoreListings(stores, deferredQuery),
    [stores, deferredQuery]
  )

  const handleSelect = (store) => {
    rememberStore(store.slug)
    navigate(`/s/${store.slug}`)
  }

  const handleSearch = (event) => {
    setQuery(event.target.value)
  }

  const hasQuery = query.trim().length > 0
  return (
    <main className="screen stores-screen">
      <header className="stores-topbar">
        <button
          type="button"
          className="stores-icon-btn"
          onClick={() => navigate(-1)}
          aria-label={t('common.back')}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_back
          </span>
        </button>
        <a className="stores-brand" href="/" aria-label="Körset">
          <img
            className="stores-brand__logo stores-brand__logo--dark"
            src="/brand/korset-wordmark-white.png"
            alt=""
          />
          <img
            className="stores-brand__logo stores-brand__logo--light"
            src="/brand/korset-wordmark-dark.png"
            alt=""
          />
        </a>
      </header>

      <section className="stores-hero" aria-labelledby="stores-title">
        <h1 className="stores-hero__title" id="stores-title">
          {t('stores.titleBefore')}{' '}
          <span className="stores-hero__accent">{t('stores.titleAccent')}</span>
        </h1>
        <p className="stores-hero__text">{t('stores.subtitle')}</p>
      </section>

      <section className="stores-panel" aria-label={t('stores.listLabel')}>
        <label className="stores-search">
          <span className="stores-search__icon">{IconSearch}</span>
          <input
            value={query}
            onChange={handleSearch}
            placeholder={t('stores.searchPlaceholder')}
            autoComplete="off"
          />
          {hasQuery ? (
            <button type="button" onClick={() => setQuery('')} aria-label={t('stores.clearSearch')}>
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          ) : null}
        </label>

        <div className="stores-list-head">
          <span>{t('stores.availableTitle')}</span>
          <span>{t('stores.visibleCount', { count: filteredStores.length })}</span>
        </div>

        <div className="stores-list">
          {loading ? [0, 1, 2].map((item) => <StoreSkeleton key={item} />) : null}

          {!loading &&
            filteredStores.map((store, index) => (
              <StoreCard
                key={store.slug}
                store={store}
                index={index}
                onSelect={handleSelect}
                t={t}
              />
            ))}
        </div>

        {!loading && stores.length === 0 ? (
          <div className="stores-empty">
            <span className="material-symbols-outlined" aria-hidden="true">
              storefront
            </span>
            <h2>{t('stores.emptyTitle')}</h2>
            <p>{t('stores.emptyText')}</p>
          </div>
        ) : null}

        {!loading && stores.length > 0 && filteredStores.length === 0 ? (
          <div className="stores-empty stores-empty--search">
            <span className="material-symbols-outlined" aria-hidden="true">
              travel_explore
            </span>
            <h2>{t('stores.noResultsTitle')}</h2>
            <p>{t('stores.noResultsText')}</p>
          </div>
        ) : null}
      </section>

      <footer className="stores-owner-card">
        <div>
          <span>{t('stores.ownerEyebrow')}</span>
          <strong>{t('stores.ownerTitle')}</strong>
        </div>
        <a href="https://t.me/korset_support_bot" target="_blank" rel="noreferrer">
          {t('stores.ownerCta')}
        </a>
      </footer>
    </main>
  )
}
