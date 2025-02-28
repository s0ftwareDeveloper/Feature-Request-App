import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth' // Adjust path as needed

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await hashPassword('your-admin-password')
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
    },
  })
  
  console.log('Admin created:', admin)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 