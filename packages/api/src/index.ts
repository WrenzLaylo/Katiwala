import path from 'path'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'

dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const app = express()
const PORT = process.env.PORT || 3000

app.use(helmet())
app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'katiwala-api' })
})

app.use('/auth', authRoutes)

app.listen(PORT, () => {
  console.log(`🚀 Katiwala API running on port ${PORT}`)
})

export default app