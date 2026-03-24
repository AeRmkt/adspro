import NodeCache from 'node-cache'
import crypto from 'crypto'
import type { PrismaClient } from '@prisma/client'

// Cache em memória: TTL 5min para insights, 1h para estrutura
const memoryCache = new NodeCache({ stdTTL: 300, checkperiod: 60 })

export function buildCacheKey(params: Record<string, string>): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return crypto.createHash('md5').update(sorted).digest('hex')
}

export async function getFromCache<T>(
  key: string,
  prisma: PrismaClient,
  adAccountId: string,
  level: string,
  entityId: string,
  dateFrom: string,
  dateTo: string
): Promise<T | null> {
  // Nível 1: memória
  const memHit = memoryCache.get<T>(key)
  if (memHit !== undefined) return memHit

  // Nível 2: banco de dados
  const dbHit = await prisma.cachedInsights.findUnique({
    where: {
      adAccountId_level_entityId_dateFrom_dateTo: {
        adAccountId,
        level,
        entityId,
        dateFrom,
        dateTo,
      },
    },
  })

  if (!dbHit) return null

  // Verifica TTL de 30 minutos no banco
  const ageMs = Date.now() - dbHit.cachedAt.getTime()
  if (ageMs > 30 * 60 * 1000) {
    // Cache expirado no banco, remover
    await prisma.cachedInsights.delete({ where: { id: dbHit.id } })
    return null
  }

  const data = dbHit.data as T
  // Repopula memória
  memoryCache.set(key, data)
  return data
}

export async function setInCache<T>(
  key: string,
  data: T,
  prisma: PrismaClient,
  adAccountId: string,
  level: string,
  entityId: string,
  dateFrom: string,
  dateTo: string,
  ttlSeconds = 300
): Promise<void> {
  // Salva em memória
  memoryCache.set(key, data, ttlSeconds)

  // Salva no banco
  await prisma.cachedInsights.upsert({
    where: {
      adAccountId_level_entityId_dateFrom_dateTo: {
        adAccountId,
        level,
        entityId,
        dateFrom,
        dateTo,
      },
    },
    create: {
      adAccountId,
      level,
      entityId,
      dateFrom,
      dateTo,
      data: data as object,
    },
    update: {
      data: data as object,
      cachedAt: new Date(),
    },
  })
}

export function invalidateMemoryCache(pattern?: string): void {
  if (!pattern) {
    memoryCache.flushAll()
    return
  }
  const keys = memoryCache.keys().filter((k) => k.includes(pattern))
  memoryCache.del(keys)
}
