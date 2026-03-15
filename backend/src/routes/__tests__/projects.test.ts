import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import projectsRouter from '../projects';
import { prisma } from '../../db';

vi.mock('../../db', () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
      create: vi.fn(),
    }
  }
}));

const prismaMock = prisma as any;

// Mock the auth middleware to always authenticate a fake user
vi.mock('../../middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  },
}));

const app = express();
app.use(express.json());
app.use('/api/projects', projectsRouter);

describe('Projects Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'test-user-id',
        title: 'Create a react app',
        prompt: 'Create a react app',
        template: 'react',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      prismaMock.project.create.mockResolvedValue(mockProject);

      const response = await request(app)
        .post('/api/projects')
        .send({
          prompt: 'Create a react app',
          template: 'react',
        });

      expect(response.status).toBe(201);
      expect(response.body.project).toHaveProperty('id', 'proj-1');
      expect(prismaMock.project.create).toHaveBeenCalledOnce();
    });

    it('should fail if prompt is missing', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({
          template: 'react',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/projects', () => {
    it('should return a list of projects for the user', async () => {
      const mockProjects = [
        {
          id: 'proj-1',
          title: 'App 1',
          prompt: 'prompt 1',
          template: 'react',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { messages: 0 },
        },
      ];
      
      prismaMock.project.findMany.mockResolvedValue(mockProjects as any);

      const response = await request(app).get('/api/projects');

      expect(response.status).toBe(200);
      expect(response.body.projects).toHaveLength(1);
      expect(response.body.projects[0].id).toBe('proj-1');
    });
  });
});
