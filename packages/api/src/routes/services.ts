import { Router } from 'express'
import prisma from '../lib/prisma'

const router = Router()

router.get('/', async (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined

  const services = await prisma.service.findMany({
    where: {
      isActive: true,
      ...(category ? { category: category as any } : {}),
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  res.json({ services })
})

export default router
