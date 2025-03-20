export const authOptions = {
  providers: [],
  callbacks: {
    session: () => ({
      user: {
        id: 'mock-user-id',
        email: 'mock@example.com',
        role: 'user'
      }
    })
  }
} 