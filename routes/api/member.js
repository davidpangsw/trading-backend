const express = require('express');
const { param, checkSchema } = require('express-validator');
const bcrypt = require('bcrypt');

const { getCollection } = require('../../database.js');
const validator = require('../../middleware/validator.js');
const {
    checkUsername,
    checkPassword, checkStrongPassword,
    checkRoles, ROLES, ADMIN,
    authRoles,
    LIMITER,
} = require('../../modules/member.js');
const { sanitizeObjectId } = require('../../modules/util.js');
const saltRounds = 10;

const router = express.Router();

async function hashPassword(password) {
    const salt = await bcrypt.genSalt(saltRounds);
    const result = await bcrypt.hash(password, salt);
    return result;
}

router.post('/',
    checkUsername,
    checkStrongPassword,
    // LIMITER, // no limiter for registering
    validator,
    async (req, res) => {
        const members = await getCollection('members');
        const username = req.body.username;
        const password = await hashPassword(req.body.password);

        const result = await members.updateOne(
            { username: username }, // Query parameter
            {
                $set: {}, // don't do anything if found
                $setOnInsert: {
                    username: username,
                    password: password,
                    roles: [],
                }
            },
            { upsert: true }, // Options
        );
        if (result.matchedCount > 0) {
            res.status(400).json({ message: 'username already exists' });
        } else {
            res.json({ id: result.upsertedId });
        }
    }
);

router.delete('/:id',
    authRoles(ADMIN),
    sanitizeObjectId,
    validator,
    async (req, res) => {
        const _id = req.params.id;

        const members = await getCollection('members');
        const result = await members.deleteOne({ _id: _id });
        if (result.deletedCount < 1) {
            res.status(404).json({ message: 'member not found' });
            return;
        }

        // delete related sessions
        const sessions = await getCollection('sessions');
        await sessions.deleteMany({ member: _id });

        res.json({ message: 'Member deleted' });
    }
);

router.get('/roles',
    authRoles(ADMIN),
    async (req, res) => {
        res.json({
            roles: ROLES,
        });
    }
)

router.get('/',
    authRoles(ADMIN),
    checkSchema({
        username: {
            in: ['params'],
        }
    }),
    validator,
    async (req, res) => {
        const username = req.query.username;
        const members = await getCollection('members');
        let result = await members.findOne({ username: username });

        if (result === null) {
            res.status(404).json({ message: 'member not found' }); // 404 not found
            return;
        }
        res.json({
            member: {
                id: result._id,
                username: result.username,
                roles: result.roles,
            }
        });
    }
);

router.get('/:id',
    authRoles(ADMIN),
    sanitizeObjectId,
    validator,
    async (req, res) => {
        const _id = req.params.id;
        // console.log(_id);
        const members = await getCollection('members');
        const result = await members.findOne({ _id: _id });
        if (result === null) {
            res.status(404).json({ message: 'member not found' }); // 404 not found
            return;
        }
        res.json({
            member: {
                id: result._id,
                username: result.username,
                roles: result.roles,
            }
        });
    }
);

router.put('/:id',
    authRoles(ADMIN),
    sanitizeObjectId,
    checkRoles,
    validator,
    async (req, res) => {
        const _id = req.params.id;
        const roles = req.body.roles;
        const members = await getCollection('members');
        const result = await members.updateOne(
            { _id: _id }, // Query parameter
            {
                // set fields if found
                $set: {
                    roles: roles,
                },
            },
        );
        // console.log(_id);
        if (result.matchedCount > 0) {
            res.status(200).json();
        } else {
            res.status(404).json({ message: 'member not found' });
        }
    }
);

module.exports = router;