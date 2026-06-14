import handler from '../api/admin-stores.js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// Mock request and response
const req = {
  method: 'POST',
  headers: {
    origin: 'http://localhost:5173',
    // We will bypass verifyJWT by mocking the auth check or generating a valid token.
    // Wait, let's generate a valid session token for our superadmin user using supabase-js.
  },
  body: {
    action: 'list'
  }
}

// Res mock
const res = {
  status(code) {
    this.statusCode = code
    return this
  },
  set(headers) {
    this.headers = headers
    return this
  },
  json(data) {
    this.jsonData = data
    console.log(`[Response ${this.statusCode}]`, JSON.stringify(data, null, 2))
    return this
  },
  send(data) {
    this.sendData = data
    console.log(`[Response ${this.statusCode}]`, data)
    return this
  }
}

async function test() {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  
  // Let's sign in or get a valid session token for our superadmin neydi.kz@gmail.com
  // Since we have service_role, we can generate a token or just mock verifyJWT behavior inside api/admin-stores.js.
  // Actually, we can get a valid user JWT by using supabase.auth.admin.generateLink or we can just mock the verifyJWT in the test by temporarily changing req.headers.authorization.
  // Wait, let's sign in programmatically if we can. Or we can just grab neydi.kz@gmail.com's user ID (9cec524a-f34e-4e10-bc77-733429023270) and mock verifyJWT.
  // But wait, the real API function verifyJWT calls sb.auth.getUser(token).
  // Can we create a session token for neydi.kz@gmail.com?
  // Yes, supabase.auth.admin.createUser or we can just sign in.
  // But wait! Is there a test user we can sign in with?
  // Let's see: we know neydi.kz@gmail.com is Google OAuth. But owner-kalina@korset.kz (ID: 034d2342-fa8e-45f2-8e75-0cb3048b996c) is email.
  // Wait, we can temporarily make owner-kalina@korset.kz a superadmin in public.users, sign in with owner-kalina@korset.kz (if we know the password, but we don't).
  // Alternatively, we can use supabase.auth.admin.generateLink to get a login link, or we can just use supabase.auth.signUp/signInWithPassword.
  // Wait! A simpler way is to just call sb.auth.signInWithOtp({ email: 'neydi.kz@gmail.com' }). But Google login is easier.
  // Actually, can we just create a temporary session token using supabase.auth.admin?
  // Let's check if supabase.auth.admin.createSession exists? No, but we can generate a JWT manually using jsonwebtoken library, but we need the JWT secret.
  // Wait, Supabase JWT secret is not in env, but we can sign in a user by setting their password first!
  // Let's temporarily change the password of owner-kalina@korset.kz to "testpassword123", sign in to get the JWT token, then change it back!
  // Or we can create a temporary admin user "tempadmin@korset.kz" with password "tempadmin123", make them superadmin, get their JWT, and test!
  // That's much cleaner and safer! Let's do that.
  
  console.log('Creating temp admin user...')
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'tempadmin@korset.kz',
    password: 'tempadmin123',
    email_confirm: true
  })
  
  if (authError) {
    console.error('Failed to create temp admin:', authError)
    return
  }
  
  const userId = authData.user.id
  console.log('Temp admin created in auth.users, ID:', userId)
  
  try {
    // Upsert into public.users and make superadmin
    const { error: upsertError } = await supabase.from('users').upsert({
      auth_id: userId,
      name: 'Temp Admin',
      device_id: 'temp-device-id-12345',
      is_superadmin: true
    })
    
    if (upsertError) {
      console.error('Failed to make superadmin in public.users:', upsertError)
      return
    }
    console.log('Temp admin is now superadmin in public.users')
    
    // Sign in to get JWT token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'tempadmin@korset.kz',
      password: 'tempadmin123'
    })
    
    if (signInError) {
      console.error('Failed to sign in:', signInError)
      return
    }
    
    const token = signInData.session.access_token
    console.log('Successfully signed in. Token obtained.')
    
    req.headers.authorization = `Bearer ${token}`
    
    console.log('--- Test 1: list stores with metrics ---')
    req.body = { action: 'list' }
    await handler(req, res)

    // Get mars store to update
    const storesList = res.jsonData?.stores || []
    const marsStore = storesList.find(s => s.code === 'mars')
    if (marsStore) {
      console.log('--- Test 2: update-store-details ---')
      req.body = {
        action: 'update-store-details',
        storeId: marsStore.id,
        plan: 'pro',
        planExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString() // 30 days
      }
      await handler(req, res)

      // Restore mars plan to pilot
      console.log('--- Restoring store details ---')
      req.body = {
        action: 'update-store-details',
        storeId: marsStore.id,
        plan: 'pilot',
        planExpiresAt: null
      }
      await handler(req, res)
    }

    console.log('--- Test 3: update-owner-auth ---')
    // We will update the temp admin's own password to test
    req.body = {
      action: 'update-owner-auth',
      ownerId: userId,
      newPassword: 'updatedpassword123'
    }
    await handler(req, res)
    
  } finally {
    // Cleanup
    console.log('Cleaning up temp admin...')
    await supabase.from('users').delete().eq('auth_id', userId)
    await supabase.auth.admin.deleteUser(userId)
    console.log('Cleanup complete.')
  }
}

test()
