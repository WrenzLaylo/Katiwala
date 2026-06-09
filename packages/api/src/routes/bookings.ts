import { Router, Response } from 'express'
import multer from 'multer'
import prisma from '../lib/prisma'
import supabase from '../lib/supabase'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } })
const photoBucket = process.env.SUPABASE_BOOKING_PHOTOS_BUCKET || 'booking-photos'

router.use(authenticate)

const bookingInclude = {
  items: { include: { service: true } },
  address: true,
  customer: { include: { user: true } },
  tradesman: { include: { user: true, skills: true } },
  payment: true,
  photos: true,
  statusLogs: { orderBy: { createdAt: 'asc' as const } },
}

async function ensurePhotoBucket() {
  const { error } = await supabase.storage.getBucket(photoBucket)
  if (!error) return

  const created = await supabase.storage.createBucket(photoBucket, { public: false })
  if (created.error && !created.error.message.toLowerCase().includes('already exists')) {
    throw created.error
  }
}

async function withSignedPhotos<T extends { photos?: any[] }>(booking: T): Promise<T> {
  if (!booking.photos?.length) return booking

  const photos = await Promise.all(
    booking.photos.map(async (photo) => {
      const { data } = await supabase.storage
        .from(photoBucket)
        .createSignedUrl(photo.url, 60 * 60)

      return { ...photo, signedUrl: data?.signedUrl || null }
    })
  )

  return { ...booking, photos }
}

async function canAccessBooking(req: AuthRequest, booking: any) {
  if (req.user!.role === 'ADMIN' || req.user!.role === 'DISPATCHER') return true

  if (req.user!.role === 'CUSTOMER') {
    const customer = await prisma.customerProfile.findUnique({ where: { userId: req.user!.id } })
    return customer?.id === booking.customerId
  }

  if (req.user!.role === 'TRADESMAN') {
    const tradesman = await prisma.tradesmanProfile.findUnique({ where: { userId: req.user!.id } })
    return tradesman?.id === booking.tradesmanId
  }

  return false
}

// POST /bookings - customer creates a fixed-price booking
router.post('/', async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'CUSTOMER') {
    return res.status(403).json({ error: 'Only customers can create bookings' })
  }

  const { addressId, items, scheduledAt, notes, isEmergency } = req.body

  if (!addressId || !items?.length || !scheduledAt) {
    return res.status(400).json({ error: 'addressId, items and scheduledAt are required' })
  }

  const customer = await prisma.customerProfile.findUnique({
    where: { userId: req.user!.id },
  })

  if (!customer) return res.status(400).json({ error: 'Customer profile not found' })

  const address = await prisma.address.findFirst({
    where: { id: addressId, customerId: customer.id },
  })

  if (!address) return res.status(400).json({ error: 'Address not found' })

  const serviceIds = items.map((item: any) => item.serviceId)
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds }, isActive: true },
  })

  if (services.length !== new Set(serviceIds).size) {
    return res.status(400).json({ error: 'One or more services not found' })
  }

  const bookingItems = items.map((item: any) => {
    const service = services.find((current) => current.id === item.serviceId)!
    const quantity = Math.max(1, Number(item.quantity || 1))
    const unitPrice = service.basePrice
    const subtotal = unitPrice * quantity

    return { serviceId: item.serviceId, quantity, unitPrice, subtotal }
  })

  const subtotal = bookingItems.reduce((sum: number, item: any) => sum + item.subtotal, 0)
  const finalAmount = subtotal * (isEmergency ? 1.5 : 1)
  const commissionRate = 0.25
  const commissionAmount = finalAmount * commissionRate
  const tradesmanPayout = finalAmount - commissionAmount

  const booking = await prisma.booking.create({
    data: {
      customerId: customer.id,
      addressId,
      scheduledAt: new Date(scheduledAt),
      notes,
      isEmergency: Boolean(isEmergency),
      totalAmount: finalAmount,
      commissionRate,
      commissionAmount,
      tradesmanPayout,
      warrantyExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      items: { create: bookingItems },
      payment: {
        create: {
          amount: finalAmount,
          method: 'CASH',
          status: 'PENDING',
        },
      },
      statusLogs: {
        create: {
          newStatus: 'PENDING',
          changedBy: req.user!.id,
          note: 'Booking created',
        },
      },
    },
    include: bookingInclude,
  })

  res.status(201).json({ booking: await withSignedPhotos(booking) })
})

