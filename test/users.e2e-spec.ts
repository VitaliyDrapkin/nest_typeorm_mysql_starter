import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { UserEntity } from '../src/modules/users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<UserEntity>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same global pipes as in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    userRepository = moduleFixture.get<Repository<UserEntity>>(
      getRepositoryToken(UserEntity),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await userRepository.delete({});
  });

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        email: 'john.doe@example.com',
        name: 'John Doe',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        email: createUserDto.email,
      });

      // Password should not be in response
      expect(response.body.password).toBeUndefined();

      // Verify user exists in database
      const userInDb = await userRepository.findOne({
        where: { email: createUserDto.email },
      });
      expect(userInDb).toBeDefined();
      expect(userInDb?.email).toBe(createUserDto.email);
    });

    it('should return 400 if email is invalid', async () => {
      const invalidDto = {
        email: 'invalid-email',
        name: 'John Doe',
        password: 'password123',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(invalidDto)
        .expect(400);
    });

    it('should return 400 if password is too short', async () => {
      const invalidDto = {
        email: 'john.doe@example.com',
        name: 'John Doe',
        password: 'short',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(invalidDto)
        .expect(400);
    });

    it('should return 400 if password is too long', async () => {
      const invalidDto = {
        email: 'john.doe@example.com',
        name: 'John Doe',
        password: 'a'.repeat(17), // 17 characters, max is 16
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(invalidDto)
        .expect(400);
    });

    it('should return 400 if required fields are missing', async () => {
      const incompleteDto = {
        email: 'john.doe@example.com',
        // missing name and password
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(incompleteDto)
        .expect(400);
    });
  });

  describe('GET /users', () => {
    it('should return empty array when no users exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(response.body).toMatchObject({
        data: [],
        meta: {
          total: 0,
          skip: 0,
          take: 10,
        },
      });
    });

    it('should return paginated list of users', async () => {
      // Create test users
      const users = await userRepository.save([
        {
          email: 'user1@example.com',
          name: 'User One',
          password: 'password123',
        },
        {
          email: 'user2@example.com',
          name: 'User Two',
          password: 'password123',
        },
        {
          email: 'user3@example.com',
          name: 'User Three',
          password: 'password123',
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta).toMatchObject({
        total: 3,
        skip: 0,
        take: 10,
      });

      // Verify passwords are not exposed
      response.body.data.forEach((user) => {
        expect(user.password).toBeUndefined();
      });
    });

    it('should filter users by email', async () => {
      await userRepository.save([
        {
          email: 'john@example.com',
          name: 'John',
          password: 'password123',
        },
        {
          email: 'jane@example.com',
          name: 'Jane',
          password: 'password123',
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/users?email=john')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].email).toContain('john');
    });

    it('should filter users by name', async () => {
      await userRepository.save([
        {
          email: 'john@example.com',
          name: 'John Smith',
          password: 'password123',
        },
        {
          email: 'jane@example.com',
          name: 'Jane Doe',
          password: 'password123',
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/users?name=Jane')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toContain('Jane');
    });

    it('should support pagination with skip and take', async () => {
      // Create 15 users
      const users = Array.from({ length: 15 }, (_, i) => ({
        email: `user${i}@example.com`,
        name: `User ${i}`,
        password: 'password123',
      }));
      await userRepository.save(users);

      // First page
      const firstPage = await request(app.getHttpServer())
        .get('/users?skip=0&take=5')
        .expect(200);

      expect(firstPage.body.data).toHaveLength(5);
      expect(firstPage.body.meta).toMatchObject({
        total: 15,
        skip: 0,
        take: 5,
      });

      // Second page
      const secondPage = await request(app.getHttpServer())
        .get('/users?skip=5&take=5')
        .expect(200);

      expect(secondPage.body.data).toHaveLength(5);
      expect(secondPage.body.meta).toMatchObject({
        total: 15,
        skip: 5,
        take: 5,
      });

      // Verify different users on different pages
      expect(firstPage.body.data[0].id).not.toBe(secondPage.body.data[0].id);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by id', async () => {
      const user = await userRepository.save({
        email: 'john@example.com',
        name: 'John Doe',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get(`/users/${user.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: user.id,
        email: user.email,
      });

      // Password should not be exposed
      expect(response.body.password).toBeUndefined();
    });

    it('should return 404 if user does not exist', async () => {
      await request(app.getHttpServer()).get('/users/99999').expect(404);
    });

    it('should return 400 for invalid id format', async () => {
      await request(app.getHttpServer()).get('/users/invalid-id').expect(400);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete user lifecycle', async () => {
      // 1. Create user
      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'lifecycle@example.com',
          name: 'Lifecycle User',
          password: 'password123',
        })
        .expect(201);

      const userId = createResponse.body.id;

      // 2. Get user by ID
      const getResponse = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(200);

      expect(getResponse.body.email).toBe('lifecycle@example.com');

      // 3. Verify user appears in list
      const listResponse = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      const userInList = listResponse.body.data.find((u) => u.id === userId);
      expect(userInList).toBeDefined();
      expect(userInList.email).toBe('lifecycle@example.com');
    });

    it('should handle multiple concurrent requests', async () => {
      const createRequests = Array.from({ length: 10 }, (_, i) =>
        request(app.getHttpServer())
          .post('/users')
          .send({
            email: `concurrent${i}@example.com`,
            name: `Concurrent User ${i}`,
            password: 'password123',
          }),
      );

      const responses = await Promise.all(createRequests);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });

      // Verify all users were created
      const listResponse = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(listResponse.body.data).toHaveLength(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in query parameters', async () => {
      await userRepository.save({
        email: 'test@example.com',
        name: "John O'Brien",
        password: 'password123',
      });

      await request(app.getHttpServer())
        .get('/users?name=O%27Brien')
        .expect(200);
    });

    it('should return empty results for non-matching filters', async () => {
      await userRepository.save({
        email: 'test@example.com',
        name: 'John',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/users?email=nonexistent@example.com')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.meta.total).toBe(0);
    });

    it('should handle large pagination parameters', async () => {
      await userRepository.save({
        email: 'test@example.com',
        name: 'John',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/users?skip=1000&take=100')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.meta.total).toBe(1);
    });
  });
});
