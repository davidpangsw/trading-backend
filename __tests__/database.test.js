const { MongoClient } = require('mongodb');
const { initDB, getCollection } = require('../database');

jest.mock('mongodb');

describe('Database Module', () => {
  let mockClient;
  let mockDb;
  let mockConnect;
  let mockCommand;

  beforeEach(() => {
    mockConnect = jest.fn().mockResolvedValue();
    mockCommand = jest.fn().mockResolvedValue();
    mockDb = {
      command: mockCommand,
      collection: jest.fn()
    };
    mockClient = {
      connect: mockConnect,
      db: jest.fn().mockReturnValue(mockDb)
    };

    MongoClient.mockImplementation(() => mockClient);

    console.log = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initDB', () => {
    it('should connect to database successfully', async () => {
      await initDB('mongodb://localhost:27017', 'testdb');

      expect(MongoClient).toHaveBeenCalledWith('mongodb://localhost:27017');
      expect(mockConnect).toHaveBeenCalled();
      expect(mockClient.db).toHaveBeenCalledWith('testdb');
      expect(mockCommand).toHaveBeenCalledWith({ ping: 1 });
      expect(console.log).toHaveBeenCalledWith('Database Connected successfully');
    });

    it('should handle connection errors', async () => {
      mockConnect.mockRejectedValue(new Error('Connection failed'));

      await expect(initDB('mongodb://localhost:27017', 'testdb'))
        .rejects.toThrow('Connection failed');
    });

    it('should handle ping command errors', async () => {
      mockCommand.mockRejectedValue(new Error('Ping failed'));

      await expect(initDB('mongodb://localhost:27017', 'testdb'))
        .rejects.toThrow('Ping failed');
    });
  });

  describe('getCollection', () => {
    it('should return collection when database is initialized', async () => {
      const mockCollection = { name: 'test' };
      mockDb.collection.mockReturnValue(mockCollection);

      await initDB('mongodb://localhost:27017', 'testdb');
      const collection = await getCollection('users');

      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(collection).toBe(mockCollection);
    });

    it('should throw error when database is not initialized', async () => {
      await expect(getCollection('users')).rejects.toThrow();
    });
  });
});