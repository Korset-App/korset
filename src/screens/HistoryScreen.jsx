
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../utils/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useUserData } from '../contexts/UserDataContext.jsx'
import { useI18n } from '../utils/i18n.js'
import { hydrateProductsFromScanRows, hydrateProductsFromFavoriteRows } from '../domain/product/resolver.js'

const fontAdvent = "'Advent Pro', sans-serif"

function getThumb(product) {
  return product?.image || product?.images?.[0] || (product?.ean ? `/products/${product.ean}.png` : null)
}

export default function HistoryScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, internalUserId } = useAuth()
  const { lang } = useI18n()
  const { toggleFavorite } = useUserData()

  const [history, setHistory] = useState([])
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(searchParams.get('tab') || 'history')

  useEffect(() => {
    if (!user || !internalUserId) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadData() {
      setLoading(true)
      try {
        const [{ data: historyRows }, { data: favoriteRows }] = await Promise.all([
          supabase
            .from('scan_events')
            .select('ean, global_product_id, scanned_at')
            .eq('user_id', internalUserId)
            .order('scanned_at', { ascending: false })
            .limit(50),
          supabase
            .from('user_favorites')
            .select('global_product_id, ean, created_at')
            .eq('user_id', internalUserId)
            .order('created_at', { ascending: false }),
        ])

        const [hydratedHistory, hydratedFavorites] = await Promise.all([
          hydrateProductsFromScanRows(historyRows || []),
          hydrateProductsFromFavoriteRows(favoriteRows || []),
        ])

        if (!cancelled) {
          setHistory(hydratedHistory)
          setFavorites(hydratedFavorites)
          setLoading(false)
        }
      } catch (error) {
        console.error('History load failed', error)
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [user, internalUserId])

  const removeFavorite = async (product, event) => {
    event.stopPropagation()
    if (!product?.ean) return
    await toggleFavorite(product)
    setFavorites((prev) => prev.filter((item) => item.ean !== product.ean))
  }

  if (!user) {
    return (
      <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ position: 'absolute', top: 16, left: 16, width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <h2 style={{ fontSize: 20, fontFamily: fontAdvent, color: '#fff', marginBottom: 8 }}>{lang === 'kz' ? 'Тарихты көру үшін кіріңіз' : 'Войдите, чтобы видеть историю'}</h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 24, lineHeight: 1.5, fontFamily: fontAdvent }}>{lang === 'kz' ? 'Сканерленген тауарлар мен таңдаулыларды көру үшін аккаунтқа кіріңіз' : 'Войдите, чтобы видеть отсканированные товары и избранное'}</p>
        <button onClick={() => navigate('/auth')} style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: 14, fontSize: 15, fontWeight: 600, fontFamily: fontAdvent, cursor: 'pointer' }}>{lang === 'kz' ? 'Аккаунтқа кіру' : 'Войти'}</button>
      </div>
    )
  }

  const list = tab === 'history' ? history : favorites

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(12,12,24,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px', paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: fontAdvent, color: '#fff' }}>{lang === 'kz' ? 'Менің тауарларым' : 'Мои товары'}</div>
        </div>

        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 3 }}>
          <button onClick={() => setTab('history')} style={{ flex: 1, padding: '10px 0', borderRadius: 9, fontSize: 13, fontWeight: 600, fontFamily: fontAdvent, border: 'none', background: tab === 'history' ? 'rgba(124,58,237,0.25)' : 'transparent', color: tab === 'history' ? '#C4B5FD' : 'var(--text-dim)', cursor: 'pointer' }}>
            {lang === 'kz' ? 'Тарих' : 'История'} {history.length > 0 ? `(${history.length})` : ''}
          </button>
          <button onClick={() => setTab('favorites')} style={{ flex: 1, padding: '10px 0', borderRadius: 9, fontSize: 13, fontWeight: 600, fontFamily: fontAdvent, border: 'none', background: tab === 'favorites' ? 'rgba(239,68,68,0.15)' : 'transparent', color: tab === 'favorites' ? '#FCA5A5' : 'var(--text-dim)', cursor: 'pointer' }}>
            {lang === 'kz' ? 'Таңдаулы' : 'Избранные'} {favorites.length > 0 ? `(${favorites.length})` : ''}
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 20px', paddingBottom: 100 }}>
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--text-dim)', fontFamily: fontAdvent }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(124,58,237,0.2)', borderTop: '3px solid #7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            {lang === 'kz' ? 'Жүктелуде...' : 'Загрузка...'}
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 60, color: 'var(--text-dim)' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span style={{ fontSize: 28, opacity: 0.35 }}>{tab === 'history' ? '🕘' : '❤️'}</span>
            </div>
            <p style={{ fontFamily: fontAdvent, fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>
              {tab === 'history' ? (lang === 'kz' ? 'Сіз әлі ештеңе сканерлемедіңіз' : 'Вы ещё ничего не сканировали') : (lang === 'kz' ? 'Сізде таңдаулы тауарлар жоқ' : 'У вас пока нет избранных')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map((product, index) => {
              const thumb = getThumb(product)
              return (
                <div key={`${product.canonicalId || product.ean || index}-${index}`} onClick={() => navigate(`/product/${encodeURIComponent(product.canonicalId || `ean:${product.ean}`)}`, { state: { product } })} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 12, display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {thumb ? <img src={thumb} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} /> : <span style={{ fontSize: 22, opacity: 0.3 }}>📦</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: fontAdvent, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>{product.name}</div>
                    {product.brand && <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: fontAdvent }}>{product.brand}</div>}
                    {product.scanDate && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 3, fontFamily: fontAdvent }}>{product.scanDate.toLocaleDateString()}</div>}
                  </div>
                  {tab === 'favorites' ? (
                    <button onClick={(event) => removeFavorite(product, event)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: 'none', color: '#F87171', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#F87171" stroke="#F87171" strokeWidth="1"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </button>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
