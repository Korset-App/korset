import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { Navigate, Link } from 'react-router-dom'
import './SuperAdminStoresScreen.css'

// --- Phone Formatting Utilities (Aligns with RetailSettingsScreen) ---
const initLocalPhone = (stored) => {
  if (!stored) return ''
  const d = stored.replace(/\D/g, '')
  if (d.length > 10 && (d.startsWith('7') || d.startsWith('8'))) return d.slice(1, 11)
  return d.slice(0, 10)
}

const formatLocalPhone = (local) => {
  if (!local) return ''
  const d = local.slice(0, 10)
  let r = '+7 (' + d.slice(0, Math.min(3, d.length))
  if (d.length >= 3) r += ')'
  if (d.length > 3) r += ' ' + d.slice(3, Math.min(6, d.length))
  if (d.length > 6) r += '-' + d.slice(6, Math.min(8, d.length))
  if (d.length > 8) r += '-' + d.slice(8, 10)
  return r
}

// --- Slugification Utility (Supports Ru and Kz Cyrillic) ---
function slugify(text) {
  const mapping = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'yo',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'kh',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'shch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
    ә: 'ae',
    ғ: 'g',
    қ: 'q',
    ң: 'ng',
    ө: 'o',
    ұ: 'u',
    ү: 'u',
    һ: 'h',
    і: 'i',
  }

  return text
    .toLowerCase()
    .split('')
    .map((char) => mapping[char] || char)
    .join('')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function SuperAdminLoader() {
  return (
    <div className="superadmin-loader-container">
      <div className="superadmin-spinner" />
    </div>
  )
}

function NoAccessScreen() {
  return (
    <div className="superadmin-no-access">
      <span className="material-symbols-outlined no-access-icon">lock</span>
      <h1 className="no-access-title">Доступ запрещен</h1>
      <p className="no-access-desc">
        Этот раздел предназначен исключительно для супер-администраторов проекта{' '}
        <b className="brand-highlight">Körset</b>.
      </p>
      <Link to="/" className="back-home-btn">
        На главную
      </Link>
    </div>
  )
}

