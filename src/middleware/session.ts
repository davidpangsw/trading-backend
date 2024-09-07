import { Request, Response, NextFunction } from 'express';
import { checkSchema } from 'express-validator';
import { ObjectId } from 'mongodb';
import { getCollection } from '../database';

interface Session {
    _id: ObjectId;
    createdAt: Date;
    // Define other session properties here
}

// // Extend the Express Request interface to include the session
// declare global {
//     namespace Express {
//         interface Request {
//             session?: Session | null;
//         }
//     }
// }

// TODO: session expiry
// const EXPIRY_MS = 5 * 60 * 1000;

// session is optional now
const setSession = [
    async (req: Request, res: Response, next: NextFunction) : Promise<void> => {
        if (req.cookies && req.cookies.session && req.cookies.session.id) {
            const sessionId = new ObjectId(req.cookies.session.id);
            const sessions = await getCollection('sessions');
            const session = await sessions.findOne({ _id: sessionId }) as Session | null;
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

export { setSession };