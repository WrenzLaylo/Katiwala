import { Request, Response, NextFunction } from 'express'
import supabase from '../lib/supabase'
import prisma from '../lib/prisma'

const DEV_OTP_BYPASS = process.env.DEV_OTP_BYPASS === 'true'

export interface AuthRequest extends Request {
  user?: {
    id: string
    phone: string
    role: string
  }
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' })
  }

  const token = authHeader.split(' ')[1]

  // Dev-mode tokens are "dev.<userId>" and resolve straight from the database,
  // skipping Supabase. Only honored when DEV_OTP_BYPASS is enabled.
  let userId: string

  if (DEV_OTP_BYPASS && token.startsWith('dev.')) {
    userId = token.slice('dev.'.length)
  } else {
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    userId = user.id
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!dbUser) {
    return res.status(401).json({ error: 'User not found' })
  }

  if (dbUser.status === 'BANNED' || dbUser.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'Account suspended' })
  }

  req.user = {
    id: dbUser.id,
    phone: dbUser.phone,
    role: dbUser.role,
  }

  next()
}

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}
