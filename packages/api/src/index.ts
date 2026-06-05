import './lib/env'  // Must be first!
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import authRoutes from './routes/auth'

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(cors())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'katiwala-api' })
})

app.use('/auth', authRoutes)

app.listen(PORT, () => {
  console.log(`🚀 Katiwala API running on port ${PORT}`)
})

export default app