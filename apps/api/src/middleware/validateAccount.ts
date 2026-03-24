import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'

/**
 * Verifica se o adAccountId do query/body pertence ao usuário autenticado.
 * Decora o request com adAccount para uso nas rotas.
 */
export async function validateAccount(
  request: FastifyRequest<{ Querystring: { accountId?: string }; Body: { accountId?: string } }>,
  reply: FastifyReply,
  app: FastifyInstance
): Promise<void> {
  const accountId = request.query.accountId || (request.body as { accountId?: string })?.accountId

  if (!accountId) {
    return reply.status(400).send({ error: 'accountId é obrigatório' })
  }

  const account = await app.prisma.adAccount.findFirst({
    where: { id: accountId, userId: request.userId },
  })

  if (!account) {
    return reply.status(403).send({ error: 'Conta não encontrada ou acesso negado' })
  }

  (request as FastifyRequest & { adAccount: typeof account }).adAccount = account
}
