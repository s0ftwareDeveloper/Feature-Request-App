import { SignJWT, jwtVerify } from 'jose'

// Use a more secure secret and ensure it's the same for signing and verifying
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-that-is-very-long"
const secretKey = new Uint8Array(Buffer.from(JWT_SECRET, 'utf-8'))

export async function signJWT(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secretKey)
}

export async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey)
    return payload as {
      id: string
      email: string
      role: string
    }
  } catch (error) {
    // Log the specific verification error
    console.error("JWT verification failed:", error)
    return null
  }
}

