import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const users = [
  { id: '1', name: 'Dr. Priya Sharma', email: 'priya.sharma@college.edu', role: 'hod', department: 'Computer Science', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=PS&backgroundColor=1e3a5f&textColor=ffffff' },
  { id: '2', name: 'Prof. Rajesh Kumar', email: 'rajesh@college.edu', role: 'faculty', department: 'Computer Science', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=RK&backgroundColor=2d5a3d&textColor=ffffff' },
  { id: '3', name: 'Dr. Anita Desai', email: 'anita@college.edu', role: 'assistant_professor', department: 'Computer Science', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=AD&backgroundColor=5a2d4f&textColor=ffffff' },
  { id: '4', name: 'Dr. Sunil Mehta', email: 'sunil@college.edu', role: 'principal', department: 'Administration', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=SM&backgroundColor=4a3d1e&textColor=ffffff' },
  { id: '5', name: 'Prof. Kavita Rao', email: 'kavita@college.edu', role: 'director', department: 'Administration', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=KR&backgroundColor=1e4a5a&textColor=ffffff' },
  { id: '6', name: 'Dr. Amit Patel', email: 'amit@college.edu', role: 'faculty', department: 'Mathematics', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=AP&backgroundColor=3d2d1e&textColor=ffffff' },
];

async function main() {
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: u
    });
  }
  console.log('Seeded mock users!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
