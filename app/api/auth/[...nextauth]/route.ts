import NextAuth from 'next-auth'
import { authOptions } from './options'

// Create the NextAuth handler
const handler = NextAuth(authOptions)

// Export the handler for all HTTP methods used by NextAuth.js
export { handler as GET, handler as POST } 