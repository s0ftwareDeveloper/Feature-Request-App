import { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's id. */
      id: string
      /** The user's role. */
      role: string
      /** The user's profile image URL. */
      image?: string | null
    } & DefaultSession["user"]
  }

  interface User {
    /** The user's role. */
    role?: string
    /** The user's profile image URL. */
    image?: string | null
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    /** The user's id. */
    id?: string
    /** The user's role. */
    role?: string
    /** The user's profile image URL. */
    picture?: string
    /** Alternate field for the user's profile image URL. */
    image?: string
  }
} 