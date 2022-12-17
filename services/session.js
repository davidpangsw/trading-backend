const { checkSchema } = require('express-validator');
const { ObjectId } = require('mongodb');
const { getCollection } = require('../database.js');

// TODO: session expiry
// const EXPIRY_MS = 5 * 60 * 1000;

// session is optional now
const setSession = [
    async (req, res, next) => {
        if (req.cookies && req.cookies.session && req.cookies.session.id) {
            const sessionId = ObjectId(req.cookies.session.id);
            const sessions = await getCollection('sessions');
            const session = await sessions.findOne({ _id: sessionId });
            if (session === null) {
                // clear unknown cookie session
                res.cookie('session', null, {
                    path: '/',
                    sameSite: 'none', // sameSite (boolean|none|lax|strict): Strict or Lax enforcement
                    secure: true, // secure (boolean): Is only accessible through HTTPS?
                });

                res.status(401).json({ message: 'Please login again (Session not found)' });
                return;
            }
            // // check session expired
            // const diff = new Date() - session.createdAt;
            // if ( diff >= EXPIRY_MS ) {
            //     res.status(401).json({ message: 'Session expired, please login again' });
            //     session = null;
            // }
            req.session = session;
        }

        next();
    },
];

module.exports = {
    setSession,
}