import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest, requireRole } from '../middleware/auth'

const router = Router()

router.use(authenticate)

router.get('/me', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      customerProfile: { include: { addresses: true } },
      tradesmanProfile: { include: { skills: true, payoutAccount: true } },
      adminProfile: true,
    },
  })

  if (!user) return res.status(404).json({ error: 'User not found' })

  res.json({ user })
})

router.patch('/me/customer', requireRole(['CUSTOMER']), async (req: AuthRequest, res: Response) => {
  const { firstName = '', lastName = '', avatarUrl } = req.body

  const profile = await prisma.customerProfile.upsert({
    where: { userId: req.user!.id },
    update: { firstName, lastName, avatarUrl },
    create: { userId: req.user!.id, firstName, lastName, avatarUrl },
  })

  res.json({ profile })
})

router.patch('/me/tradesman', requireRole(['TRADESMAN']), async (req: AuthRequest, res: Response) => {
  const { firstName = '', lastName = '', bio, availability = 'AVAILABLE', skills = [] } = req.body

  const profile = await prisma.tradesmanProfile.upsert({
    where: { userId: req.user!.id },
    update: { firstName, lastName, bio, availability },
    create: { userId: req.user!.id, firstName, lastName, bio, availability },
  })

  if (Array.isArray(skills)) {
    await prisma.tradesmanSkill.deleteMany({ where: { tradesmanId: profile.id } })
    await prisma.tradesmanSkill.createMany({
      data: skills.map((skill: any) => ({
        tradesmanId: profile.id,
        category: skill.category,
        yearsExp: Number(skill.yearsExp || 0),
        isVerified: false,
      })),
      skipDuplicates: true,
    })
  }

  const updated = await prisma.tradesmanProfile.findUnique({
    where: { id: profile.id },
    include: { skills: true },
  })

  res.json({ profile: updated })
})

router.get('/addresses', requireRole(['CUSTOMER']), async (req: AuthRequest, res: Response) => {
  const customer = await prisma.customerProfile.findUnique({ where: { userId: req.user!.id } })
  if (!customer) return res.json({ addresses: [] })

  const addresses = await prisma.address.findMany({
    where: { customerId: customer.id },
    orderBy: [{ isDefault: 'desc' }, { label: 'asc' }],
  })

  res.json({ addresses })
})

router.post('/addresses', requireRole(['CUSTOMER']), async (req: AuthRequest, res: Response) => {
  const {
    label,
    street,
    barangay,
    city,
    province,
    zipCode,
    latitude = null,
    longitude = null,
    isDefault = false,
  } = req.body

  if (!label || !street || !barangay || !city || !province) {
    return res.status(400).json({ error: 'label, street, barangay, city and province are required' })
  }

  const customer = await prisma.customerProfile.findUnique({ where: { userId: req.user!.id } })
  if (!customer) return res.status(400).json({ error: 'Customer profile not found' })

  if (isDefault) {
    await prisma.address.updateMany({
      where: { customerId: customer.id },
      data: { isDefault: false },
    })
  }

  const address = await prisma.address.create({
    data: {
      customerId: customer.id,
      label,
      street,
      barangay,
      city,
      province,
      zipCode,
      latitude,
      longitude,
      isDefault,
    } as any,
  })

  res.status(201).json({ address })
})

export default router
