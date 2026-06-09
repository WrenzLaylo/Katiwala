import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest, requireRole } from '../middleware/auth'

const router = Router()

router.use(authenticate, requireRole(['ADMIN', 'DISPATCHER']))

const bookingInclude = {
  items: { include: { service: true } },
  address: true,
  customer: { include: { user: true } },
  tradesman: { include: { user: true, skills: true } },
  payment: true,
  photos: true,
  statusLogs: { orderBy: { createdAt: 'asc' as const } },
}

router.get('/bookings', async (req: AuthRequest, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined

  const bookings = await prisma.booking.findMany({
    where: status ? { status: status as any } : {},
    orderBy: { createdAt: 'desc' },
    include: bookingInclude,
  })

  res.json({ bookings })
})

router.get('/tradesmen', async (req: AuthRequest, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined

  const tradesmen = await prisma.tradesmanProfile.findMany({
    where: status ? { status: status as any } : {},
    orderBy: [{ status: 'asc' }, { firstName: 'asc' }],
    include: { user: true, skills: true },
  })

  res.json({ tradesmen })
})

router.patch('/tradesmen/:id/verify', async (req: AuthRequest, res: Response) => {
  const { status = 'VERIFIED' } = req.body
  const id = req.params.id as string

  if (!['PENDING_VERIFICATION', 'VERIFIED', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid tradesman status' })
  }

  const tradesman = await prisma.tradesmanProfile.update({
    where: { id },
    data: {
      status,
      skills: status === 'VERIFIED'
        ? { updateMany: { where: {}, data: { isVerified: true } } }
        : undefined,
    },
    include: { user: true, skills: true },
  })

  res.json({ tradesman })
})

router.patch('/bookings/:id/assign', async (req: AuthRequest, res: Response) => {
  const { tradesmanId } = req.body
  const id = req.params.id as string

  if (!tradesmanId) return res.status(400).json({ error: 'tradesmanId is required' })

  const [booking, tradesman] = await Promise.all([
    prisma.booking.findUnique({ where: { id } }),
    prisma.tradesmanProfile.findUnique({ where: { id: tradesmanId } }),
  ])

  if (!booking || booking.status !== 'PENDING') {
    return res.status(400).json({ error: 'Booking not found or not in PENDING status' })
  }

  if (!tradesman || tradesman.status !== 'VERIFIED') {
    return res.status(400).json({ error: 'Tradesman must be verified before assignment' })
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      tradesmanId,
      status: 'ASSIGNED',
      statusLogs: {
        create: {
          oldStatus: 'PENDING',
          newStatus: 'ASSIGNED',
          changedBy: req.user!.id,
          note: `Assigned to ${tradesman.firstName || 'tradesman'} ${tradesman.lastName || ''}`.trim(),
        },
      },
    },
    include: bookingInclude,
  })

  res.json({ booking: updated })
})

router.patch('/bookings/:id/payment/mark-paid', async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const booking = await prisma.booking.findUnique({ where: { id }, include: { payment: true } })

  if (!booking) return res.status(404).json({ error: 'Booking not found' })

  const payment = await prisma.payment.upsert({
    where: { bookingId: id },
    update: { status: 'PAID', paidAt: new Date(), method: 'CASH' },
    create: {
      bookingId: id,
      amount: booking.totalAmount,
      method: 'CASH',
      status: 'PAID',
      paidAt: new Date(),
    },
  })

  res.json({ payment })
})

export default router
