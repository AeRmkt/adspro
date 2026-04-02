import type { FastifyInstance } from 'fastify'
import type { GenerateReportRequest } from '@adspro/types'
import { generateReport } from '../services/reportGenerator.js'

export async function reportsRoutes(app: FastifyInstance): Promise<void> {

  // POST /api/reports/generate
  app.post<{ Body: GenerateReportRequest }>(
    '/generate',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { accountId, dateFrom, dateTo, type, name } = request.body

      if (!accountId || !dateFrom || !dateTo || !type) {
        return reply.status(400).send({ error: 'accountId, dateFrom, dateTo e type são obrigatórios' })
      }

      if (!['pdf', 'csv'].includes(type)) {
        return reply.status(400).send({ error: 'type deve ser "pdf" ou "csv"' })
      }

      const account = await app.prisma.adAccount.findFirst({
        where: { id: accountId, userId: request.userId, isActive: true },
      })
      if (!account) return reply.status(403).send({ error: 'Conta não encontrada ou acesso negado' })

      const report = await app.prisma.report.create({
        data: {
          userId: request.userId,
          adAccountId: accountId,
          name: name || `Relatório ${account.accountName} ${dateFrom} a ${dateTo}`,
          dateFrom,
          dateTo,
          type,
          status: 'pending',
        },
      })

      // Geração assíncrona real
      setImmediate(() => {
        generateReport(report.id, app.prisma, app.log)
      })

      return reply.status(202).send({ reportId: report.id, status: 'pending' })
    }
  )

  // GET /api/reports
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const reports = await app.prisma.report.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return reply.send({ data: reports })
  })

  // GET /api/reports/:id — status de um relatório
  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const report = await app.prisma.report.findFirst({
        where: { id: request.params.id, userId: request.userId },
      })
      if (!report) return reply.status(404).send({ error: 'Relatório não encontrado' })
      return reply.send(report)
    }
  )

  // GET /api/reports/:id/download
  app.get<{ Params: { id: string } }>(
    '/:id/download',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const report = await app.prisma.report.findFirst({
        where: { id: request.params.id, userId: request.userId },
      })

      if (!report) return reply.status(404).send({ error: 'Relatório não encontrado' })

      if (report.status === 'error') {
        return reply.status(500).send({ error: 'Erro ao gerar relatório', detail: report.errorMsg })
      }

      if (report.status !== 'done' || !report.fileUrl) {
        return reply.status(400).send({ error: 'Relatório ainda não está disponível', status: report.status })
      }

      // Signed URL via Supabase Storage
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      const fileName = `${report.id}.${report.type}`

      const { data, error } = await supabase.storage
        .from('reports')
        .createSignedUrl(fileName, 3600) // 1 hora

      if (error || !data) {
        // Fallback para URL pública se signed URL falhar
        return reply.send({
          downloadUrl: report.fileUrl,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        })
      }

      return reply.send({
        downloadUrl: data.signedUrl,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
    }
  )

  // DELETE /api/reports/:id
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const report = await app.prisma.report.findFirst({
        where: { id: request.params.id, userId: request.userId },
      })
      if (!report) return reply.status(404).send({ error: 'Relatório não encontrado' })

      await app.prisma.report.delete({ where: { id: report.id } })
      return reply.send({ ok: true })
    }
  )
}
