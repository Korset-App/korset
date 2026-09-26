import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n/index.js'
import {
  CloseIcon,
  LocationPinIcon,
  SearchIcon,
  SyncIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '../icons/index.js'

// Helper to ensure Leaflet CSS and JS are loaded once
const loadLeafletAssets = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('No window'))
    if (window.L) return resolve(window.L)

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script')
      script.id = 'leaflet-js'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => {
        if (window.L) resolve(window.L)
        else reject(new Error('Leaflet not loaded on window'))
      }
      script.onerror = () => reject(new Error('Failed to load Leaflet script'))
      document.body.appendChild(script)
    } else {
      const check = setInterval(() => {
        if (window.L) {
          clearInterval(check)
          resolve(window.L)
        }
      }, 50)
      setTimeout(() => {
        clearInterval(check)
        if (window.L) resolve(window.L)
        else reject(new Error('Timeout loading Leaflet'))
      }, 5000)
    }
  })
}

// Major Kazakhstan cities coordinates
const QUICK_CITIES = [
  { id: 'astana', nameRu: 'Астана', nameKz: 'Астана', lat: 51.169392, lon: 71.449074 },
  { id: 'almaty', nameRu: 'Алматы', nameKz: 'Алматы', lat: 43.238949, lon: 76.889709 },
  { id: 'shymkent', nameRu: 'Шымкент', nameKz: 'Шымкент', lat: 42.3417, lon: 69.5901 },
  { id: 'karaganda', nameRu: 'Караганда', nameKz: 'Қарағанды', lat: 49.8019, lon: 73.1021 },
  { id: 'aktobe', nameRu: 'Актобе', nameKz: 'Ақтөбе', lat: 50.2839, lon: 57.167 },
]

const DEFAULT_LAT = 51.169392
const DEFAULT_LON = 71.449074

