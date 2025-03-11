import { AuthOptions } from 'next-auth'

export const authOptions: AuthOptions = {
  providers: [],
  callbacks: {
    async session({ session, user }) {
      return session
    }
  }
} 