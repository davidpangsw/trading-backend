/**
- /sessions
    - POST /        (login=create session, populate user data)
    - DELETE /:id   (logout)
 */
const express = require('express');
const { ObjectId } = require('mongodb');
const { getCollection } = require('../../database.js');
const bcrypt = require('bcrypt');
const validator = require('../../middleware/validator.js');
const { checkUsername, checkPassword, checkStrongPassword, checkRoles, ROLES, authRoles } = require('../../middleware/member.js');
const { sanitizeObjectId } = require('../../middleware/util.js');
const { default: logger } = require('../../logging.js');

const router = express.Router();

async function verifyMember(username, password) {
    const members = await getCollection('members');
    const member = await members.findOne({ 'username': username });
    if (member === null) {
        return { success: false, message: "Incorrect username or password" }
    }

    // verify password
    const success = await bcrypt.compare(password, member.password);
    if (!success) {
        return { success: false, message: "Incorrect username or password" }
    }
    return { success: success, message: null, member: member }
}

router.post('/',
    checkUsername,
    checkPassword,
    validator,
    async (req, res) => {
        const sessions = await getCollection('sessions');
        const username = req.body.username;
        const password = req.body.password;

        let { success, message, member } = await verifyMember(username, password);
        if (!success) {
            res.status(400).json({ message: message });
            return;
        }

        // create session
        // const result = await sessions.updateOne(
        //     {}, // query parameter, TODO: how to select nothing?
        //     {
        //         $set: {}, // don't set anything if found
        //         $setOnInsert: { username: username }
        //     },
        //     { upsert: true }, // Options
        // );
        const result = await sessions.insertOne({
            member: member._id,
            createdAt: new Date(),
        });
        // logger.debug(result);
        res.cookie('session', {
            id: result.insertedId,
            member: {
                username: member.username,
                roles: member.roles,
            },
        }, {
            // Support all the cookie options from RFC 6265 
            path: '/',  // cookie path, use / as the path if you want your cookie to be accessible on all pages
            maxAge: 7 * 24 * 60 * 60 * 1000, // Convenient option for setting the expiry time relative to the current time in milliseconds.
            sameSite: 'none', // sameSite (boolean|none|lax|strict): Strict or Lax enforcement
            secure: true, // secure (boolean): Is only accessible through HTTPS?
        });

        res.json({
            member: {
                username: member.username,
                roles: member.roles,
            },
        });
    }
);

// return some useful data from cookie session
router.get('/',
    authRoles(),
    async (req, res) => {
        if (!req.member) {
            res.json({});
            return;
        }
        const member = req.member;

        res.json({
            member: {
                username: member.username,
                roles: member.roles,
            },
        });
    }
);

router.delete('/',
    authRoles(),
    async (req, res) => {
        if (!req.session) {
            res.status(404).json({ message: 'You are already logged out. (No session in cookie)' });
            return;
        }
        const session = req.session;

        // delete cookie
        res.cookie('session', null, {
            path: '/',
            sameSite: 'none', // sameSite (boolean|none|lax|strict): Strict or Lax enforcement
            secure: true, // secure (boolean): Is only accessible through HTTPS?
        });

        // delete document from database
        const sessions = await getCollection('sessions');
        const result = await sessions.deleteOne({ _id: session._id });
        if (result.deletedCount < 1) {
            // warning here in server side
            logger.warn(`session ${session._id} for cookie not found!`);
        }
        res.json({ message: 'Session deleted' });
    }
);

module.exports = router;