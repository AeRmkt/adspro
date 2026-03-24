import fastifyPlugin from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createClient } from '@supabase/supabase-js'

export const jwtPlugin = fastifyPlugin(async (app: FastifyInstance) => {
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Token de autenticação não fornecido' })
    }

    const token = authHeader.slice(7)
    const supabaseUrl = process.env.SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    })

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return reply.status(401).send({ error: 'Token inválido ou expirado' })
    }

    // Garante que o usuário existe no banco Prisma
    let dbUser = await app.prisma.user.findUnique({
      where: { supabaseId: user.id },
    })

    if (!dbUser) {
      dbUser = await app.prisma.user.create({
        data: {
          supabaseId: user.id,
          email: user.email!,
          name: user.user_metadata?.full_name || null,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      })
    }

    request.userId = dbUser.id
    request.supabaseUserId = user.id
  }

  app.decorate('authenticate', authenticate)
})
