import type { FastifyInstance } from 'fastify'
import { metaApiService } from '../services/metaApi.js'
import { decrypt } from '../services/crypto.js'

export async function instagramRoutes(app: FastifyInstance) {

  // GET /api/instagram/accounts — lista contas do Instagram vinculadas
  app.get('/accounts', { preHandler: app.authenticate }, async (request, reply) => {
    const accounts = await app.prisma.instagramAccount.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(accounts)
  })

  // POST /api/instagram/accounts/sync — sincroniza contas via Meta API
  app.post('/accounts/sync', { preHandler: app.authenticate }, async (request, reply) => {
    const connection = await app.prisma.facebookConnection.findUnique({
      where: { userId: request.userId },
    })

    if (!connection || connection.tokenInvalid) {
      return reply.status(401).send({ error: 'Conta Meta não conectada ou token inválido' })
    }

    const accessToken = decrypt(connection.accessToken)
    const igAccounts = await metaApiService.getInstagramAccounts(accessToken)

    const upserted = await Promise.all(
      igAccounts.map(acc =>
        app.prisma.instagramAccount.upsert({
          where: { userId_igAccountId: { userId: request.userId, igAccountId: acc.id } },
          update: {
            username: acc.username,
            name: acc.name ?? null,
            profilePicUrl: acc.profilePictureUrl ?? null,
            followersCount: acc.followersCount ?? null,
            mediaCount: acc.mediaCount ?? null,
            linkedPageId: acc.linkedPageId,
            linkedPageName: acc.linkedPageName ?? null,
            lastSyncAt: new Date(),
          },
          create: {
            userId: request.userId,
            igAccountId: acc.id,
            username: acc.username,
            name: acc.name ?? null,
            profilePicUrl: acc.profilePictureUrl ?? null,
            followersCount: acc.followersCount ?? null,
            mediaCount: acc.mediaCount ?? null,
            linkedPageId: acc.linkedPageId,
            linkedPageName: acc.linkedPageName ?? null,
            lastSyncAt: new Date(),
          },
        })
      )
    )

    return reply.send({ synced: upserted.length, accounts: upserted })
  })

  // GET /api/instagram/insights?igAccountId=&from=&to= — insights do período
  app.get('/insights', { preHandler: app.authenticate }, async (request, reply) => {
    const { igAccountId, from, to } = request.query as { igAccountId: string; from: string; to: string }

    if (!igAccountId || !from || !to) {
      return reply.status(400).send({ error: 'Parâmetros obrigatórios: igAccountId, from, to' })
    }

    const account = await app.prisma.instagramAccount.findFirst({
      where: { userId: request.userId, igAccountId },
    })

    if (!account) {
      return reply.status(404).send({ error: 'Conta Instagram não encontrada' })
    }

    const connection = await app.prisma.facebookConnection.findUnique({
      where: { userId: request.userId },
    })

    if (!connection || connection.tokenInvalid) {
      return reply.status(401).send({ error: 'Token Meta inválido' })
    }

    const accessToken = decrypt(connection.accessToken)
    const insights = await metaApiService.getInstagramInsights(accessToken, igAccountId, from, to)

    return reply.send({
      account: {
        id: account.igAccountId,
        username: account.username,
        name: account.name,
        profilePicUrl: account.profilePicUrl,
        followersCount: account.followersCount,
        mediaCount: account.mediaCount,
      },
      insights,
    })
  })

  // POST /api/instagram/accounts/:igAccountId/refresh — atualiza métricas da conta
  app.post('/accounts/:igAccountId/refresh', { preHandler: app.authenticate }, async (request, reply) => {
    const { igAccountId } = request.params as { igAccountId: string }

    const account = await app.prisma.instagramAccount.findFirst({
      where: { userId: request.userId, igAccountId },
    })

    if (!account) {
      return reply.status(404).send({ error: 'Conta Instagram não encontrada' })
    }

    const connection = await app.prisma.facebookConnection.findUnique({
      where: { userId: request.userId },
    })

    if (!connection || connection.tokenInvalid) {
      return reply.status(401).send({ error: 'Token Meta inválido' })
    }

    const accessToken = decrypt(connection.accessToken)
    const igAccounts = await metaApiService.getInstagramAccounts(accessToken)
    const updated = igAccounts.find(a => a.id === igAccountId)

    if (!updated) {
      return reply.status(404).send({ error: 'Conta não encontrada na Meta API' })
    }

    const refreshed = await app.prisma.instagramAccount.update({
      where: { id: account.id },
      data: {
        username: updated.username,
        name: updated.name ?? null,
        profilePicUrl: updated.profilePictureUrl ?? null,
        followersCount: updated.followersCount ?? null,
        mediaCount: updated.mediaCount ?? null,
        lastSyncAt: new Date(),
      },
    })

    return reply.send(refreshed)
  })
}
