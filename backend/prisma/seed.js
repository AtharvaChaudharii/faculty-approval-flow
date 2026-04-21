"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
// All demo users share the same default password: "password123"
const DEFAULT_PASSWORD = 'password123';
function hashPassword(plain) {
    return __awaiter(this, void 0, void 0, function* () {
        return bcryptjs_1.default.hash(plain, 10);
    });
}
function buildUsers() {
    return __awaiter(this, void 0, void 0, function* () {
        const hashed = yield hashPassword(DEFAULT_PASSWORD);
        return [
            { id: '1', name: 'Dr. Priya Sharma', email: 'priya.sharma@college.edu', password: hashed, role: 'hod', department: 'Computer Science', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=PS&backgroundColor=1e3a5f&textColor=ffffff' },
            { id: '2', name: 'Prof. Rajesh Kumar', email: 'rajesh@college.edu', password: hashed, role: 'faculty', department: 'Computer Science', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=RK&backgroundColor=2d5a3d&textColor=ffffff' },
            { id: '3', name: 'Dr. Anita Desai', email: 'anita@college.edu', password: hashed, role: 'assistant_professor', department: 'Computer Science', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=AD&backgroundColor=5a2d4f&textColor=ffffff' },
            { id: '4', name: 'Dr. Sunil Mehta', email: 'sunil@college.edu', password: hashed, role: 'principal', department: 'Administration', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=SM&backgroundColor=4a3d1e&textColor=ffffff' },
            { id: '5', name: 'Prof. Kavita Rao', email: 'kavita@college.edu', password: hashed, role: 'director', department: 'Administration', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=KR&backgroundColor=1e4a5a&textColor=ffffff' },
            { id: '6', name: 'Dr. Amit Patel', email: 'amit@college.edu', password: hashed, role: 'faculty', department: 'Mathematics', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=AP&backgroundColor=3d2d1e&textColor=ffffff' },
        ];
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const users = yield buildUsers();
        for (const u of users) {
            // Try update first, then create if not found
            const existing = yield prisma.user.findFirst({
                where: { OR: [{ id: u.id }, { email: u.email }] }
            });
            if (existing) {
                yield prisma.user.update({
                    where: { id: existing.id },
                    data: { password: u.password, name: u.name, role: u.role, department: u.department, avatar: u.avatar }
                });
            }
            else {
                yield prisma.user.create({ data: u });
            }
        }
        console.log('Seeded mock users! (default password: password123)');
    });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
