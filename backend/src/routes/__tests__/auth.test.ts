import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import authRouter from '../auth';
import { prisma } from '../../db';

vi.mock('../../db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    }
  }
}));

// We can now just use `prisma` imported above as our mocked object
const prismaMock = prisma as any;

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      
      const mockUser = {
        id: 'user-123',
        name: 'Test',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        createdAt: new Date(),
      };
      
      prismaMock.user.create.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test',
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toEqual({
        id: 'user-123',
        name: 'Test',
        email: 'test@example.com',
      });
      expect(prismaMock.user.create).toHaveBeenCalledOnce();
    });

    it('should fail with 409 if email already exists', async () => {
      // Setup mock to simulate existing user
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'existing',
        name: 'Existing',
        email: 'test@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test',
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toMatch(/in use/i);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        name: 'Test',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should return 401 for wrong password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        name: 'Test',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
    });
  });
});