export default function StoreLocationModal({
  isOpen,
  initialAddress = '',
  initialCity = 'Астана',
  initialLat = null,
  initialLon = null,
  onConfirm,
  onClose,
}) {
  const { t, lang } = useI18n()
  const isKz = lang === 'kz'
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  const [currentLat, setCurrentLat] = useState(initialLat ? Number(initialLat) : DEFAULT_LAT)
  const [currentLon, setCurrentLon] = useState(initialLon ? Number(initialLon) : DEFAULT_LON)
  const [addressSearch, setAddressSearch] = useState(initialAddress || '')
  const [detectedAddress, setDetectedAddress] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [_mapReady, setMapReady] = useState(false)

  const coordsRef = useRef({
    lat: initialLat ? Number(initialLat) : DEFAULT_LAT,
    lon: initialLon ? Number(initialLon) : DEFAULT_LON,
  })

  // Reverse geocoding helper (find street name by lat/lon)
  const reverseGeocode = useCallback(async (lat, lon) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ru`
      )
      const data = await res.json()
      if (data?.display_name) {
        const road = data.address?.road || ''
        const house = data.address?.house_number || ''
        const suburb = data.address?.suburb || data.address?.city || ''
        const shortName = [road, house, suburb].filter(Boolean).join(', ')
        setDetectedAddress(shortName || data.display_name.split(',').slice(0, 3).join(','))
      }
    } catch {
      /* ignore reverse geocode errors */
    }
  }, [])

  // Address search via Nominatim
  const handleSearchAddress = async (e) => {
    e?.preventDefault()
    const query = addressSearch.trim()
    if (!query) return

    setIsSearching(true)
    try {
      const city = initialCity || 'Астана'
      const fullQuery = query.toLowerCase().includes(city.toLowerCase())
        ? `${query}, Казахстан`
        : `${city}, ${query}, Казахстан`

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          fullQuery
        )}&format=json&limit=1&countrycodes=kz&accept-language=ru`
      )
      const data = await res.json()
      if (data && data[0]) {
        const lat = Number(data[0].lat)
        const lon = Number(data[0].lon)
        setCurrentLat(lat)
        setCurrentLon(lon)
        setDetectedAddress(data[0].display_name.split(',').slice(0, 3).join(','))

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lon], 16)
          markerRef.current.setLatLng([lat, lon])
        }
      } else {
        alert(
          t('retail.settings.addressNotFound') ||
            'Адрес не найден. Попробуйте уточнить улицу и номер дома или укажите точку на карте вручную.'
        )
      }
    } catch (err) {
      console.error('Geocoding error:', err)
      alert(t('retail.settings.geocodeError') || 'Ошибка поиска адреса')
    } finally {
      setIsSearching(false)
    }
  }

  // Device GPS Location
  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      alert(t('retail.settings.geoNotSupported') || 'Геолокация не поддерживается вашим браузером')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false)
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setCurrentLat(lat)
        setCurrentLon(lon)
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lon], 17)
          markerRef.current.setLatLng([lat, lon])
        }
        reverseGeocode(lat, lon)
      },
      (err) => {
        setIsLocating(false)
        console.warn('Geolocation error:', err)
        alert(
          t('retail.settings.geoDenied') ||
            'Не удалось определить местоположение. Проверьте доступ к GPS.'
        )
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )
  }

  // Switch City Quick Pill
  const handleSelectCity = (city) => {
    setCurrentLat(city.lat)
    setCurrentLon(city.lon)
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([city.lat, city.lon], 13)
      markerRef.current.setLatLng([city.lat, city.lon])
    }
    reverseGeocode(city.lat, city.lon)
  }

  // Initialize Leaflet map
  useEffect(() => {
    if (!isOpen) return

    let active = true

    loadLeafletAssets()
      .then((L) => {
        if (!active || !mapContainerRef.current) return

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove()
          mapInstanceRef.current = null
        }

        const startLat = coordsRef.current.lat || DEFAULT_LAT
        const startLon = coordsRef.current.lon || DEFAULT_LON

        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
        }).setView([startLat, startLon], 15)
        mapInstanceRef.current = map

        L.control.zoom({ position: 'bottomright' }).addTo(map)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors',
        }).addTo(map)

        const marker = L.marker([startLat, startLon], {
          draggable: true,
        }).addTo(map)
        markerRef.current = marker

        marker.on('dragend', () => {
          const { lat, lng } = marker.getLatLng()
          setCurrentLat(lat)
          setCurrentLon(lng)
          reverseGeocode(lat, lng)
        })

        map.on('click', (e) => {
          marker.setLatLng(e.latlng)
          setCurrentLat(e.latlng.lat)
          setCurrentLon(e.latlng.lng)
          reverseGeocode(e.latlng.lat, e.latlng.lng)
        })

        setTimeout(() => {
          if (active && map) {
            map.invalidateSize()
            setMapReady(true)
          }
        }, 150)
      })
      .catch((err) => {
        console.error('Failed to load Leaflet:', err)
      })

    return () => {
      active = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [isOpen, reverseGeocode])

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm?.({
      latitude: Number(currentLat.toFixed(6)),
      longitude: Number(currentLon.toFixed(6)),
      detectedAddress,
    })
    onClose?.()
  }

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
        background: 'rgba(5, 10, 20, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        style={{
          background: 'var(--card-bg, #0f172a)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: 24,
          width: '100%',
          maxWidth: 580,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.65)',
          maxHeight: '92vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.08) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--retail-accent, #38BDF8)',
              }}
            >
              <LocationPinIcon size={18} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                {t('retail.settings.mapModalTitle') || 'Точка магазина на карте'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                {t('retail.settings.mapModalSub') || 'Точное расположение для витрины покупателей'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: 10,
              color: 'var(--text-sub)',
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
            }}
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Address Search Bar & GPS button */}
        <form
          onSubmit={handleSearchAddress}
          style={{
            padding: '12px 16px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            gap: 8,
          }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder={
                t('retail.settings.mapSearchPlaceholder') ||
                'Поиск адреса (например: ул. Сыганак, 14)'
              }
              value={addressSearch}
              onChange={(e) => setAddressSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--input-bg, rgba(255, 255, 255, 0.05))',
                border: '1px solid var(--input-border, rgba(255, 255, 255, 0.1))',
                borderRadius: 12,
                padding: '9px 12px 9px 34px',
                fontSize: 13,
                color: 'var(--text)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)',
                display: 'flex',
              }}
            >
              <SearchIcon size={16} />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSearching}
            style={{
              padding: '8px 14px',
              borderRadius: 12,
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: 'var(--retail-accent, #38BDF8)',
              fontSize: 13,
              fontWeight: 600,
              cursor: isSearching ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {isSearching ? (
              <SyncIcon size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : null}
            {t('retail.settings.findBtn') || 'Найти'}
          </button>

          <button
            type="button"
            onClick={handleGetMyLocation}
            disabled={isLocating}
            title={t('retail.settings.myLocation') || 'Моё местоположение'}
            style={{
              padding: '8px 12px',
              borderRadius: 12,
              background: isLocating ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'var(--text)',
              fontSize: 12,
              fontWeight: 600,
              cursor: isLocating ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            {isLocating ? (
              <SyncIcon size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <SparklesIcon size={14} color="var(--retail-accent, #38BDF8)" />
            )}
            <span>{t('retail.settings.myLocation') || 'GPS'}</span>
          </button>
        </form>

        {/* Quick City Selector Pills */}
        <div
          style={{
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            overflowX: 'auto',
            background: 'rgba(0, 0, 0, 0.2)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            scrollbarWidth: 'none',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>
            {t('retail.settings.quickCity') || 'Город:'}
          </span>
          {QUICK_CITIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelectCity(c)}
              style={{
                padding: '4px 10px',
                borderRadius: 16,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'var(--text-sub)',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {isKz ? c.nameKz : c.nameRu}
            </button>
          ))}
        </div>

        {/* Leaflet Map Box */}
        <div style={{ position: 'relative', width: '100%', height: 340, background: '#1e293b' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

          {/* Quick helper tip */}
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              right: 10,
              zIndex: 500,
              padding: '6px 12px',
              borderRadius: 8,
              background: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(6px)',
              fontSize: 11,
              color: 'rgba(255, 255, 255, 0.9)',
              textAlign: 'center',
              pointerEvents: 'none',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            {t('retail.settings.mapPinHint') || 'Нажмите в любое место карты или перетащите маркер'}
          </div>
        </div>

        {/* Footer with Coordinates and Confirm */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'var(--card-bg, #0f172a)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Coordinates and detected address readout */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--text-sub)',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <CheckCircleIcon size={16} color="#10B981" />
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text)' }}>
                {currentLat.toFixed(5)}, {currentLon.toFixed(5)}
              </span>
            </div>
            {detectedAddress && (
              <span
                style={{
                  color: 'var(--text-dim)',
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textAlign: 'right',
                }}
              >
                {detectedAddress}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('retail.settings.mapModalCancel') || 'Отмена'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              style={{
                flex: 1.5,
                padding: '12px',
                borderRadius: 12,
                background: 'var(--retail-accent, #38BDF8)',
                border: 'none',
                color: '#07070F',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(56, 189, 248, 0.3)',
              }}
            >
              {t('retail.settings.mapModalConfirm') || 'Зафиксировать точку'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
