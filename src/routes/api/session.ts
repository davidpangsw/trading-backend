import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import { getCollection } from '../../database';
import validator from '../../middleware/validator';
import {
    checkUsername,
    checkPassword,
    checkRoles,
    ROLES,
    authRoles
} from '../../middleware/member';
import { sanitizeObjectId } from '../../middleware/util';
import logger from '../../logging';

const router = express.Router();

interface Member {
    _id: ObjectId;
    username: string;
    password: string;
    roles: string[];
}

interface Session {
    _id: ObjectId;
    member: ObjectId;
    createdAt: Date;
}

async function verifyMember(username: string, password: string): Promise<{ success: boolean; message: string | null; member?: Member }> {
    const members = await getCollection<Member>('members');
    const member = await members.findOne({ username });
    if (!member) {
        return { success: false, message: 'Incorrect username or password' };
    }

    const success = await bcrypt.compare(password, member.password);
    if (!success) {
        return { success: false, message: 'Incorrect username or password' };
    }

    return { success, message: null, member };
}

router.post(
    '/',
    checkUsername,
    checkPassword,
    validator,
    async (req: Request, res: Response) => {
        const sessions = await getCollection<Session>('sessions');
        const username = req.body.username;
        const password = req.body.password;

        const { success, message, member } = await verifyMember(username, password);
        if (!success) {
            res.status(400).json({ message });
            return;
        }

        // create session
        const result = await sessions.insertOne({
            member: member!._id,
            createdAt: new Date(),
        });

        res.cookie('session', {
            id: result.insertedId,
            member: {
                username: member!.username,
                roles: member!.roles,
            },
        }, {
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'none',
            secure: true,
        });

        res.json({
            member: {
                username: member!.username,
                roles: member!.roles,
            },
        });
    }
);

// Return some useful data from cookie session
router.get(
    '/',
    authRoles(),
    async (req: Request, res: Response) => {
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

router.delete(
    '/',
    authRoles(),
    async (req: Request, res: Response) => {
        if (!req.session) {
            res.status(404).json({ message: 'You are already logged out. (No session in cookie)' });
            return;
        }

        const session = req.session;

        // delete cookie
        res.cookie('session', null, {
            path: '/',
            sameSite: 'none',
            secure: true,
        });

        // delete document from database
        const sessions = await getCollection<Session>('sessions');
        const result = await sessions.deleteOne({ _id: session._id });

        if (result.deletedCount < 1) {
            logger.warn(`session ${session._id} for cookie not found!`);
        }

        res.json({ message: 'Session deleted' });
    }
);

export default router;
