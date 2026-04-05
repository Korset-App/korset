import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../utils/supabase.js'
import { resolveInternalUserIdForAuthUser } from '../utils/userIdentity.js'

const AuthContext = createContext({ user: null, session: null, loading: true })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const [internalUserId, setInternalUserId] = useState(null)

  useEffect(() => {
    const fetchInternalUser = async (authUser) => {
      if (!authUser) {
        setInternalUserId(null)
        return
      }
      const nextInternalId = await resolveInternalUserIdForAuthUser(authUser, { ensureRow: true })
      setInternalUserId(nextInternalId)
    }

    // Получаем текущую сессию при загрузке
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      fetchInternalUser(session?.user ?? null).finally(() => setLoading(false))
    })

    // Слушаем изменения авторизации (логин/логаут)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      fetchInternalUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, internalUserId, session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
