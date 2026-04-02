import fastifyPlugin from 'fastify-plugin'
import cors from '@fastify/cors'
import type { FastifyInstance } from 'fastify'

export const corsPlugin = fastifyPlugin(async (app: FastifyInstance) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:3000',
  ]

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      // Allow any Vercel deployment for this project
      if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      callback(new Error('Origem não permitida pelo CORS'), false)
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
})
