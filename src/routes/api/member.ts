import express, { Request, Response } from 'express';
import { param, checkSchema } from 'express-validator';
import bcrypt from 'bcrypt';

import { getCollection } from '../../database';
import validator from '../../middleware/validator';
import {
    checkUsername,
    checkPassword,
    checkStrongPassword,
    checkRoles,
    ROLES,
    ADMIN,
    authRoles,
    LIMITER,
} from '../../middleware/member';
import { sanitizeObjectId } from '../../middleware/util';
import logger from '../../logging';

const saltRounds = 10;
const router = express.Router();

async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(saltRounds);
    const result = await bcrypt.hash(password, salt);
    return result;
}

router.post(
    '/',
    checkUsername,
    checkStrongPassword,
    // LIMITER, // no limiter for registering
    validator,
    async (req: Request, res: Response) => {
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

router.delete(
    '/:id',
    authRoles(ADMIN),
    sanitizeObjectId,
    validator,
    async (req: Request, res: Response) => {
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

router.get(
    '/roles',
    authRoles(ADMIN),
    async (req: Request, res: Response) => {
        res.json({
            roles: ROLES,
        });
    }
);

router.get(
    '/',
    authRoles(ADMIN),
    checkSchema({
        username: {
            in: ['params'],
        },
    }),
    validator,
    async (req: Request, res: Response) => {
        const username = req.query.username as string;
        const members = await getCollection('members');
        const result = await members.findOne({ username: username });

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

router.get(
    '/:id',
    authRoles(ADMIN),
    sanitizeObjectId,
    validator,
    async (req: Request, res: Response) => {
        const _id = req.params.id;
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

router.put(
    '/:id',
    authRoles(ADMIN),
    sanitizeObjectId,
    checkRoles,
    validator,
    async (req: Request, res: Response) => {
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
            }
        );
        if (result.matchedCount > 0) {
            res.status(200).json();
        } else {
            res.status(404).json({ message: 'member not found' });
        }
    }
);

export default router;
