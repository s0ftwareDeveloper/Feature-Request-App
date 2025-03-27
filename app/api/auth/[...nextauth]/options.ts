import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

/**
 * Helper function to ensure image URLs are absolute
 */
function ensureAbsoluteUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  
  try {
    // Check if it's already an absolute URL (has a protocol)
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Check if it's a protocol-relative URL
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    
    // If it's a relative URL, make it absolute
    if (url.startsWith('/')) {
      // Use the deployment URL or localhost as base
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      return `${baseUrl}${url}`;
    }
    
    // If none of the above, assume it's missing https:// (common with some providers)
    return `https://${url}`;
  } catch (error) {
    console.error('Error processing image URL:', url, error);
    return url; // Return the original URL if something went wrong
  }
}

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
          console.log('Google profile received:', JSON.stringify(profile, null, 2));
          console.log('Google user object:', JSON.stringify(user, null, 2));
          
          // Type-cast the profile to access Google-specific properties
          const googleProfile = profile as any;
          
          // Get profile image from Google profile data
          const profileImage = 
            googleProfile.picture || 
            googleProfile.image || 
            googleProfile.photos?.[0]?.value ||
            googleProfile.image_url ||
            googleProfile.picture_url ||
            googleProfile.avatar_url ||
            null;
            
          console.log('Profile image extracted:', profileImage);
          
          // Ensure user object has image if available
          if (profileImage && user) {
            (user as any).image = profileImage;
          }

          // Check if user exists
          let dbUser = await prisma.user.findUnique({
            where: { email: profile.email }
          });
          
          // If user doesn't exist, create one
          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                id: user.id || crypto.randomUUID(),
                email: profile.email,
                name: googleProfile.name || googleProfile.given_name || profile.email?.split('@')[0],
                image: profileImage,
                password: '',
                role: 'user',
              }
            });
            console.log('Created new user with profile image:', profileImage);
          } 
          // If user exists, ALWAYS update their profile image from Google
          else {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { 
                image: profileImage,
                name: googleProfile.name || dbUser.name // Update name too if available
              }
            });
            console.log('Updated existing user with profile image:', profileImage);
            
            // Verify the update was successful
            const verifyUser = await prisma.user.findUnique({
              where: { id: dbUser.id }
            });
            console.log('User after update:', JSON.stringify(verifyUser, null, 2));
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
          console.error('Error in Google signIn callback:', error);
          return false;
        }
      }
      
      return true;
    },
    async jwt({ token, user, account, profile }) {
      console.log('JWT Callback - Current token:', JSON.stringify(token, null, 2));
      console.log('JWT Callback - User data:', user ? JSON.stringify(user, null, 2) : 'No user data');
      
      if (user) {
        token.id = user.id
        token.role = user.role || 'user'
        
        // If user object has an image, make sure it's in the token
        if ((user as any).image) {
          token.picture = ensureAbsoluteUrl((user as any).image);
          // Also set the token.image field to ensure consistent field naming
          token.image = ensureAbsoluteUrl((user as any).image);
        }

        // If this is coming from a Google sign-in, make sure the image is included
        if (account?.provider === 'google' && profile) {
          // Use proper type casting for the profile object
          const googleProfile = profile as any;
          // Set both token.picture and token.image
          const profilePicture = googleProfile.picture || googleProfile.image || token.picture;
          token.picture = ensureAbsoluteUrl(profilePicture);
          token.image = ensureAbsoluteUrl(profilePicture);
          console.log('Setting token picture from Google profile:', token.picture);
          console.log('Setting token image from Google profile:', token.image);
        }
      }
      
      console.log('JWT Callback - Final token:', JSON.stringify(token, null, 2));
      return token
    },
    async session({ session, token }) {
      console.log('Session Callback - Input token:', JSON.stringify(token, null, 2));
      console.log('Session Callback - Current session:', JSON.stringify(session, null, 2));
      
      if (token) {
        // Ensure both token.image and token.picture are used
        const profileImage = token.image || token.picture;
        
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as string || 'user',
          // Use the combined image source
          image: profileImage as string || session.user.image
        }

        // Force console output of the final image URL for debugging
        console.log('FINAL IMAGE URL SET IN SESSION:', session.user.image);
      }
      
      // Double-check if we have a user ID but no image, try to fetch from DB
      if (session?.user?.id && !session.user.image) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id }
          });
          
          if (dbUser?.image) {
            session.user.image = dbUser.image;
            console.log('Retrieved image from database:', dbUser.image);
          }
        } catch (error) {
          console.error('Error fetching user image in session callback:', error);
        }
      }
      
      console.log('Session Callback - Final session:', JSON.stringify(session, null, 2));
      return session
    }
  }
} 