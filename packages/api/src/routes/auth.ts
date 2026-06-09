import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import supabase from '../lib/supabase'
import prisma from '../lib/prisma'
import { UserRole } from '../../../../generated/prisma'

const router = Router()

// ---------------------------------------------------------------------------
// Dev-mode OTP bypass
// ---------------------------------------------------------------------------
// When DEV_OTP_BYPASS=true the API skips Supabase/SMS entirely and accepts a
// single fixed code (DEV_OTP_CODE, default "123456"). This lets you log in and
// sign up on Expo for free during development without an SMS provider. The real
// Supabase SMS path stays intact and is used whenever the flag is off (prod).
const DEV_OTP_BYPASS = process.env.DEV_OTP_BYPASS === 'true'
const DEV_OTP_CODE = process.env.DEV_OTP_CODE || '123456'

const parsePhoneList = (value?: string) =>
  new Set(
    (value || '')
      .split(',')
      .map((phone) => phone.trim())
      .filter(Boolean)
  )

const adminPhones = () => parsePhoneList(process.env.ADMIN_PHONES)
const dispatcherPhones = () => parsePhoneList(process.env.DISPATCHER_PHONES)

function resolveRole(phone: string, requestedRole?: string): UserRole {
  if (adminPhones().has(phone)) return 'ADMIN'
  if (dispatcherPhones().has(phone)) return 'DISPATCHER'

  if (requestedRole === 'ADMIN' || requestedRole === 'DISPATCHER') {
    throw new Error('This phone number is not allowlisted for staff access')
  }

  return requestedRole === 'TRADESMAN' ? 'TRADESMAN' : 'CUSTOMER'
}

// The design's signup form collects a single "Full Name"; profiles store it as
// first/last, so split on the first space.
function splitName(fullName?: string) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
  const firstName = parts.shift() || ''
  const lastName = parts.join(' ')
  return { firstName, lastName }
}

// Create the role-specific profile row if it doesn't exist yet, seeding names
// when we have them (email signup) and leaving them untouched otherwise.
async function ensureProfile(
  userId: string,
  role: UserRole,
  names: { firstName: string; lastName: string } = { firstName: '', lastName: '' }
) {
  if (role === 'CUSTOMER') {
    await prisma.customerProfile.upsert({
      where: { userId },
      update: {},
      create: { userId, ...names },
    })
  } else if (role === 'TRADESMAN') {
    await prisma.tradesmanProfile.upsert({
      where: { userId },
      update: {},
      create: { userId, ...names },
    })
  } else if (role === 'ADMIN' || role === 'DISPATCHER') {
    await prisma.adminProfile.upsert({
      where: { userId },
      update: {},
      create: { userId, ...names },
    })
  }
}

// Step 1 — Send OTP to phone number
router.post('/send-otp', async (req: Request, res: Response) => {
  const { phone } = req.body

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' })
  }

  if (DEV_OTP_BYPASS) {
    return res.json({
      message: `Dev mode: enter code ${DEV_OTP_CODE} to continue`,
      dev: true,
    })
  }

  const { error } = await supabase.auth.signInWithOtp({ phone })

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  res.json({ message: 'OTP sent successfully' })
})

// Step 2 — Verify OTP and get session
router.post('/verify-otp', async (req: Request, res: Response) => {
  const { phone, token, role } = req.body

  if (!phone || !token) {
    return res.status(400).json({ error: 'Phone and token are required' })
  }

  let userId: string
  let accessToken: string | undefined
  let refreshToken: string | undefined

  if (DEV_OTP_BYPASS) {
    if (token !== DEV_OTP_CODE) {
      return res.status(400).json({ error: 'Invalid dev OTP code' })
    }

    // Reuse the existing dev user for this phone, otherwise mint a fresh id.
    const existing = await prisma.user.findUnique({ where: { phone } })
    userId = existing?.id ?? randomUUID()
    accessToken = `dev.${userId}`
    refreshToken = `dev.${userId}`
  } else {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    })

    if (error || !data.user) {
      return res.status(400).json({ error: 'Invalid or expired OTP' })
    }

    userId = data.user.id
    accessToken = data.session?.access_token
    refreshToken = data.session?.refresh_token
  }

  let resolvedRole: UserRole
  try {
    resolvedRole = resolveRole(phone, role)
  } catch (err: any) {
    return res.status(403).json({ error: err.message })
  }

  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {
      phone,
      role: resolvedRole,
      status: 'ACTIVE',
      updatedAt: new Date()
    },
    create: {
      id: userId,
      phone,
      role: resolvedRole,
      status: 'ACTIVE',
    },
  })

  await ensureProfile(user.id, user.role)

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      phone: user.phone,
      role: user.role,
      status: user.status,
    },
  })
})

// ---------------------------------------------------------------------------
// Email + password auth (primary flow per the Figma design)
// ---------------------------------------------------------------------------
// Runs alongside the phone-OTP flow above. Uses Supabase email/password — no
// SMS needed, so it works in dev for free. Phone is still collected at signup
// (the design's "Mobile Number" field) and stored on the user.

// Create an account with email + password
router.post('/signup-email', async (req: Request, res: Response) => {
  const { fullName, phone, email, password, role } = req.body

  if (!email || !password || !phone) {
    return res.status(400).json({ error: 'Name, mobile number, email and password are required' })
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  let resolvedRole: UserRole
  try {
    resolvedRole = resolveRole(phone, role)
  } catch (err: any) {
    return res.status(403).json({ error: err.message })
  }

  // Create the Supabase auth user already confirmed so the user can sign in
  // immediately (no email-verification round-trip during onboarding).
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError || !created.user) {
    return res.status(400).json({ error: createError?.message || 'Could not create account' })
  }

  // Mint a session by signing in with the new credentials.
  const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError || !session.session) {
    return res.status(400).json({ error: signInError?.message || 'Account created but sign-in failed' })
  }

  const user = await prisma.user.upsert({
    where: { id: created.user.id },
    update: { phone, email, role: resolvedRole, status: 'ACTIVE', updatedAt: new Date() },
    create: { id: created.user.id, phone, email, role: resolvedRole, status: 'ACTIVE' },
  })

  await ensureProfile(user.id, user.role, splitName(fullName))

  res.json({
    accessToken: session.session.access_token,
    refreshToken: session.session.refresh_token,
    user: { id: user.id, phone: user.phone, email: user.email, role: user.role, status: user.status },
  })
})

// Log in with email + password
router.post('/login-email', async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.session || !data.user) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const dbUser = await prisma.user.findUnique({ where: { id: data.user.id } })

  if (!dbUser) {
    return res.status(401).json({ error: 'Account not found. Please sign up first.' })
  }

  res.json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: { id: dbUser.id, phone: dbUser.phone, email: dbUser.email, role: dbUser.role, status: dbUser.status },
  })
})

// Refresh session
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' })
  }

  // Dev tokens never expire and are self-describing — just hand them back.
  if (DEV_OTP_BYPASS && refreshToken.startsWith('dev.')) {
    return res.json({ accessToken: refreshToken, refreshToken })
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  })

  if (error || !data.session) {
    return res.status(401).json({ error: 'Invalid refresh token' })
  }

  res.json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  })
})

export default router
