import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { useStore } from '../contexts/StoreContext.jsx'
import { getStores } from '../data/stores.js'

export default function StoresScreen() {
  const navigate = useNavigate()
  const { rememberStore } = useStore()
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('stores')
      .select('id, code, name, city, address, logo_url, type')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (cancelled) return
        if (data && data.length > 0) {
          setStores(data.map((s) => ({ ...s, slug: s.code })))
        } else {
          setStores(getStores().map((s) => ({ ...s, slug: s.slug || s.id })))
        }
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setStores(getStores().map((s) => ({ ...s, slug: s.slug || s.id })))
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="screen" style={{ paddingBottom: 32 }}>
      <div className="header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            border: '1px solid var(--glass-border)',
            background: 'var(--glass-bg)',
            color: 'var(--text)',
          }}
        >
          ←
        </button>
        <div className="screen-title" style={{ margin: 0 }}>
          Магазины
        </div>
      </div>
      <div style={{ padding: '20px', display: 'grid', gap: 12 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-sub)' }}>
            <div
              style={{
                width: 28,
                height: 28,
                border: '3px solid rgba(56,189,248,0.15)',
                borderTop: '3px solid var(--accent-sky)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 12px',
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}
        {!loading && stores.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 0',
              color: 'var(--text-sub)',
              fontSize: 14,
            }}
          >
            Магазины не найдены
          </div>
        )}
        {stores.map((store) => (
          <button
            key={store.slug}
            onClick={() => {
              rememberStore(store.slug)
              navigate(`/s/${store.slug}`)
            }}
            style={{
              padding: '16px',
              borderRadius: 18,
              cursor: 'pointer',
              textAlign: 'left',
              background: 'var(--glass-muted)',
              border: '1px solid var(--glass-soft-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(124,58,237,0.2))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 800,
                  color: 'var(--text-inverse)',
                  fontFamily: 'var(--font-display)',
                  flexShrink: 0,
                }}
              >
                {store.name?.[0]?.toUpperCase() || 'K'}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                {store.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{store.city}</div>
            </div>
            <span style={{ color: 'var(--primary-bright)', fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  )
}
