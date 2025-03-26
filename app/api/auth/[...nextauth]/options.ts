import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export const authOptions: AuthOptions = {
  debug: process.env.NODE_ENV === 'development',
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
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
    error: '/auth/error'
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // For Google sign-in, we need to check if the user exists and create them if not
      if (account?.provider === 'google' && profile?.email) {
        try {
          // Check if user exists
          let dbUser = await prisma.user.findUnique({
            where: { email: profile.email }
          });
          
          // If user doesn't exist, create one
          if (!dbUser) {
            // Access profile image correctly from Google profile
            const profileImage = profile.picture || profile.image || 
                                (profile as any).photos?.[0]?.value || 
                                null;
                                
            dbUser = await prisma.user.create({
              data: {
                id: user.id || crypto.randomUUID(),
                email: profile.email,
                name: profile.name || profile.email?.split('@')[0],
                // Save the user's profile image
                image: profileImage,
                // No password for OAuth users
                password: '',
                role: 'user',
              }
            });
          }
          // If user exists but doesn't have an image, update it with the Google profile image
          else if (!dbUser.image) {
            const profileImage = profile.picture || profile.image || 
                               (profile as any).photos?.[0]?.value || 
                               null;
                               
            if (profileImage) {
              await prisma.user.update({
                where: { id: dbUser.id },
                data: { image: profileImage }
              });
            }
          }
          
          // Link the account to the user
          await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId
              }
            },
            create: {
              id: crypto.randomUUID(),
              userId: dbUser.id,
              type: account.type || 'oauth',
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
            },
            update: {
              access_token: account.access_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
            }
          });
          
          return true;
        } catch (error) {
          console.error('Error in signIn callback:', error);
          return false;
        }
      }
      
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role || 'user'
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