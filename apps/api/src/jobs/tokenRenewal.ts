import type { PrismaClient } from '@prisma/client'
import type { FastifyBaseLogger } from 'fastify'
import { encrypt, decrypt } from '../services/crypto.js'

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0'
const RENEW_THRESHOLD_DAYS = 10
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 5_000 // 5s entre tentativas

// ─── Parser de cron "minute hour * * *" ───────────────────────────────────────
// Suporta apenas o subconjunto necessário: "0 3 * * *" (minuto e hora fixos)

interface CronTime { hour: number; minute: number }

function parseCronSchedule(schedule: string): CronTime {
  const parts = schedule.trim().split(/\s+/)
  if (parts.length !== 5) throw new Error(`Cron inválido: "${schedule}"`)
  const minute = parseInt(parts[0], 10)
  const hour = parseInt(parts[1], 10)
  if (isNaN(minute) || isNaN(hour) || minute < 0 || minute > 59 || hour < 0 || hour > 23) {
    throw new Error(`Valores de horário inválidos no cron: "${schedule}"`)
  }
  return { hour, minute }
}

function msUntilNextRun({ hour, minute }: CronTime): number {
  const now = new Date()
  const next = new Date()
  next.setHours(hour, minute, 0, 0)
  // Se o horário de hoje já passou, agenda para amanhã
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1)
  }
  return next.getTime() - now.getTime()
}

// ─── Renovação com retry ───────────────────────────────────────────────────────

async function renewTokenWithRetry(
  appId: string,
  appSecret: string,
  currentToken: string,
  attempt = 1
): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const res = await fetch(
      `${META_GRAPH_URL}/oauth/access_token?` +
      new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: currentToken,
      })
    )

    const data = await res.json() as {
      access_token?: string
      expires_in?: number
      error?: { message: string; code?: number }
    }

    if (data.access_token) {
      return {
        access_token: data.access_token,
        expires_in: data.expires_in ?? 60 * 24 * 60 * 60, // fallback: 60 dias
      }
    }

    // Falha da API — retry se ainda há tentativas
    if (attempt < MAX_RETRY_ATTEMPTS) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt))
      return renewTokenWithRetry(appId, appSecret, currentToken, attempt + 1)
    }

    return null
  } catch {
    if (attempt < MAX_RETRY_ATTEMPTS) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt))
      return renewTokenWithRetry(appId, appSecret, currentToken, attempt + 1)
    }
    return null
  }
}

// ─── Job principal ─────────────────────────────────────────────────────────────

async function renewExpiringTokens(prisma: PrismaClient, log: FastifyBaseLogger): Promise<void> {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET

  if (!appId || !appSecret) {
    log.warn('[TokenRenewal] META_APP_ID ou META_APP_SECRET não configurados — job ignorado')
    return
  }

  const thresholdDate = new Date(Date.now() + RENEW_THRESHOLD_DAYS * 24 * 60 * 60 * 1000)

  // Busca apenas conexões válidas (tokenInvalid=false) que expiram nos próximos 10 dias
  const connections = await prisma.facebookConnection.findMany({
    where: {
      tokenExpiresAt: { lte: thresholdDate },
      tokenInvalid: false,
    },
    select: { id: true, userId: true, fbUserName: true, accessToken: true, tokenExpiresAt: true },
  })

  if (connections.length === 0) {
    log.info('[TokenRenewal] Nenhum token expirando nos próximos 10 dias')
    return
  }

  log.info(`[TokenRenewal] ${connections.length} token(s) para renovar`)

  for (const conn of connections) {
    let currentToken: string
    try {
      currentToken = decrypt(conn.accessToken)
    } catch {
      log.warn({ userId: conn.userId }, '[TokenRenewal] Falha ao descriptografar token — pulando')
      continue
    }

    const result = await renewTokenWithRetry(appId, appSecret, currentToken)

    if (result) {
      // Sucesso: atualiza token e expiry (60 dias fixos conforme padrão Meta long-lived)
      const tokenExpiresAt = new Date(Date.now() + result.expires_in * 1000)
      const encryptedToken = encrypt(result.access_token)

      await prisma.facebookConnection.update({
        where: { id: conn.id },
        data: { accessToken: encryptedToken, tokenExpiresAt, tokenInvalid: false },
      })

      // Sincroniza o token nas AdAccounts oauth deste usuário
      await prisma.adAccount.updateMany({
        where: { userId: conn.userId, source: 'oauth' },
        data: { metaAccessToken: encryptedToken },
      })

      log.info(`[TokenRenewal] Token renovado para userId ${conn.userId}`)
    } else {
      // Falhou todas as tentativas — NÃO desconecta, apenas audita
      const errorMsg = `Falha após ${MAX_RETRY_ATTEMPTS} tentativas de renovação`

      log.warn(
        { userId: conn.userId, fbUserName: conn.fbUserName, expiresAt: conn.tokenExpiresAt },
        `[TokenRenewal] ${errorMsg}`
      )

      await prisma.tokenRenewalFailure.create({
        data: {
          userId: conn.userId,
          fbUserName: conn.fbUserName,
          error: errorMsg,
          attempts: MAX_RETRY_ATTEMPTS,
        },
      })
    }
  }
}

// ─── Bootstrap do job com scheduler cron ──────────────────────────────────────

function scheduleNextRun(cronTime: CronTime, prisma: PrismaClient, log: FastifyBaseLogger): void {
  const delay = msUntilNextRun(cronTime)
  const nextRun = new Date(Date.now() + delay)

  log.info(`[TokenRenewal] Próxima execução agendada para ${nextRun.toISOString()}`)

  setTimeout(() => {
    renewExpiringTokens(prisma, log)
      .catch(err => log.error({ err }, '[TokenRenewal] Erro durante execução'))
      .finally(() => scheduleNextRun(cronTime, prisma, log)) // re-agenda para o dia seguinte
  }, delay)
}

export function startTokenRenewalJob(prisma: PrismaClient, log: FastifyBaseLogger): void {
  const schedule = process.env.TOKEN_RENEWAL_CRON_SCHEDULE ?? '0 3 * * *'

  let cronTime: CronTime
  try {
    cronTime = parseCronSchedule(schedule)
  } catch (err) {
    log.error(`[TokenRenewal] Cron schedule inválido "${schedule}": ${(err as Error).message}. Usando 03:00 como fallback.`)
    cronTime = { hour: 3, minute: 0 }
  }

  log.info(`[TokenRenewal] Job iniciado — schedule: "${schedule}" (${cronTime.hour}:${String(cronTime.minute).padStart(2, '0')} diário)`)

  // Agenda o próximo disparo no horário configurado
  scheduleNextRun(cronTime, prisma, log)
}
