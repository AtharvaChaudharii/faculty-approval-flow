import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// All demo users share the same default password: "password123"
const DEFAULT_PASSWORD = 'password123';

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

async function buildUsers() {
  const hashed = await hashPassword(DEFAULT_PASSWORD);
  return [
    { id: '1', name: 'Dr. Priya Sharma', email: 'priya.sharma@college.edu', password: hashed, role: 'hod', department: 'Computer Science', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=PS&backgroundColor=1e3a5f&textColor=ffffff' },
    { id: '2', name: 'Prof. Rajesh Kumar', email: 'rajesh@college.edu', password: hashed, role: 'faculty', department: 'Computer Science', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=RK&backgroundColor=2d5a3d&textColor=ffffff' },
    { id: '3', name: 'Dr. Anita Desai', email: 'anita@college.edu', password: hashed, role: 'assistant_professor', department: 'Computer Science', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=AD&backgroundColor=5a2d4f&textColor=ffffff' },
    { id: '4', name: 'Dr. Sunil Mehta', email: 'sunil@college.edu', password: hashed, role: 'principal', department: 'Administration', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=SM&backgroundColor=4a3d1e&textColor=ffffff' },
    { id: '5', name: 'Prof. Kavita Rao', email: 'kavita@college.edu', password: hashed, role: 'director', department: 'Administration', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=KR&backgroundColor=1e4a5a&textColor=ffffff' },
    { id: '6', name: 'Dr. Amit Patel', email: 'amit@college.edu', password: hashed, role: 'faculty', department: 'Mathematics', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=AP&backgroundColor=3d2d1e&textColor=ffffff' },
  ];
}

async function main() {
  const users = await buildUsers();
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { password: u.password },
      create: u
    });
  }
  console.log('Seeded mock users! (default password: password123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
