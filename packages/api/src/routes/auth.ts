import { Router, Request, Response } from 'express'
import supabase from '../lib/supabase'
import prisma from '../lib/prisma'

const router = Router()

// Step 1 — Send OTP to phone number
router.post('/send-otp', async (req: Request, res: Response) => {
  const { phone } = req.body

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' })
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

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  })

  if (error || !data.user) {
    return res.status(400).json({ error: 'Invalid or expired OTP' })
  }

  const user = await prisma.user.upsert({
    where: { id: data.user.id },
    update: { updatedAt: new Date() },
    create: {
      id: data.user.id,
      phone,
      role: role === 'TRADESMAN' ? 'TRADESMAN' : 'CUSTOMER',
      status: 'ACTIVE',
    },
  })

  if (user.role === 'CUSTOMER') {
    await prisma.customerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, firstName: '', lastName: '' },
    })
  } else if (user.role === 'TRADESMAN') {
    await prisma.tradesmanProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, firstName: '', lastName: '' },
    })
  }

  res.json({
    accessToken: data.session?.access_token,
    refreshToken: data.session?.refresh_token,
    user: {
      id: user.id,
      phone: user.phone,
      role: user.role,
      status: user.status,
    },
  })
})

// Refresh session
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' })
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