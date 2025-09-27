const request = require('supertest');
const express = require('express');
const {
  checkUsername,
  checkPassword,
  checkStrongPassword,
  checkRoles,
  authRoles,
  ADMIN,
  ROLES,
  createLimiter
} = require('../middleware/member');
const validator = require('../middleware/validator');
const { setSession } = require('../middleware/session');
const { getCollection } = require('../database');

jest.mock('../database');
jest.mock('../middleware/session');

describe('Middleware Tests', () => {
  let app;
  let mockCollection;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockCollection = {
      findOne: jest.fn()
    };
    getCollection.mockResolvedValue(mockCollection);
    setSession.mockImplementation((req, res, next) => next());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Validator Middleware', () => {
    it('should pass validation with valid data', async () => {
      app.post('/test',
        checkUsername,
        validator,
        (req, res) => res.json({ success: true })
      );

      const response = await request(app)
        .post('/test')
        .send({ username: 'validuser123' })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should reject invalid username', async () => {
      app.post('/test',
        checkUsername,
        validator,
        (req, res) => res.json({ success: true })
      );

      const response = await request(app)
        .post('/test')
        .send({ username: 'ab' })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Invalid username (length must be 5 - 100)'
          })
        ])
      );
    });

    it('should reject non-alphanumeric username', async () => {
      app.post('/test',
        checkUsername,
        validator,
        (req, res) => res.json({ success: true })
      );

      const response = await request(app)
        .post('/test')
        .send({ username: 'user@name' })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Invalid username (not alphanumeric)'
          })
        ])
      );
    });
  });

  describe('Password Validation', () => {
    it('should accept basic password', async () => {
      app.post('/test',
        checkPassword,
        validator,
        (req, res) => res.json({ success: true })
      );

      const response = await request(app)
        .post('/test')
        .send({ password: 'anypassword' })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should reject weak password', async () => {
      app.post('/test',
        checkStrongPassword,
        validator,
        (req, res) => res.json({ success: true })
      );

      const response = await request(app)
        .post('/test')
        .send({ password: 'weak' })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should accept strong password', async () => {
      app.post('/test',
        checkStrongPassword,
        validator,
        (req, res) => res.json({ success: true })
      );

      const response = await request(app)
        .post('/test')
        .send({ password: 'StrongPass123!' })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });
  });

  describe('Roles Validation', () => {
    it('should accept valid roles array', async () => {
      app.post('/test',
        checkRoles,
        validator,
        (req, res) => res.json({ success: true })
      );

      const response = await request(app)
        .post('/test')
        .send({ roles: [ADMIN] })
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should reject invalid roles', async () => {
      app.post('/test',
        checkRoles,
        validator,
        (req, res) => res.json({ success: true })
      );

      const response = await request(app)
        .post('/test')
        .send({ roles: ['invalidrole'] })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should reject non-array roles', async () => {
      app.post('/test',
        checkRoles,
        validator,
        (req, res) => res.json({ success: true })
      );

      const response = await request(app)
        .post('/test')
        .send({ roles: 'admin' })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('Authentication Middleware', () => {
    it('should allow guest access when no roles required', async () => {
      app.get('/test',
        ...authRoles(),
        (req, res) => res.json({ success: true })
      );

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should reject guest when roles required', async () => {
      app.get('/test',
        ...authRoles([ADMIN]),
        (req, res) => res.json({ success: true })
      );

      const response = await request(app)
        .get('/test')
        .expect(403);

      expect(response.body).toEqual({
        message: 'This feature is not for guest'
      });
    });

    it('should allow authenticated admin user', async () => {
      const mockMember = {
        _id: 'user123',
        username: 'admin',
        roles: [ADMIN]
      };

      setSession.mockImplementation((req, res, next) => {
        req.session = { member: 'user123' };
        next();
      });

      mockCollection.findOne.mockResolvedValue(mockMember);

      app.get('/test',
        ...authRoles([ADMIN]),
        (req, res) => res.json({
          success: true,
          user: req.member.username
        })
      );

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        user: 'admin'
      });
    });

    it('should reject user without required role', async () => {
      const mockMember = {
        _id: 'user123',
        username: 'regularuser',
        roles: []
      };

      setSession.mockImplementation((req, res, next) => {
        req.session = { member: 'user123' };
        next();
      });

      mockCollection.findOne.mockResolvedValue(mockMember);

      app.get('/test',
        ...authRoles([ADMIN]),
        (req, res) => res.json({ success: true })
      );

      const response = await request(app)
        .get('/test')
        .expect(403);

      expect(response.body).toEqual({
        message: 'You do not have roles to use this feature.'
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should create rate limiter with custom options', () => {
      const limiter = createLimiter({
        windowMs: 5000,
        max: 5
      });

      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });
  });
});