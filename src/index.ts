import express, { Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import loggerMiddleware from './middleware/logger';
import { initDB } from './database';
import logger from './logging';

import { authRoles, ADMIN } from './modules/member';
import memberRoutes from './routes/api/member';
import sessionRoutes from './routes/api/session';
import stockRoutes from './routes/api/stock';

// init database
const CONN_STR = process.env.CONN_STR || 'mongodb://localhost:27017';
const DATABASE = process.env.DATABASE || 'tradingBackendDB';
const dbPromise = initDB(CONN_STR, DATABASE); // should wait?

// // Set up mongoose connection
// const mongoose = require("mongoose");
// const dev_db_url = "mongodb://localhost:27017/";
// const mongoDB = process.env.MONGODB_URI || dev_db_url;
// logger.info(`Connect mongoDB=${mongoDB}`);
// mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
// const db = mongoose.connection;
// db.on("error", console.error.bind(console, "MongoDB connection error:"));

const app = express();

// set appropriate HTTP headers that help protect your app from well-known web vulnerabilities
app.use(helmet());

// Compress all routes
app.use(compression());

// Accept CORS
app.use(cors({
    origin: process.env.ALLOW_ORIGIN || 'http://localhost:3000',
    // origin: (origin, callback) => {
    //     const pattern = process.env.ALLOW_ORIGIN || 'http://localhost(:[0-9]+)';
    //     callback(err, origins);
    // },
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept'],
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser(null, {
//     sameSite: 'none',
//     secure: true
// }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'production') app.use(loggerMiddleware);

app.get('/ping', (req: Request, res: Response) => res.json({ 'message': 'pong' }));



// Use routes
app.use('/api/members', memberRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/stocks', stockRoutes);

const PORT = process.env.PORT || 5000;

// Wait for DB connection, then start server
dbPromise.then(() => {
    app.listen(PORT, () => logger.info(`Server started on port ${PORT}`));
}).catch((error) => {
    logger.error('Failed to connect to the database:', error);
});
