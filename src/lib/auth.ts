const SECRET = process.env.ADMIN_PASSWORD || 'secure-dental-fallback-key'

export async function signToken(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(SECRET)
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(value)
  )
  const hex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `${value}.${hex}`
}

export async function verifyToken(tokenString: string | undefined): Promise<string | null> {
  if (!tokenString) return null
  const parts = tokenString.split('.')
  if (parts.length !== 2) return null
  const [value, hex] = parts
  const encoder = new TextEncoder()
  const keyData = encoder.encode(SECRET)
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  const sigBytes = new Uint8Array(
    hex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
  )
  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    encoder.encode(value)
  )
  return isValid ? value : null
}
