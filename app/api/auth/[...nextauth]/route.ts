import { NextAuthOptions } from 'next-auth'
import { getServerSession } from 'next-auth/next'
import { Session } from 'next-auth'
import { JWT } from 'next-auth/jwt'
import { AdapterUser } from 'next-auth/adapters'

export const authOptions: NextAuthOptions = {
  providers: [],
  callbacks: {
    session: async ({ session, user, token }: { 
      session: Session, 
      user?: AdapterUser | undefined, 
      token?: JWT | undefined,
      newSession?: Session | undefined,
      trigger?: 'update' | 'signIn' | 'signOut'
    }) => {
      try {
        if (token && (token.sub || token.id || token.role)) {
          session.user = {
            ...session.user,
            id: token.sub || token.id || session.user?.id,
            role: token.role || session.user?.role
          }
        } else if (user) {
          session.user = {
            ...session.user,
            ...user
          }
        }
        return session
      } catch (error) {
        console.error('Error in session callback:', error)
        return session
      }
    }
  }
}

export const handlers = {
  GET: async (request: Request) => {
    try {
      const session = await getServerSession(authOptions)
      return session || {}
    } catch (error) {
      console.error('Error in GET handler:', error)
      return {}
    }
  },
  POST: async (request: Request) => {
    try {
      let body = {}
      try {
        body = await request.json()
      } catch (error) {
        console.error('Error parsing request body:', error)
        return {}
      }
      
      const session = await getServerSession(authOptions)
      if (!session) {
        return {}
      }
      return session
    } catch (error) {
      console.error('Error in POST handler:', error)
      return {}
    }
  }
} 