// GET /bookings - list bookings based on role
router.get('/', async (req: AuthRequest, res: Response) => {
  const { status, page = 1, limit = 10 } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  let where: any = {}

  if (req.user!.role === 'CUSTOMER') {
    const customer = await prisma.customerProfile.findUnique({ where: { userId: req.user!.id } })
    if (!customer) return res.json({ bookings: [], total: 0, page: Number(page), limit: Number(limit) })
    where.customerId = customer.id
  } else if (req.user!.role === 'TRADESMAN') {
    const tradesman = await prisma.tradesmanProfile.findUnique({ where: { userId: req.user!.id } })
    if (!tradesman) return res.json({ bookings: [], total: 0, page: Number(page), limit: Number(limit) })
    where.tradesmanId = tradesman.id
  }

  if (status) where.status = status

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: bookingInclude,
    }),
    prisma.booking.count({ where }),
  ])

  res.json({
    bookings: await Promise.all(bookings.map(withSignedPhotos)),
    total,
    page: Number(page),
    limit: Number(limit),
  })
})

// GET /bookings/:id - get single booking
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      ...bookingInclude,
      review: true,
      dispute: true,
    },
  })

  if (!booking) return res.status(404).json({ error: 'Booking not found' })
  if (!(await canAccessBooking(req, booking))) return res.status(403).json({ error: 'Booking access denied' })

  res.json({ booking: await withSignedPhotos(booking) })
})

// POST /bookings/:id/photos - customer uploads optional job photo
router.post('/:id/photos', upload.single('photo'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const booking = await prisma.booking.findUnique({ where: { id } })

  if (!booking) return res.status(404).json({ error: 'Booking not found' })
  if (!(await canAccessBooking(req, booking))) return res.status(403).json({ error: 'Booking access denied' })
  if (!req.file) return res.status(400).json({ error: 'photo is required' })

  await ensurePhotoBucket()

  const extension = req.file.originalname.split('.').pop() || 'jpg'
  const path = `${booking.id}/${Date.now()}-${req.user!.id}.${extension}`
  const uploaded = await supabase.storage
    .from(photoBucket)
    .upload(path, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    })

  if (uploaded.error) return res.status(400).json({ error: uploaded.error.message })

  const photo = await prisma.bookingPhoto.create({
    data: {
      bookingId: booking.id,
      url: path,
      type: req.user!.role === 'TRADESMAN' ? 'TRADESMAN_PROOF' : 'CUSTOMER_BEFORE',
      uploadedBy: req.user!.id,
    },
  })

  const { data } = await supabase.storage.from(photoBucket).createSignedUrl(path, 60 * 60)

  res.status(201).json({ photo: { ...photo, signedUrl: data?.signedUrl || null } })
})

// PATCH /bookings/:id/status - update booking status
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  const { status, note } = req.body
  const id = req.params.id as string

  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) return res.status(404).json({ error: 'Booking not found' })
  if (!(await canAccessBooking(req, booking))) return res.status(403).json({ error: 'Booking access denied' })

  const staff = req.user!.role === 'ADMIN' || req.user!.role === 'DISPATCHER'
  if (!staff && req.user!.role !== 'TRADESMAN') {
    return res.status(403).json({ error: 'Only assigned tradesmen or staff can update booking status' })
  }

  const validTransitions: Record<string, string[]> = {
    PENDING: ['ASSIGNED', 'CANCELLED'],
    ASSIGNED: ['ACCEPTED', 'CANCELLED'],
    ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'DISPUTED'],
    COMPLETED: ['DISPUTED'],
    CANCELLED: [],
    DISPUTED: ['COMPLETED', 'CANCELLED'],
  }

  const allowed = validTransitions[booking.status] || []
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `Cannot transition from ${booking.status} to ${status}` })
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
          note,
        },
      },
    },
    include: bookingInclude,
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
        netAmount: booking.tradesmanPayout,
      },
    })

    await prisma.tradesmanProfile.update({
      where: { id: booking.tradesmanId },
      data: { totalJobs: { increment: 1 }, availability: 'AVAILABLE' },
    })
  }

  res.json({ booking: await withSignedPhotos(updated) })
})

// PATCH /bookings/:id/assign - dispatcher assigns tradesman
router.patch('/:id/assign', async (req: AuthRequest, res: Response) => {
  const { tradesmanId } = req.body
  const id = req.params.id as string

  if (req.user!.role !== 'ADMIN' && req.user!.role !== 'DISPATCHER') {
    return res.status(403).json({ error: 'Only admins and dispatchers can assign tradesmen' })
  }

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
          note: `Assigned to tradesman ${tradesmanId}`,
        },
      },
    },
    include: bookingInclude,
  })

  res.json({ booking: await withSignedPhotos(updated) })
})

export default router
