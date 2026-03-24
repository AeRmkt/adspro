import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const secret = process.env.APP_SECRET
  if (!secret) throw new Error('APP_SECRET não configurado')
  // Deriva chave de 32 bytes usando SHA-256
  return crypto.createHash('sha256').update(secret).digest()
}

/**
 * Criptografa string com AES-256-GCM
 * Retorna: iv:authTag:encrypted (base64)
 */
export function encrypt(text: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag()

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

/**
 * Descriptografa string criptografada com encrypt()
 */
export function decrypt(encryptedData: string): string {
  const key = getKey()
  const [ivB64, authTagB64, encrypted] = encryptedData.split(':')

  if (!ivB64 || !authTagB64 || !encrypted) {
    throw new Error('Formato de dados criptografados inválido')
  }

  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
