import './lib/env'  // Must be first!
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import authRoutes from './routes/auth'
import bookingRoutes from './routes/bookings'

const app = express()
const PORT = process.env.PORT || 3000

app.use(helmet())
app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'katiwala-api' })
})

app.use('/auth', authRoutes)
app.use('/bookings', bookingRoutes)

app.listen(PORT, () => {
  console.log(`🚀 Katiwala API running on port ${PORT}`)
})

export default app
