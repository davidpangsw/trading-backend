const request = require('supertest');
const app = require('../index');

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Wait for database connection
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('GET /ping', () => {
    it('should return pong message', async () => {
      const response = await request(app)
        .get('/ping')
        .expect(200);

      expect(response.body).toEqual({ message: 'pong' });
    });
  });

  describe('POST /api/members', () => {
    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/members')
        .send({
          username: 'testuser123',
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should reject invalid username', async () => {
      const response = await request(app)
        .post('/api/members')
        .send({
          username: '',
          password: 'StrongPassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should reject non-alphanumeric username', async () => {
      const response = await request(app)
        .post('/api/members')
        .send({
          username: 'user@test',
          password: 'StrongPassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should reject short username', async () => {
      const response = await request(app)
        .post('/api/members')
        .send({
          username: 'abc',
          password: 'StrongPassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/sessions', () => {
    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .send({
          username: 'nonexistentuser123',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Incorrect username or password'
      });
    });

    it('should require username and password', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should require username', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .send({
          password: 'somepassword'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should require password', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .send({
          username: 'testuser123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/stocks/sectors', () => {
    it('should return sectors list', async () => {
      const response = await request(app)
        .get('/api/stocks/sectors');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sectors');
      expect(Array.isArray(response.body.sectors)).toBe(true);
    });
  });

  describe('GET /api/stocks/exchanges', () => {
    it('should return exchanges list', async () => {
      const response = await request(app)
        .get('/api/stocks/exchanges');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('exchanges');
      expect(Array.isArray(response.body.exchanges)).toBe(true);
    });
  });

  describe('GET /api/stocks/countries', () => {
    it('should return countries list', async () => {
      const response = await request(app)
        .get('/api/stocks/countries');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('countries');
      expect(Array.isArray(response.body.countries)).toBe(true);
    });
  });

  describe('GET /api/stocks', () => {
    it('should require symbol parameter', async () => {
      const response = await request(app)
        .get('/api/stocks');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should reject invalid symbol format', async () => {
      const response = await request(app)
        .get('/api/stocks?symbol=invalid@symbol');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/stocks/screen', () => {
    it('should accept screening request', async () => {
      const response = await request(app)
        .post('/api/stocks/screen')
        .send({
          limit: 5,
          conditions: [{}]
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stocks');
      expect(Array.isArray(response.body.stocks)).toBe(true);
    });

    it('should handle empty screening request', async () => {
      const response = await request(app)
        .post('/api/stocks/screen')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stocks');
    });
  });

  describe('Authentication Required Routes', () => {
    it('should reject unauthorized access to admin routes', async () => {
      const response = await request(app)
        .get('/api/members');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        message: 'This feature is not for guest'
      });
    });

    it('should reject unauthorized DELETE member', async () => {
      const response = await request(app)
        .delete('/api/members/507f1f77bcf86cd799439011');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        message: 'This feature is not for guest'
      });
    });
  });
});