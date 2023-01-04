const { MongoClient } = require('mongodb');
const { default: logger } = require('./logging');

let connDB = null;

async function initDB(connStr, database) {
    const client = new MongoClient(connStr);
    await client.connect();
    await client.db(database).command({ ping: 1 });
    connDB = client.db(database);
    logger.info("Database Connected successfully");
}

async function getCollection(name) {
    return connDB.collection(name);
}

module.exports = {initDB,  getCollection};