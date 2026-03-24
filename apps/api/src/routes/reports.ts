import type { FastifyInstance } from 'fastify'
import type { GenerateReportRequest } from '@adspro/types'

export async function reportsRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: GenerateReportRequest }>(
    '/generate',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { accountId, dateFrom, dateTo, type, name } = request.body

      if (!accountId || !dateFrom || !dateTo || !type) {
        return reply.status(400).send({ error: 'accountId, dateFrom, dateTo e type são obrigatórios' })
      }

      const account = await app.prisma.adAccount.findFirst({
        where: { id: accountId, userId: request.userId, isActive: true },
      })
      if (!account) return reply.status(403).send({ error: 'Conta não encontrada ou acesso negado' })

      const report = await app.prisma.report.create({
        data: {
          userId: request.userId,
          adAccountId: accountId,
          name: name || `Relatório ${dateFrom} a ${dateTo}`,
          dateFrom,
          dateTo,
          type,
          status: 'pending',
        },
      })

      setImmediate(async () => {
        try {
          await app.prisma.report.update({ where: { id: report.id }, data: { status: 'processing' } })
          await new Promise((r) => setTimeout(r, 2000))
          await app.prisma.report.update({
            where: { id: report.id },
            data: { status: 'done', fileUrl: `https://storage.example.com/reports/${report.id}.${type}` },
          })
        } catch (err) {
          await app.prisma.report.update({ where: { id: report.id }, data: { status: 'error' } })
          app.log.error(err, 'Erro ao gerar relatório')
        }
      })

      return reply.status(202).send({ reportId: report.id })
    }
  )

  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const reports = await app.prisma.report.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return reply.send({ data: reports })
  })

  app.get<{ Params: { id: string } }>(
    '/:id/download',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const report = await app.prisma.report.findFirst({
        where: { id: request.params.id, userId: request.userId },
      })

      if (!report) return reply.status(404).send({ error: 'Relatório não encontrado' })

      if (report.status !== 'done' || !report.fileUrl) {
        return reply.status(400).send({ error: 'Relatório ainda não está disponível', status: report.status })
      }

      return reply.send({
        downloadUrl: report.fileUrl,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
    }
  )
}
