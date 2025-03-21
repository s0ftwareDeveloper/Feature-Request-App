import { AuthOptions } from 'next-auth'

export const authOptions: AuthOptions = {
  providers: [],
  callbacks: {
    async session({ session, user }) {
      return session
    }
  }
}

export const handlers = {
  GET: async (request: Request) => {
    try {
      // Process the request
      return {}
    } catch (error) {
      console.error('NextAuth GET error:', error)
      return {}
    }
  },
  POST: async (request: Request) => {
    try {
      // Process the request
      return {}
    } catch (error) {
      console.error('NextAuth POST error:', error)
      return {}
    }
  }
} 