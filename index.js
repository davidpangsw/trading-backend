const express = require('express');
const cors = require('cors');
const compression = require("compression");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const logger = require('./middleware/logger');
const { initDB } = require('./database');

// init database
const CONN_STR = process.env.CONN_STR || 'mongodb://localhost:27017';
const DATABASE = process.env.DATABASE || 'stockdb';
const dbPromise = initDB(CONN_STR, DATABASE); // should wait?

// // Set up mongoose connection
// const mongoose = require("mongoose");
// const dev_db_url = "mongodb://localhost:27017/";
// const mongoDB = process.env.MONGODB_URI || dev_db_url;
// console.log(`Connect mongoDB=${mongoDB}`);
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
if (process.env.NODE_ENV !== 'production') app.use(logger);

app.get('/ping', (req, res) => res.json({ 'message': 'pong' }));
// const { authRoles, ADMIN } = require('./middleware/member.js');


app.use('/api/members', require('./routes/api/member'));
app.use('/api/sessions', require('./routes/api/session'));
app.use('/api/stocks', require('./routes/api/stock'));

const PORT = process.env.PORT || 3000;
dbPromise.then(() => {
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
});

module.exports = app;