export default function SuperAdminStoresScreen() {
  const { user, session, isSuperadmin, loading: authLoading } = useAuth()

  const [stores, setStores] = useState([])
  const [loadingStores, setLoadingStores] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'inactive'

  // Drawer (выдвижная панель) states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedStore, setSelectedStore] = useState(null)
  const [submittingStore, setSubmittingStore] = useState(false)
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formValues, setFormValues] = useState({
    name: '',
    slug: '',
    type: 'minimarket',
    plan: 'pilot',
    city: 'Астана',
    address: '',
    phone: '',
    whatsappNumber: '',
    ownerEmail: '',
    ownerPassword: '',
    shortDescription: '',
    description: '',
    planExpiresAt: '',
    newEmail: '',
    newPassword: '',
  })

  // Fetch stores
  const fetchStores = async () => {
    if (!session?.access_token) return
    setLoadingStores(true)
    setErrorMessage('')
    try {
      const response = await fetch('/api/admin-stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'list' }),
      })
      const result = await response.json()
      if (response.ok && result.ok) {
        setStores(result.stores || [])
      } else {
        setErrorMessage(result.message || result.error || 'Не удалось загрузить список магазинов')
      }
    } catch (err) {
      console.error(err)
      setErrorMessage('Ошибка сети при загрузке магазинов')
    } finally {
      setLoadingStores(false)
    }
  }

  useEffect(() => {
    if (isSuperadmin && session) {
      fetchStores()
    }
  }, [isSuperadmin, session])

  // Open drawer for creation
  const openCreateDrawer = () => {
    setSelectedStore(null)
    setFormValues({
      name: '',
      slug: '',
      type: 'minimarket',
      plan: 'pilot',
      city: 'Астана',
      address: '',
      phone: '',
      whatsappNumber: '',
      ownerEmail: '',
      ownerPassword: '',
      shortDescription: '',
      description: '',
      planExpiresAt: '',
      newEmail: '',
      newPassword: '',
    })
    setFormError('')
    setShowPassword(false)
    setIsDrawerOpen(true)
  }

  // Open drawer for edit
  const openEditDrawer = (store) => {
    setSelectedStore(store)
    setFormValues({
      name: store.name || '',
      slug: store.code || '',
      type: store.type || 'minimarket',
      plan: store.plan || 'pilot',
      city: store.city || '',
      address: store.address || '',
      phone: store.phone ? initLocalPhone(store.phone) : '',
      whatsappNumber: store.whatsapp_number ? initLocalPhone(store.whatsapp_number) : '',
      ownerEmail: store.owner_email || '',
      ownerPassword: '',
      shortDescription: store.short_description || '',
      description: store.description || '',
      planExpiresAt: store.plan_expires_at ? store.plan_expires_at.slice(0, 10) : '',
      newEmail: '',
      newPassword: '',
    })
    setFormError('')
    setShowPassword(false)
    setIsDrawerOpen(true)
  }

  // Password generator
  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%'
    let pass = ''
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    if (selectedStore) {
      setFormValues((prev) => ({ ...prev, newPassword: pass }))
    } else {
      setFormValues((prev) => ({ ...prev, ownerPassword: pass }))
    }
    setShowPassword(true)
  }

  // Handle store creation and updates
  const handleSubmitStore = async (e) => {
    e.preventDefault()
    setFormError('')
    setSubmittingStore(true)

    // Form validations
    if (!formValues.name.trim()) {
      setFormError('Название магазина обязательно')
      setSubmittingStore(false)
      return
    }

    if (!selectedStore) {
      if (!formValues.slug.trim() || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(formValues.slug)) {
        setFormError('URL-адрес (slug) должен состоять из строчных латинских букв, цифр и дефисов')
        setSubmittingStore(false)
        return
      }
      if (
        !formValues.ownerEmail.trim() ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.ownerEmail)
      ) {
        setFormError('Введите корректный email владельца')
        setSubmittingStore(false)
        return
      }
      if (!formValues.ownerPassword || formValues.ownerPassword.length < 8) {
        setFormError('Пароль владельца должен быть не менее 8 символов')
        setSubmittingStore(false)
        return
      }
    }

    const rawPhone = formValues.phone.replace(/\D/g, '')
    const rawWhatsapp = formValues.whatsappNumber.replace(/\D/g, '')

    if (rawPhone && rawPhone.length !== 10) {
      setFormError('Телефон должен состоять из 10 цифр кода и номера')
      setSubmittingStore(false)
      return
    }
    if (rawWhatsapp && rawWhatsapp.length !== 10) {
      setFormError('WhatsApp должен состоять из 10 цифр кода и номера')
      setSubmittingStore(false)
      return
    }

    try {
      if (selectedStore) {
        // Edit mode: update details
        const detailsPayload = {
          action: 'update-store-details',
          storeId: selectedStore.id,
          name: formValues.name,
          type: formValues.type,
          plan: formValues.plan,
          city: formValues.city,
          address: formValues.address,
          phone: rawPhone ? `7${rawPhone}` : null,
          whatsappNumber: rawWhatsapp ? `7${rawWhatsapp}` : null,
          shortDescription: formValues.shortDescription,
          description: formValues.description,
          planExpiresAt: formValues.planExpiresAt || null,
        }

        const detailsResponse = await fetch('/api/admin-stores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(detailsPayload),
        })

        const detailsResult = await detailsResponse.json()
        if (!detailsResponse.ok || !detailsResult.ok) {
          throw new Error(
            detailsResult.message || detailsResult.error || 'Ошибка при обновлении данных магазина'
          )
        }

        // Edit mode: update owner credentials if provided
        if (formValues.newEmail || formValues.newPassword) {
          const authPayload = {
            action: 'update-owner-auth',
            ownerId: selectedStore.owner_id,
          }
          if (formValues.newEmail) {
            authPayload.newEmail = formValues.newEmail
          }
          if (formValues.newPassword) {
            authPayload.newPassword = formValues.newPassword
          }

          const authResponse = await fetch('/api/admin-stores', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(authPayload),
          })

          const authResult = await authResponse.json()
          if (!authResponse.ok || !authResult.ok) {
            throw new Error(
              authResult.message ||
                authResult.error ||
                'Данные сохранены, но не удалось изменить email/пароль владельца'
            )
          }
        }

        setSuccessMessage(`Магазин "${formValues.name}" успешно обновлен!`)
        setIsDrawerOpen(false)
        fetchStores()
        setTimeout(() => setSuccessMessage(''), 4000)
      } else {
        // Create mode
        const payload = {
          action: 'create',
          slug: formValues.slug,
          name: formValues.name,
          type: formValues.type,
          plan: formValues.plan,
          city: formValues.city,
          address: formValues.address,
          phone: rawPhone ? `7${rawPhone}` : undefined,
          whatsappNumber: rawWhatsapp ? `7${rawWhatsapp}` : undefined,
          shortDescription: formValues.shortDescription,
          description: formValues.description,
          ownerEmail: formValues.ownerEmail,
          ownerPassword: formValues.ownerPassword,
        }

        const response = await fetch('/api/admin-stores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        })

        const result = await response.json()
        if (response.ok && result.ok) {
          setSuccessMessage(`Магазин "${formValues.name}" успешно создан!`)
          setIsDrawerOpen(false)
          fetchStores()
          setTimeout(() => setSuccessMessage(''), 4000)
        } else {
          setFormError(result.message || result.error || 'Ошибка создания магазина')
        }
      }
    } catch (err) {
      console.error(err)
      setFormError(err.message || 'Ошибка сети')
    } finally {
      setSubmittingStore(false)
    }
  }

  // Handle active status toggle
  const handleToggleStoreStatus = async (storeId, currentStatus) => {
    // Optimistic update
    setStores((prev) =>
      prev.map((s) => (s.id === storeId ? { ...s, is_active: !currentStatus } : s))
    )

    try {
      const response = await fetch('/api/admin-stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'toggle-active',
          storeId,
          isActive: !currentStatus,
        }),
      })

      const result = await response.json()
      if (!response.ok || !result.ok) {
        // Revert on error
        setStores((prev) =>
          prev.map((s) => (s.id === storeId ? { ...s, is_active: currentStatus } : s))
        )
        alert(result.message || result.error || 'Не удалось обновить статус магазина')
      }
    } catch (err) {
      console.error(err)
      // Revert on error
      setStores((prev) =>
        prev.map((s) => (s.id === storeId ? { ...s, is_active: currentStatus } : s))
      )
      alert('Ошибка сети при переключении статуса')
    }
  }

  // Phone input mask handler (Aligns with RetailSettingsScreen)
  const handlePhoneChange = (key, rawValue) => {
    const prevLocal = formValues[key]
    const expectedDisplay = formatLocalPhone(prevLocal)

    let nextLocal = prevLocal
    if (rawValue.length > expectedDisplay.length + 1) {
      // Paste
      const all = rawValue.replace(/\D/g, '')
      nextLocal =
        all.length > 10 && (all.startsWith('7') || all.startsWith('8'))
          ? all.slice(1, 11)
          : all.slice(0, 10)
    } else if (rawValue.length > expectedDisplay.length) {
      // Single char added
      const newChar = rawValue.replace(/\D/g, '').slice(-1)
      if (/\d/.test(newChar)) nextLocal = (prevLocal + newChar).slice(0, 10)
    } else {
      // Delete
      nextLocal = prevLocal.slice(0, -1)
    }

    setFormValues((prev) => ({ ...prev, [key]: nextLocal }))
  }

  // Auto-slugify when store name changes
  const handleNameChange = (val) => {
    setFormValues((prev) => ({
      ...prev,
      name: val,
      slug: slugify(val),
    }))
  }

  // Filtered stores memo
  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const matchesSearch =
        (store.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (store.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (store.city || '').toLowerCase().includes(searchQuery.toLowerCase())

      const matchesPlan = planFilter === 'all' || store.plan === planFilter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && store.is_active) ||
        (statusFilter === 'inactive' && !store.is_active)

      return matchesSearch && matchesPlan && matchesStatus
    })
  }, [stores, searchQuery, planFilter, statusFilter])

  // Statistics memo
  const stats = useMemo(() => {
    const total = stores.length
    const active = stores.filter((s) => s.is_active).length
    const inactive = total - active
    return { total, active, inactive }
  }, [stores])

  if (authLoading) return <SuperAdminLoader />
  if (!user) return <Navigate to="/auth" replace />
  if (!isSuperadmin) return <NoAccessScreen />

  return (
    <div className="superadmin-screen-container">
      {/* Toast Alert */}
      {successMessage && (
        <div className="superadmin-toast success">
          <span className="material-symbols-outlined">check_circle</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="superadmin-header">
        <div>
          <h1 className="superadmin-title">Управление магазинами</h1>
          <p className="superadmin-subtitle">Панель супер-администратора Körset</p>
        </div>
        <div className="header-actions-row">
          <button
            className="refresh-stores-btn"
            onClick={fetchStores}
            disabled={loadingStores}
            title="Обновить список"
          >
            <span className="material-symbols-outlined">sync</span>
          </button>
          <button className="create-store-btn" onClick={openCreateDrawer}>
            <span className="material-symbols-outlined">add</span>
            Добавить магазин
          </button>
        </div>
      </div>

      {/* Bento Statistics Cards */}
      <div className="superadmin-bento-grid">
        <div className="superadmin-bento-card">
          <div className="bento-card-header">
            <span className="material-symbols-outlined bento-icon">storefront</span>
            <span className="bento-label">Всего магазинов</span>
          </div>
          <div className="bento-value">{stats.total}</div>
        </div>
        <div className="superadmin-bento-card active">
          <div className="bento-card-header">
            <span className="material-symbols-outlined bento-icon">check_circle</span>
            <span className="bento-label">Активные</span>
          </div>
          <div className="bento-value">{stats.active}</div>
        </div>
        <div className="superadmin-bento-card inactive">
          <div className="bento-card-header">
            <span className="material-symbols-outlined bento-icon">cancel</span>
            <span className="bento-label">Неактивные</span>
          </div>
          <div className="bento-value">{stats.inactive}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="superadmin-filters-bar">
        <div className="search-box-wrapper">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            placeholder="Поиск по названию, slug или городу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filters-selectors">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Все тарифы</option>
            <option value="pilot">Pilot</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="inactive">Неактивные</option>
          </select>
        </div>
      </div>

      {/* Store list */}
      {loadingStores ? (
        <div className="superadmin-stores-loading">
          <div className="superadmin-spinner" />
          <span style={{ color: 'var(--text-sub)', fontSize: 14 }}>
            Загрузка каталога магазинов...
          </span>
        </div>
      ) : errorMessage ? (
        <div className="superadmin-error-box">
          <span className="material-symbols-outlined">error</span>
          <span>{errorMessage}</span>
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="superadmin-empty-box">
          <span className="material-symbols-outlined">storefront</span>
          <h3>Магазины не найдены</h3>
          <p>Попробуйте изменить параметры поиска или фильтрации.</p>
        </div>
      ) : (
        <div className="superadmin-stores-grid">
          {filteredStores.map((store) => (
            <div
              key={store.id}
              className={`store-dashboard-card ${!store.is_active ? 'inactive-card' : ''}`}
            >
              <div className="store-card-top">
                <div className="store-logo-box">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt="Logo" className="store-logo-img" />
                  ) : (
                    <span className="material-symbols-outlined store-fallback-icon">store</span>
                  )}
                </div>
                <div className="status-toggle-wrapper">
                  <span className={`status-text-badge ${store.is_active ? 'active' : 'inactive'}`}>
                    {store.is_active ? 'Активен' : 'Отключен'}
                  </span>
                  <button
                    className={`toggle-switch-btn ${store.is_active ? 'on' : 'off'}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleStoreStatus(store.id, store.is_active)
                    }}
                  >
                    <span className="material-symbols-outlined">
                      {store.is_active ? 'toggle_on' : 'toggle_off'}
                    </span>
                  </button>
                  <button
                    className="store-edit-icon-btn"
                    title="Редактировать магазин"
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditDrawer(store)
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      edit
                    </span>
                  </button>
                </div>
              </div>

              <div
                className="store-card-info"
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <h3 className="store-card-name">{store.name}</h3>

                <div className="store-card-links">
                  <a
                    href={`/s/${store.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="store-link-tag public"
                  >
                    <span className="material-symbols-outlined">visibility</span>
                    Витрина: {store.code}
                  </a>
                  <a
                    href={`/retail/${store.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="store-link-tag retail"
                  >
                    <span className="material-symbols-outlined">login</span>
                    Войти в кабинет
                  </a>
                </div>

                {/* Plan Info */}
                <div className="plan-badge-row">
                  <span className={`plan-badge-pill ${store.plan}`}>
                    {store.plan.toUpperCase()}
                  </span>
                  <span className="plan-expiry-text">
                    {store.plan_expires_at
                      ? `до ${new Date(store.plan_expires_at).toLocaleDateString('ru-RU')}`
                      : 'Бессрочно'}
                  </span>
                </div>

                {/* Metrics Grid */}
                <div className="store-metrics-grid">
                  <div className="metric-box">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 18, color: 'var(--text-dim)' }}
                    >
                      inventory_2
                    </span>
                    <span className="metric-num">{store.catalog_count ?? 0}</span>
                    <span className="metric-lbl">Товары</span>
                  </div>
                  <div className="metric-box">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 18, color: 'var(--text-dim)' }}
                    >
                      qr_code_scanner
                    </span>
                    <span className="metric-num">{store.scan_count ?? 0}</span>
                    <span className="metric-lbl">Сканы</span>
                  </div>
                  <div className={`metric-box ${store.ean_recovery_count > 0 ? 'alert' : ''}`}>
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: 18,
                        color:
                          store.ean_recovery_count > 0 ? 'var(--error-bright)' : 'var(--text-dim)',
                      }}
                    >
                      report
                    </span>
                    <span className="metric-num">{store.ean_recovery_count ?? 0}</span>
                    <span className="metric-lbl">Ошибки EAN</span>
                  </div>
                </div>

                <div className="store-meta-details" style={{ marginTop: 0, paddingTop: 8 }}>
                  <div className="meta-detail-row">
                    <span className="material-symbols-outlined detail-icon">location_on</span>
                    <span className="detail-text">
                      {store.city}, {store.address || 'Адрес не указан'}
                    </span>
                  </div>
                  <div className="meta-detail-row">
                    <span className="material-symbols-outlined detail-icon">mail</span>
                    <span className="detail-text" title="Email владельца">
                      {store.owner_email || 'Нет почты'}
                    </span>
                  </div>
                  {store.phone && (
                    <div className="meta-detail-row">
                      <span className="material-symbols-outlined detail-icon">phone</span>
                      <span className="detail-text">
                        {formatLocalPhone(initLocalPhone(store.phone))}
                      </span>
                    </div>
                  )}
                  <div className="meta-detail-row">
                    <span className="material-symbols-outlined detail-icon">calendar_month</span>
                    <span className="detail-text">
                      Создан: {new Date(store.created_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sliding Drawer */}
      <div
        className={`superadmin-drawer-overlay ${isDrawerOpen ? 'open' : ''}`}
        onClick={() => setIsDrawerOpen(false)}
      >
        <div className="superadmin-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <h3>{selectedStore ? 'Редактирование магазина' : 'Новый магазин'}</h3>
            <button className="drawer-close-btn" onClick={() => setIsDrawerOpen(false)}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmitStore} className="drawer-form-content">
            {formError && (
              <div className="drawer-form-error">
                <span className="material-symbols-outlined">error</span>
                <span>{formError}</span>
              </div>
            )}

            <div className="form-group">
              <label>Название магазина *</label>
              <input
                type="text"
                required
                value={formValues.name}
                placeholder="Например, Магазин Марс"
                onChange={(e) => handleNameChange(e.target.value)}
                className="drawer-input"
              />
            </div>

            <div className="form-group">
              <label>URL-адрес (Slug) *</label>
              <input
                type="text"
                required
                disabled={!!selectedStore}
                value={formValues.slug}
                placeholder="Например, mars"
                onChange={(e) => setFormValues((prev) => ({ ...prev, slug: e.target.value }))}
                className="drawer-input"
                style={selectedStore ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
              />
              <span className="input-hint">Ссылка: korset.app/s/{formValues.slug || '...'}</span>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Тип магазина *</label>
                <select
                  value={formValues.type}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, type: e.target.value }))}
                  className="drawer-select"
                >
                  <option value="minimarket">Минимаркет</option>
                  <option value="supermarket">Супермаркет</option>
                  <option value="halal">Халал-маркет</option>
                  <option value="specialty">Специализированный</option>
                  <option value="other">Другое</option>
                </select>
              </div>
              <div className="form-group">
                <label>Тарифный план *</label>
                <select
                  value={formValues.plan}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, plan: e.target.value }))}
                  className="drawer-select"
                >
                  <option value="pilot">Pilot</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Срок действия тарифа (оставьте пустым для бессрочного)</label>
              <input
                type="date"
                value={formValues.planExpiresAt}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, planExpiresAt: e.target.value }))
                }
                className="drawer-input"
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Город *</label>
                <input
                  type="text"
                  required
                  value={formValues.city}
                  placeholder="Усть-Каменогорск"
                  onChange={(e) => setFormValues((prev) => ({ ...prev, city: e.target.value }))}
                  className="drawer-input"
                />
              </div>
              <div className="form-group">
                <label>Адрес магазина</label>
                <input
                  type="text"
                  value={formValues.address}
                  placeholder="ул. Абая, 15"
                  onChange={(e) => setFormValues((prev) => ({ ...prev, address: e.target.value }))}
                  className="drawer-input"
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Телефон магазина</label>
                <input
                  type="tel"
                  value={formatLocalPhone(formValues.phone)}
                  onChange={(e) => handlePhoneChange('phone', e.target.value)}
                  placeholder="+7 (700) 000-00-00"
                  className="drawer-input"
                />
              </div>
              <div className="form-group">
                <label>WhatsApp магазина</label>
                <input
                  type="tel"
                  value={formatLocalPhone(formValues.whatsappNumber)}
                  onChange={(e) => handlePhoneChange('whatsappNumber', e.target.value)}
                  placeholder="+7 (700) 000-00-00"
                  className="drawer-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Короткое описание (Max 240 символов)</label>
              <input
                type="text"
                value={formValues.shortDescription}
                placeholder="Минимаркет у дома с расширенным ассортиментом..."
                maxLength={240}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, shortDescription: e.target.value }))
                }
                className="drawer-input"
              />
            </div>

            <div className="form-group">
              <label>Полное описание (Max 1200 символов)</label>
              <textarea
                value={formValues.description}
                placeholder="Полное описание..."
                rows={3}
                maxLength={1200}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, description: e.target.value }))
                }
                className="drawer-textarea"
              />
            </div>

            {selectedStore ? (
              <>
                <div className="drawer-section-title">Аккаунт владельца</div>
                <div className="form-group">
                  <label>Текущий Email владельца</label>
                  <input
                    type="text"
                    disabled
                    value={formValues.ownerEmail || 'Нет привязки'}
                    className="drawer-input"
                    style={{ opacity: 0.7, cursor: 'not-allowed' }}
                  />
                </div>
                <div className="form-group">
                  <label>Новый Email владельца (опционально)</label>
                  <input
                    type="email"
                    value={formValues.newEmail}
                    placeholder="owner-new@korset.kz"
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, newEmail: e.target.value }))
                    }
                    className="drawer-input"
                  />
                </div>
                <div className="form-group">
                  <label>Смена пароля владельца (опционально)</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formValues.newPassword}
                      placeholder="Новый пароль владельца"
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                      className="drawer-input"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="drawer-select"
                      style={{
                        width: 'auto',
                        padding: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Показать/скрыть"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="create-store-btn"
                      style={{
                        padding: '11px 14px',
                        fontSize: 12,
                        borderRadius: 10,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Сгенерировать
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="drawer-section-title">Аккаунт владельца</div>
                <div className="form-group">
                  <label>Email владельца *</label>
                  <input
                    type="email"
                    required
                    value={formValues.ownerEmail}
                    placeholder="owner@korset.kz"
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, ownerEmail: e.target.value }))
                    }
                    className="drawer-input"
                  />
                </div>
                <div className="form-group">
                  <label>Пароль владельца *</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formValues.ownerPassword}
                      placeholder="Минимум 8 символов"
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, ownerPassword: e.target.value }))
                      }
                      className="drawer-input"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="drawer-select"
                      style={{
                        width: 'auto',
                        padding: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Показать/скрыть"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="create-store-btn"
                      style={{
                        padding: '11px 14px',
                        fontSize: 12,
                        borderRadius: 10,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Сгенерировать
                    </button>
                  </div>
                </div>
              </>
            )}

            <button type="submit" disabled={submittingStore} className="drawer-submit-btn">
              {submittingStore ? (
                <>
                  <div className="superadmin-spinner spinner-small" />
                  Сохранение...
                </>
              ) : (
                <>{selectedStore ? 'Сохранить изменения' : 'Создать магазин'}</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
