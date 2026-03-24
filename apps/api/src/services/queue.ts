import type { FastifyBaseLogger } from 'fastify'

interface QueueTask<T> {
  fn: () => Promise<T>
  resolve: (value: T) => void
  reject: (err: unknown) => void
  priority: number
}

class RequestQueue {
  private queues = new Map<string, QueueTask<unknown>[]>()
  private running = new Map<string, number>()
  private readonly maxConcurrent: number
  private readonly delayMs: number
  private logger?: FastifyBaseLogger

  constructor(maxConcurrent = 10, delayMs = 100) {
    this.maxConcurrent = maxConcurrent
    this.delayMs = delayMs
  }

  setLogger(logger: FastifyBaseLogger): void {
    this.logger = logger
  }

  enqueue<T>(tokenKey: string, fn: () => Promise<T>, priority = 1): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!this.queues.has(tokenKey)) this.queues.set(tokenKey, [])
      if (!this.running.has(tokenKey)) this.running.set(tokenKey, 0)

      const queue = this.queues.get(tokenKey)!
      queue.push({ fn: fn as () => Promise<unknown>, resolve: resolve as (v: unknown) => void, reject, priority })
      // Ordena por prioridade (maior = primeiro)
      queue.sort((a, b) => b.priority - a.priority)
      this.processQueue(tokenKey)
    })
  }

  private async processQueue(tokenKey: string): Promise<void> {
    const queue = this.queues.get(tokenKey)!
    const running = this.running.get(tokenKey)!

    if (running >= this.maxConcurrent || queue.length === 0) return

    const task = queue.shift()!
    this.running.set(tokenKey, running + 1)

    try {
      await new Promise((r) => setTimeout(r, this.delayMs))
      const result = await task.fn()
      task.resolve(result)
    } catch (err) {
      task.reject(err)
    } finally {
      this.running.set(tokenKey, (this.running.get(tokenKey) || 1) - 1)
      this.processQueue(tokenKey)
    }
  }
}

export const requestQueue = new RequestQueue(10, 100)
