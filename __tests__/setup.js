global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

process.env.NODE_ENV = 'test';
process.env.CONN_STR = 'mongodb://localhost:27017';
process.env.DATABASE = 'testdb';