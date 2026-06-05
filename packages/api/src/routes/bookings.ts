import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

router.use(authenticate)

// POST /bookings — customer creates a booking
router.post('/', async (req: AuthRequest, res: Response) => {
  const { addressId, items, scheduledAt, notes, isEmergency } = req.body

  if (!addressId || !items?.length || !scheduledAt) {
    return res.status(400).json({ error: 'addressId, items and scheduledAt are required' })
  }

  const services = await prisma.service.findMany({
    where: { id: { in: items.map((i: any) => i.serviceId) } }
  })

  if (services.length !== items.length) {
    return res.status(400).json({ error: 'One or more services not found' })
  }

  const bookingItems = items.map((item: any) => {
    const service = services.find((s: any) => s.id === item.serviceId)!
    const unitPrice = service.basePrice
    const subtotal = unitPrice * (item.quantity || 1)
    return { serviceId: item.serviceId, quantity: item.quantity || 1, unitPrice, subtotal }
  })

  const totalAmount = bookingItems.reduce((sum: number, i: any) => sum + i.subtotal, 0)
  const emergencyMultiplier = isEmergency ? 1.5 : 1
  const finalAmount = totalAmount * emergencyMultiplier
  const commissionRate = 0.25
  const commissionAmount = finalAmount * commissionRate
  const tradesmanPayout = finalAmount - commissionAmount

  const customer = await prisma.customerProfile.findUnique({
    where: { userId: req.user!.id }
  })

  if (!customer) {
    return res.status(400).json({ error: 'Customer profile not found' })
  }

  const booking = await prisma.booking.create({
    data: {
      customerId: customer.id,
      addressId,
      scheduledAt: new Date(scheduledAt),
      notes,
      isEmergency: isEmergency || false,
      totalAmount: finalAmount,
      commissionRate,
      commissionAmount,
      tradesmanPayout,
      warrantyExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      items: { create: bookingItems },
      statusLogs: {
        create: {
          newStatus: 'PENDING',
          changedBy: req.user!.id,
          note: 'Booking created'
        }
      }
    },
    include: {
      items: { include: { service: true } },
      address: true,
      statusLogs: true
    }
  })

  res.status(201).json(booking)
})

// GET /bookings — list bookings based on role
router.get('/', async (req: AuthRequest, res: Response) => {
  const { status, page = 1, limit = 10 } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  let where: any = {}

  if (req.user!.role === 'CUSTOMER') {
    const customer = await prisma.customerProfile.findUnique({
      where: { userId: req.user!.id }
    })
    where.customerId = customer?.id
  } else if (req.user!.role === 'TRADESMAN') {
    const tradesman = await prisma.tradesmanProfile.findUnique({
      where: { userId: req.user!.id }
    })
    where.tradesmanId = tradesman?.id
  }

  if (status) where.status = status

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { service: true } },
        address: true,
        tradesman: true,
        payment: true
      }
    }),
    prisma.booking.count({ where })
  ])

  res.json({ bookings, total, page: Number(page), limit: Number(limit) })
})

// GET /bookings/:id — get single booking
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      items: { include: { service: true } },
      address: true,
      tradesman: true,
      customer: true,
      payment: true,
      review: true,
      statusLogs: { orderBy: { createdAt: 'asc' } },
      photos: true,
      dispute: true
    }
  })

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' })
  }

  res.json(booking)
})

// PATCH /bookings/:id/status — update booking status
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  const { status, note } = req.body
  const id = req.params.id as string

  const booking = await prisma.booking.findUnique({ where: { id } })

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' })
  }

  const validTransitions: Record<string, string[]> = {
    PENDING:     ['ASSIGNED', 'CANCELLED'],
    ASSIGNED:    ['ACCEPTED', 'CANCELLED'],
    ACCEPTED:    ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'DISPUTED'],
    COMPLETED:   ['DISPUTED'],
    CANCELLED:   [],
    DISPUTED:    ['COMPLETED', 'CANCELLED'],
  }

  const allowed = validTransitions[booking.status] || []
  if (!allowed.includes(status)) {
    return res.status(400).json({
      error: `Cannot transition from ${booking.status} to ${status}`
    })
  }

  const updateData: any = { status }
  if (status === 'IN_PROGRESS') updateData.startedAt = new Date()
  if (status === 'COMPLETED') {
    updateData.completedAt = new Date()
    updateData.warrantyExpiry = new Date(Date.now() + booking.warrantyDays * 24 * 60 * 60 * 1000)
  }
  if (status === 'CANCELLED') updateData.cancelledAt = new Date()

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      ...updateData,
      statusLogs: {
        create: {
          oldStatus: booking.status,
          newStatus: status,
          changedBy: req.user!.id,
          note
        }
      }
    },
    include: {
      items: { include: { service: true } },
      statusLogs: { orderBy: { createdAt: 'asc' } }
    }
  })

  if (status === 'COMPLETED' && booking.tradesmanId) {
    await prisma.earning.upsert({
      where: { bookingId: id },
      update: {},
      create: {
        tradesmanId: booking.tradesmanId,
        bookingId: id,
        grossAmount: booking.totalAmount,
        commission: booking.commissionAmount,
        netAmount: booking.tradesmanPayout
      }
    })
  }

  res.json(updated)
})

// PATCH /bookings/:id/assign — dispatcher assigns tradesman
router.patch('/:id/assign', async (req: AuthRequest, res: Response) => {
  const { tradesmanId } = req.body
  const id = req.params.id as string

  if (req.user!.role !== 'ADMIN' && req.user!.role !== 'DISPATCHER') {
    return res.status(403).json({ error: 'Only admins and dispatchers can assign tradesmen' })
  }

  const booking = await prisma.booking.findUnique({ where: { id } })

  if (!booking || booking.status !== 'PENDING') {
    return res.status(400).json({ error: 'Booking not found or not in PENDING status' })
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
          note: `Assigned to tradesman ${tradesmanId}`
        }
      }
    }
  })

  res.json(updated)
})

export default router