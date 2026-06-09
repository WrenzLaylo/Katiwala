import './lib/env'  // Must be first!
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import authRoutes from './routes/auth'
import bookingRoutes from './routes/bookings'
import dispatcherRoutes from './routes/dispatcher'
import profileRoutes from './routes/profiles'
import serviceRoutes from './routes/services'

const app = express()
const PORT = process.env.PORT || 3000

app.use(helmet())
app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'katiwala-api' })
})

app.use('/auth', authRoutes)
app.use('/services', serviceRoutes)
app.use(profileRoutes)
app.use('/bookings', bookingRoutes)
app.use('/dispatcher', dispatcherRoutes)

app.listen(PORT, () => {
  console.log(`🚀 Katiwala API running on port ${PORT}`)
})

export default app
