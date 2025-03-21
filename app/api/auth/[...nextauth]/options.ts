import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Find user in database
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          })
          
          // Check if user exists and password matches
          if (!user || !user.password) {
            return null
          }
          
          const passwordMatch = await bcrypt.compare(credentials.password, user.password)
          
          if (!passwordMatch) {
            return null
          }
          
          return {
            id: user.id,
            email: user.email,
            role: user.role || 'user',
            name: user.name
          }
        } catch (error) {
          console.error('Error authorizing user:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  secret: process.env.NEXTAUTH_SECRET || 'my-secret-that-should-be-in-env-file',
  pages: {
    signIn: '/login',
    error: '/login?error=AuthenticationError'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as string || 'user'
        }
      }
      return session
    }
  }
} 