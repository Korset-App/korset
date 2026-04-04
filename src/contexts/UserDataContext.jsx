import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../utils/supabase.js'
import { useAuth } from './AuthContext.jsx'

const UserDataContext = createContext()

export function UserDataProvider({ children }) {
  const { user, internalUserId } = useAuth()
  
  // Храним только EAN-коды для молниеносной проверки (O(1)) задержки 0мс
  const [favoriteEans, setFavoriteEans] = useState(new Set())
  const [scanCount, setScanCount] = useState(0)
  
  // Флаг загрузки (на случай если мы хотим показывать лоадер, но в 99% он не понадобится)
  const [userDataLoaded, setUserDataLoaded] = useState(false)

  useEffect(() => {
    // Если нет юзера, быстро очищаем стейт в ноль
    if (!user || !internalUserId) {
      setFavoriteEans(new Set())
      setScanCount(0)
      setUserDataLoaded(true)
      return
    }

    setUserDataLoaded(false)
    const loadIdentifiers = async () => {
      try {
        // 1. Грузим лайки (достаточно только ean для быстрой проверки)
        const { data: favs } = await supabase.from('user_favorites').select('ean').eq('user_id', internalUserId)
        if (favs) {
          setFavoriteEans(new Set(favs.map(f => f.ean)))
        }
        
        // 2. Грузим количество сканирований для профиля
        const { count } = await supabase.from('scan_events').select('ean', { count: 'exact', head: true }).eq('user_id', internalUserId)
        setScanCount(count || 0)
      } catch (err) {
        console.error('Failed to load user data cache', err)
      }
      setUserDataLoaded(true)
    }
    
    loadIdentifiers()
  }, [user, internalUserId])

  const checkIsFavorite = (ean) => {
    if (!ean) return false
    return favoriteEans.has(ean)
  }

  const toggleFavorite = async (product) => {
    if (!internalUserId) {
      alert("Не удалось загрузить ваш профиль. Попробуйте перезайти в аккаунт.")
      return
    }
    if (!product || !product.ean) return

    const ean = product.ean
    const isFav = favoriteEans.has(ean)
    
    // 💡 Оптимистичный UI-update: Мгновенно обновляем стейт памяти
    setFavoriteEans(prev => {
      const next = new Set(prev)
      if (isFav) next.delete(ean)
      else next.add(ean)
      return next
    })

    try {
      if (!isFav) {
        // Добавление лайка (upsert для пущей надежности по ключу user_id + ean)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const candidateGlobalId = product?.sourceMeta?.globalProductId || product?.id || null;
        const validGlobalId = candidateGlobalId && uuidRegex.test(candidateGlobalId) ? candidateGlobalId : null;

        const { error } = await supabase.from('user_favorites').upsert({
          user_id: internalUserId,
          global_product_id: validGlobalId,
          ean: ean
        }, { onConflict: 'user_id, ean' })
        
        if (error) throw error
      } else {
        // Удаление лайка
        const { error } = await supabase.from('user_favorites')
          .delete()
          .eq('user_id', internalUserId)
          .eq('ean', ean)
          
        if (error) throw error
      }
    } catch (err) {
      // Откат оптимистичного изменения при ошибке базы
      console.error('Toggle favorite failed', err)
      alert("Ошибка базы данных: " + err.message)
      setFavoriteEans(prev => {
        const next = new Set(prev)
        if (isFav) next.add(ean) // reverse to fav
        else next.delete(ean)    // reverse to not fav
        return next
      })
      throw err // пробрасываем дальше если компонент тоже захочет отловить
    }
  }

  // Метод для инкремента истории сканирований (используется ProductScreen)
  const incrementScanCount = () => {
    setScanCount(prev => prev + 1)
  }

  useEffect(() => {
    const handleScanAdded = () => incrementScanCount()
    window.addEventListener('korset:scan_added', handleScanAdded)
    return () => window.removeEventListener('korset:scan_added', handleScanAdded)
  }, [])

  return (
    <UserDataContext.Provider value={{
      favoriteEans,
      checkIsFavorite,
      toggleFavorite,
      favoritesCount: favoriteEans.size,
      scanCount,
      incrementScanCount,
      userDataLoaded
    }}>
      {children}
    </UserDataContext.Provider>
  )
}

export const useUserData = () => useContext(UserDataContext)
