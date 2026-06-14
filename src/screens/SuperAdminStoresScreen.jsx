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

function MiniSparkline({ activity }) {
  if (!activity || activity.length === 0) return null
  const points = activity.map((d) => d.count)
  const max = Math.max(...points, 1)
  const width = 80
  const height = 24
  const padding = 2

  const pts = activity
    .map((d, i) => {
      const x = padding + (i / (activity.length - 1)) * (width - 2 * padding)
      const y = height - padding - (d.count / max) * (height - 2 * padding)
      return `${x},${y}`
    })
    .join(' ')

  const hasScans = points.some((p) => p > 0)

  return (
    <div
      className="store-sparkline"
      title="Активность сканирований за 14 дней"
      style={{ opacity: hasScans ? 0.95 : 0.45 }}
    >
      <svg width={width} height={height}>
        {hasScans ? (
          <polyline
            fill="none"
            stroke="var(--primary-bright)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pts}
          />
        ) : (
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="var(--text-dim)"
            strokeWidth="1.2"
            strokeDasharray="2"
          />
        )}
      </svg>
    </div>
  )
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

  // Scan activity stats for charts
  const [scanActivity, setScanActivity] = useState({})
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [hoveredPoint, setHoveredPoint] = useState(null) // { cx, cy, date, count }

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

  // Owner management states
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('')
  const [ownerSearchResults, setOwnerSearchResults] = useState([])
  const [searchingOwners, setSearchingOwners] = useState(false)
  const [selectedOwner, setSelectedOwner] = useState(null) // { id, email, name, is_superadmin }
  const [ownerMode, setOwnerMode] = useState('new') // 'new' | 'existing'

  // Handle owner search
  const handleSearchOwners = async (query) => {
    setOwnerSearchQuery(query)
    if (!query.trim()) {
      setOwnerSearchResults([])
      return
    }
    setSearchingOwners(true)
    try {
      const response = await fetch('/api/admin-stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: 'search-owners', searchQuery: query }),
      })
      const result = await response.json()
      if (response.ok && result.ok) {
        setOwnerSearchResults(result.users || [])
      }
    } catch (err) {
      console.error('Failed to search owners:', err)
    } finally {
      setSearchingOwners(false)
    }
  }

  // Fetch scan activity
  const fetchScanActivity = async () => {
    if (!session?.access_token) return
    setLoadingActivity(true)
    try {
      const response = await fetch('/api/admin-stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'scan-activity' }),
      })
      if (!response.ok) {
        const text = await response.text()
        console.error('[superadmin] fetchScanActivity non-ok', response.status, text.slice(0, 200))
        return
      }
      const result = await response.json()
      if (result.ok) {
        setScanActivity(result.activity || {})
      }
    } catch (err) {
      console.error('[superadmin] fetchScanActivity error', err)
    } finally {
      setLoadingActivity(false)
    }
  }
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
    isPublished: true,
    ownerPrivatePhone: '',
    ownerPrivateNotes: '',
    isSuperadminRole: false,
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
      if (!response.ok) {
        const text = await response.text()
        console.error('[superadmin] fetchStores non-ok', response.status, text.slice(0, 200))
        setErrorMessage(`Ошибка сервера (${response.status})`)
        return
      }
      const result = await response.json()
      if (result.ok) {
        setStores(result.stores || [])
      } else {
        setErrorMessage(result.error || 'Не удалось загрузить список магазинов')
      }
    } catch (err) {
      console.error('[superadmin] fetchStores error', err)
      setErrorMessage('Ошибка сети при загрузке магазинов')
    } finally {
      setLoadingStores(false)
    }
  }

  useEffect(() => {
    if (isSuperadmin && session) {
      fetchStores()
      fetchScanActivity()
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
      isPublished: true,
      ownerPrivatePhone: '',
      ownerPrivateNotes: '',
      isSuperadminRole: false,
    })
    setFormError('')
    setShowPassword(false)
    setSelectedOwner(null)
    setOwnerSearchQuery('')
    setOwnerSearchResults([])
    setOwnerMode('new')
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
      isPublished: store.is_published !== false,
      ownerPrivatePhone: store.owner_private_phone ? initLocalPhone(store.owner_private_phone) : '',
      ownerPrivateNotes: store.owner_private_notes || '',
      isSuperadminRole: Boolean(store.owner_is_superadmin),
    })
    setFormError('')
    setShowPassword(false)
    setSelectedOwner({
      id: store.owner_id,
      email: store.owner_email,
      name: store.owner_email ? store.owner_email.split('@')[0] : 'Владелец',
      is_superadmin: Boolean(store.owner_is_superadmin),
    })
    setOwnerSearchQuery('')
    setOwnerSearchResults([])
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

  // Billing date presets helper
  const addPlanMonths = (months) => {
    const base = formValues.planExpiresAt ? new Date(formValues.planExpiresAt) : new Date()
    base.setMonth(base.getMonth() + months)
    setFormValues((prev) => ({
      ...prev,
      planExpiresAt: base.toISOString().slice(0, 10),
    }))
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
      if (ownerMode === 'new') {
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
      } else {
        if (!selectedOwner) {
          setFormError('Выберите существующего пользователя в качестве владельца')
          setSubmittingStore(false)
          return
        }
      }
    }

    const rawPhone = formValues.phone.replace(/\D/g, '')
    const rawWhatsapp = formValues.whatsappNumber.replace(/\D/g, '')
    const rawPrivatePhone = formValues.ownerPrivatePhone.replace(/\D/g, '')

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
    if (rawPrivatePhone && rawPrivatePhone.length !== 10) {
      setFormError('Личный телефон владельца должен состоять из 10 цифр кода и номера')
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
          isPublished: formValues.isPublished,
          ownerPrivatePhone: rawPrivatePhone ? `7${rawPrivatePhone}` : null,
          ownerPrivateNotes: formValues.ownerPrivateNotes,
          ownerId: selectedOwner ? selectedOwner.id : undefined,
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

        // Edit mode: toggle superadmin privileges if changed
        const targetOwnerId = selectedOwner ? selectedOwner.id : selectedStore.owner_id
        const currentIsSuperadmin = selectedOwner
          ? Boolean(selectedOwner.is_superadmin)
          : Boolean(selectedStore.owner_is_superadmin)

        if (formValues.isSuperadminRole !== currentIsSuperadmin) {
          const superadminResponse = await fetch('/api/admin-stores', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              action: 'toggle-superadmin',
              targetUserId: targetOwnerId,
              isActive: formValues.isSuperadminRole,
            }),
          })
          const superadminResult = await superadminResponse.json()
          if (!superadminResponse.ok || !superadminResult.ok) {
            throw new Error(
              superadminResult.message ||
                superadminResult.error ||
                'Не удалось обновить статус супер-администратора'
            )
          }
        }

        // Edit mode: update owner credentials if provided (only if we didn't assign a new existing owner)
        const isNewOwnerAssigned = selectedOwner && selectedOwner.id !== selectedStore.owner_id
        if (!isNewOwnerAssigned && (formValues.newEmail || formValues.newPassword)) {
          const authPayload = {
            action: 'update-owner-auth',
            ownerId: targetOwnerId,
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
          isPublished: formValues.isPublished,
          ownerPrivatePhone: rawPrivatePhone ? `7${rawPrivatePhone}` : undefined,
          ownerPrivateNotes: formValues.ownerPrivateNotes,
        }

        if (ownerMode === 'new') {
          payload.ownerEmail = formValues.ownerEmail
          payload.ownerPassword = formValues.ownerPassword
        } else {
          payload.ownerId = selectedOwner.id
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
          const newOwnerId = result.store?.owner_id

          // Toggle superadmin privileges if necessary
          const shouldToggle =
            ownerMode === 'new'
              ? formValues.isSuperadminRole
              : selectedOwner &&
                formValues.isSuperadminRole !== Boolean(selectedOwner.is_superadmin)

          if (shouldToggle && newOwnerId) {
            await fetch('/api/admin-stores', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                action: 'toggle-superadmin',
                targetUserId: newOwnerId,
                isActive: formValues.isSuperadminRole,
              }),
            })
          }

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

  // Helper for date formatting
  const formatDateShort = (dateStr) => {
    if (!dateStr) return ''
    const parts = dateStr.split('-')
    return `${parts[2]}.${parts[1]}` // DD.MM
  }

  const formatDateFull = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    })
  }

  // Generate last 14 days YYYY-MM-DD
  const last14Days = useMemo(() => {
    const dates = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(d.toISOString().slice(0, 10))
    }
    return dates
  }, [])

  // Aggregate daily scans globally
  const dailyGlobalScans = useMemo(() => {
    return last14Days.map((date) => {
      let count = 0
      Object.keys(scanActivity).forEach((storeId) => {
        count += scanActivity[storeId]?.[date] || 0
      })
      return { date, count }
    })
  }, [last14Days, scanActivity])

  // Chart coordinate calculations
  const maxVal = useMemo(() => {
    const vals = dailyGlobalScans.map((d) => d.count)
    return Math.max(...vals, 5) // Min scale of 5 scans
  }, [dailyGlobalScans])

  const pointsStr = useMemo(() => {
    const PaddingLeft = 40
    const PaddingRight = 20
    const Width = 600
    const Height = 160
    const PaddingBottom = 30
    const PaddingTop = 20

    const colWidth = (Width - PaddingLeft - PaddingRight) / 13
    const chartHeight = Height - PaddingTop - PaddingBottom

    return dailyGlobalScans
      .map((d, i) => {
        const x = PaddingLeft + i * colWidth
        const y = Height - PaddingBottom - (d.count / maxVal) * chartHeight
        return `${x},${y}`
      })
      .join(' ')
  }, [dailyGlobalScans, maxVal])

  // Statistics memo
  const stats = useMemo(() => {
    const total = stores.length
    const active = stores.filter((s) => s.is_active).length
    const inactive = total - active
    const drafts = stores.filter((s) => !s.is_published).length
    const published = total - drafts
    const totalCatalog = stores.reduce((sum, s) => sum + (s.catalog_count || 0), 0)
    const totalScans = stores.reduce((sum, s) => sum + (s.scan_count || 0), 0)
    const totalEanErrors = stores.reduce((sum, s) => sum + (s.ean_recovery_count || 0), 0)
    return {
      total,
      active,
      inactive,
      drafts,
      published,
      totalCatalog,
      totalScans,
      totalEanErrors,
    }
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
            onClick={() => {
              fetchStores()
              fetchScanActivity()
            }}
            disabled={loadingStores || loadingActivity}
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

      {/* Bento Statistics Grid */}
      <div className="superadmin-bento-layout">
        <div className="superadmin-bento-grid">
          <div className="superadmin-bento-card">
            <div className="bento-card-header">
              <span className="material-symbols-outlined bento-icon">storefront</span>
              <span className="bento-label">Всего магазинов</span>
            </div>
            <div className="bento-value">{stats.total}</div>
            <div className="bento-footer-desc">
              {stats.active} активных · {stats.drafts} черновиков
            </div>
          </div>
          <div className="superadmin-bento-card">
            <div className="bento-card-header">
              <span className="material-symbols-outlined bento-icon">inventory_2</span>
              <span className="bento-label">Суммарный каталог</span>
            </div>
            <div className="bento-value">{stats.totalCatalog.toLocaleString()}</div>
            <div className="bento-footer-desc">товаров на витринах</div>
          </div>
          <div className="superadmin-bento-card">
            <div className="bento-card-header">
              <span className="material-symbols-outlined bento-icon">qr_code_scanner</span>
              <span className="bento-label">Всего сканирований</span>
            </div>
            <div className="bento-value">{stats.totalScans.toLocaleString()}</div>
            <div className="bento-footer-desc">активность покупателей</div>
          </div>
          <div
            className={`superadmin-bento-card ${stats.totalEanErrors > 0 ? 'error-alert-card' : ''}`}
          >
            <div className="bento-card-header">
              <span className="material-symbols-outlined bento-icon">report</span>
              <span className="bento-label">Ошибки EAN</span>
            </div>
            <div className="bento-value">{stats.totalEanErrors}</div>
            <div className="bento-footer-desc">
              {stats.totalEanErrors > 0 ? 'требуют модерации' : 'нет ошибок'}
            </div>
          </div>
        </div>

        {/* Global Platform Activity Chart */}
        <div className="superadmin-bento-card chart-card">
          <div className="bento-card-header">
            <span className="material-symbols-outlined bento-icon">analytics</span>
            <span className="bento-label">Активность платформы (сканы за 14 дней)</span>
          </div>
          <div className="chart-container-wrapper" style={{ position: 'relative', marginTop: 12 }}>
            {loadingActivity ? (
              <div className="chart-loading-overlay">
                <div className="superadmin-spinner spinner-small" />
              </div>
            ) : (
              <>
                <svg viewBox="0 0 600 160" width="100%" height="100%">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary-bright)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--primary-bright)" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  <line
                    x1="40"
                    y1="20"
                    x2="580"
                    y2="20"
                    stroke="var(--glass-soft-border)"
                    strokeDasharray="3"
                  />
                  <line
                    x1="40"
                    y1="75"
                    x2="580"
                    y2="75"
                    stroke="var(--glass-soft-border)"
                    strokeDasharray="3"
                  />
                  <line x1="40" y1="130" x2="580" y2="130" stroke="var(--glass-soft-border)" />

                  {/* Y Axis Labels */}
                  <text x="30" y="24" textAnchor="end" fill="var(--text-dim)" fontSize="10">
                    {Math.round(maxVal)}
                  </text>
                  <text x="30" y="79" textAnchor="end" fill="var(--text-dim)" fontSize="10">
                    {Math.round(maxVal / 2)}
                  </text>
                  <text x="30" y="134" textAnchor="end" fill="var(--text-dim)" fontSize="10">
                    0
                  </text>

                  {/* X Axis Date Labels */}
                  <text x="40" y="150" fill="var(--text-dim)" fontSize="10" textAnchor="start">
                    {formatDateShort(dailyGlobalScans[0]?.date)}
                  </text>
                  <text x="310" y="150" fill="var(--text-dim)" fontSize="10" textAnchor="middle">
                    {formatDateShort(dailyGlobalScans[7]?.date)}
                  </text>
                  <text x="580" y="150" fill="var(--text-dim)" fontSize="10" textAnchor="end">
                    {formatDateShort(dailyGlobalScans[13]?.date)}
                  </text>

                  {/* Filled Area */}
                  {pointsStr && (
                    <polygon fill="url(#chartGrad)" points={`40,130 ${pointsStr} 580,130`} />
                  )}

                  {/* Line */}
                  {pointsStr && (
                    <polyline
                      fill="none"
                      stroke="var(--primary-bright)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={pointsStr}
                    />
                  )}

                  {/* Dotted line on hover */}
                  {hoveredPoint && (
                    <line
                      x1={hoveredPoint.cx}
                      y1="20"
                      x2={hoveredPoint.cx}
                      y2="130"
                      stroke="var(--primary-bright)"
                      strokeWidth="1"
                      strokeDasharray="2"
                    />
                  )}

                  {/* Interactive columns overlay */}
                  {dailyGlobalScans.map((d, i) => {
                    const colWidth = (580 - 40) / 13
                    const cx = 40 + i * colWidth
                    const chartHeight = 130 - 20
                    const cy = 130 - (d.count / maxVal) * chartHeight
                    return (
                      <rect
                        key={i}
                        x={cx - colWidth / 2}
                        y="20"
                        width={colWidth}
                        height="110"
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() =>
                          setHoveredPoint({
                            cx,
                            cy,
                            date: d.date,
                            count: d.count,
                          })
                        }
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    )
                  })}

                  {/* Highlight circle on hover */}
                  {hoveredPoint && (
                    <circle
                      cx={hoveredPoint.cx}
                      cy={hoveredPoint.cy}
                      r="5"
                      fill="var(--primary-bright)"
                      stroke="var(--bg)"
                      strokeWidth="2"
                    />
                  )}
                </svg>

                {/* Tooltip */}
                {hoveredPoint && (
                  <div
                    className="chart-tooltip"
                    style={{
                      position: 'absolute',
                      left: `${((hoveredPoint.cx - 40) / (580 - 40)) * 100}%`,
                      marginLeft: '40px',
                      top: `${((hoveredPoint.cy - 20) / (130 - 20)) * 100 - 30}%`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <span className="tooltip-date">{formatDateFull(hoveredPoint.date)}</span>
                    <span className="tooltip-value">{hoveredPoint.count} сканов</span>
                  </div>
                )}
              </>
            )}
          </div>
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
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <h3 className="store-card-name">{store.name}</h3>
                  <MiniSparkline
                    activity={last14Days.map((date) => ({
                      date,
                      count: scanActivity[store.id]?.[date] || 0,
                    }))}
                  />
                </div>

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
              <div
                className="plan-preset-buttons"
                style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}
              >
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => addPlanMonths(1)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    background: 'var(--glass-subtle)',
                    border: '1px solid var(--glass-soft-border)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  +1 мес.
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => addPlanMonths(3)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    background: 'var(--glass-subtle)',
                    border: '1px solid var(--glass-soft-border)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  +3 мес.
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => addPlanMonths(6)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    background: 'var(--glass-subtle)',
                    border: '1px solid var(--glass-soft-border)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  +6 мес.
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => addPlanMonths(12)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    background: 'var(--glass-subtle)',
                    border: '1px solid var(--glass-soft-border)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  +1 год
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => setFormValues((prev) => ({ ...prev, planExpiresAt: '' }))}
                  style={{
                    padding: '6px 10px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    background: 'var(--glass-subtle)',
                    border: '1px solid var(--glass-soft-border)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  Бессрочно
                </button>
              </div>
            </div>

            <div
              className="form-group checkbox-group"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}
            >
              <input
                type="checkbox"
                id="isPublished"
                checked={formValues.isPublished}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, isPublished: e.target.checked }))
                }
                style={{ width: 'auto', cursor: 'pointer' }}
              />
              <label
                htmlFor="isPublished"
                style={{
                  cursor: 'pointer',
                  userSelect: 'none',
                  margin: 0,
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-sub)',
                }}
              >
                Опубликовать магазин (витрина будет доступна всем)
              </label>
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

            <div className="drawer-section-title">Секретные CRM-контакты (Только супер-админ)</div>
            <div className="form-row-2">
              <div className="form-group">
                <label>Приватный телефон владельца</label>
                <input
                  type="tel"
                  value={formatLocalPhone(formValues.ownerPrivatePhone)}
                  onChange={(e) => handlePhoneChange('ownerPrivatePhone', e.target.value)}
                  placeholder="+7 (700) 000-00-00"
                  className="drawer-input"
                />
              </div>
              <div className="form-group">
                <label>Приватные заметки о сделке</label>
                <textarea
                  value={formValues.ownerPrivateNotes}
                  placeholder="Скрытые примечания супер-администратора..."
                  rows={2}
                  maxLength={1000}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, ownerPrivateNotes: e.target.value }))
                  }
                  className="drawer-textarea"
                />
              </div>
            </div>

            {selectedStore ? (
              <>
                <div className="drawer-section-title">Владелец магазина</div>
                <div className="form-group">
                  <label>Текущий Владелец</label>
                  <div
                    className="current-owner-box"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--glass-subtle)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--glass-soft-border)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>
                        {selectedOwner?.name || 'Владелец'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        {selectedOwner?.email || formValues.ownerEmail || 'Нет почты'}
                      </div>
                    </div>
                    <span
                      className="material-symbols-outlined"
                      style={{ color: 'var(--primary-bright)' }}
                    >
                      person
                    </span>
                  </div>
                </div>

                <div
                  className="form-group checkbox-group"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}
                >
                  <input
                    type="checkbox"
                    id="isSuperadminRole"
                    checked={formValues.isSuperadminRole}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, isSuperadminRole: e.target.checked }))
                    }
                    style={{ width: 'auto', cursor: 'pointer' }}
                  />
                  <label
                    htmlFor="isSuperadminRole"
                    style={{
                      cursor: 'pointer',
                      userSelect: 'none',
                      margin: 0,
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-sub)',
                    }}
                  >
                    Права супер-администратора (Super Admin)
                  </label>
                </div>

                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Сменить владельца на существующего (Поиск по Email / Имени)</label>
                  <input
                    type="text"
                    value={ownerSearchQuery}
                    placeholder="Введите email или имя пользователя..."
                    onChange={(e) => handleSearchOwners(e.target.value)}
                    className="drawer-input"
                  />
                  {searchingOwners && (
                    <div style={{ position: 'absolute', right: 12, top: '34px' }}>
                      <div className="superadmin-spinner spinner-small" />
                    </div>
                  )}
                  {ownerSearchResults.length > 0 && (
                    <div
                      className="owner-search-results-dropdown"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'var(--bg)',
                        border: '1px solid var(--glass-soft-border)',
                        borderRadius: '8px',
                        zIndex: 10,
                        maxHeight: '160px',
                        overflowY: 'auto',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        marginTop: '4px',
                      }}
                    >
                      {ownerSearchResults.map((u) => (
                        <div
                          key={u.id}
                          className="owner-search-item"
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--glass-soft-border)',
                            fontSize: '13px',
                          }}
                          onClick={() => {
                            setSelectedOwner(u)
                            setOwnerSearchQuery('')
                            setOwnerSearchResults([])
                            setFormValues((prev) => ({
                              ...prev,
                              ownerEmail: u.email,
                              isSuperadminRole: u.is_superadmin,
                            }))
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{u.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                            {u.email}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {(!selectedOwner || selectedOwner.id === selectedStore.owner_id) && (
                  <>
                    <div className="form-group">
                      <label>Сменить Email владельца (опционально)</label>
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
                      <label>Сменить пароль владельца (опционально)</label>
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
                )}
              </>
            ) : (
              <>
                <div className="drawer-section-title">Аккаунт владельца</div>

                <div
                  className="owner-mode-tabs"
                  style={{ display: 'flex', gap: 8, marginBottom: 12 }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setOwnerMode('new')
                      setSelectedOwner(null)
                      setFormValues((prev) => ({ ...prev, ownerEmail: '' }))
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: '1px solid var(--glass-soft-border)',
                      background:
                        ownerMode === 'new' ? 'var(--primary-bright)' : 'var(--glass-subtle)',
                      color: ownerMode === 'new' ? 'var(--text-inverse)' : 'var(--text)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    Новый пользователь
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOwnerMode('existing')
                      setFormValues((prev) => ({ ...prev, ownerEmail: '' }))
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: '1px solid var(--glass-soft-border)',
                      background:
                        ownerMode === 'existing' ? 'var(--primary-bright)' : 'var(--glass-subtle)',
                      color: ownerMode === 'existing' ? 'var(--text-inverse)' : 'var(--text)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    Существующий пользователь
                  </button>
                </div>

                {ownerMode === 'new' ? (
                  <>
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
                ) : (
                  <>
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label>Поиск владельца (По email или имени)</label>
                      <input
                        type="text"
                        value={ownerSearchQuery}
                        placeholder="Введите email или имя для поиска..."
                        onChange={(e) => handleSearchOwners(e.target.value)}
                        className="drawer-input"
                      />
                      {searchingOwners && (
                        <div style={{ position: 'absolute', right: 12, top: '34px' }}>
                          <div className="superadmin-spinner spinner-small" />
                        </div>
                      )}
                      {ownerSearchResults.length > 0 && (
                        <div
                          className="owner-search-results-dropdown"
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: 'var(--bg)',
                            border: '1px solid var(--glass-soft-border)',
                            borderRadius: '8px',
                            zIndex: 10,
                            maxHeight: '160px',
                            overflowY: 'auto',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            marginTop: '4px',
                          }}
                        >
                          {ownerSearchResults.map((u) => (
                            <div
                              key={u.id}
                              className="owner-search-item"
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--glass-soft-border)',
                                fontSize: '13px',
                              }}
                              onClick={() => {
                                setSelectedOwner(u)
                                setOwnerSearchQuery('')
                                setOwnerSearchResults([])
                                setFormValues((prev) => ({
                                  ...prev,
                                  ownerEmail: u.email,
                                  isSuperadminRole: u.is_superadmin,
                                }))
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>{u.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                {u.email}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedOwner && (
                      <div className="form-group">
                        <label>Выбранный владелец</label>
                        <div
                          className="current-owner-box"
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--glass-subtle)',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--glass-soft-border)',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>
                              {selectedOwner.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              {selectedOwner.email}
                            </div>
                          </div>
                          <span
                            className="material-symbols-outlined"
                            style={{ color: 'var(--primary-bright)' }}
                          >
                            person
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div
                  className="form-group checkbox-group"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}
                >
                  <input
                    type="checkbox"
                    id="isSuperadminRole"
                    checked={formValues.isSuperadminRole}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, isSuperadminRole: e.target.checked }))
                    }
                    style={{ width: 'auto', cursor: 'pointer' }}
                  />
                  <label
                    htmlFor="isSuperadminRole"
                    style={{
                      cursor: 'pointer',
                      userSelect: 'none',
                      margin: 0,
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-sub)',
                    }}
                  >
                    Назначить владельца супер-администратором (Super Admin)
                  </label>
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
