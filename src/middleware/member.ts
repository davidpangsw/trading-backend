import rateLimit from 'express-rate-limit';
import { checkSchema } from 'express-validator';
import { getCollection } from '../database';
import { ObjectId } from 'mongodb';
import { setSession } from './session';

const ADMIN: string = 'admin';
const ROLES: string[] = [ADMIN];

/**
 * See: param('').isStrongPassword()
 * defaults to
 * {
 *    minLength: 8,
 *    minLowercase: 1,
 *    minUppercase: 1,
 *    minNumbers: 1,
 *    minSymbols: 1,
 *    returnScore: false,
 *    pointsPerUnique: 1,
 *    pointsPerRepeat: 0.5,
 *    pointsForContainingLower: 10,
 *    pointsForContainingUpper: 10,
 *    pointsForContainingNumber: 10,
 *    pointsForContainingSymbol: 10
 * }
 */
interface StrongPasswordOptions {
    minLength: number;
    minLowercase: number;
    minUppercase: number;
    minNumbers: number;
    minSymbols: number;
    returnScore: boolean;
    pointsPerUnique: number;
    pointsPerRepeat: number;
    pointsForContainingLower: number;
    pointsForContainingUpper: number;
    pointsForContainingNumber: number;
    pointsForContainingSymbol: number;
}

function getIsStrongPasswordOptions(): { options: StrongPasswordOptions; errorMessage: string } {
    const opts: StrongPasswordOptions = {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
        returnScore: false,
        pointsPerUnique: 1,
        pointsPerRepeat: 0.5,
        pointsForContainingLower: 10,
        pointsForContainingUpper: 10,
        pointsForContainingNumber: 10,
        pointsForContainingSymbol: 10,
    };

    const requirements = `
    Length: ${opts.minLength}
    Number of Lowercases: ${opts.minLowercase}
    Number of Uppercases: ${opts.minUppercase}
    Number of Numbers: ${opts.minNumbers}
    Number of Symbols: ${opts.minSymbols}
    `;

    return {
        options: opts,
        errorMessage: `Your password must be: ${requirements}`,
    };
}

const checkUsername = checkSchema({
    username: {
        in: ['body'],
        exists: { errorMessage: 'Missing field', },
        isAlphanumeric: { errorMessage: 'Invalid username (not alphanumeric)', },
        isLength: {
            options: { min: 5, max: 100 },
            errorMessage: 'Invalid username (length must be 5 - 100)',
        },
    },
});

const checkStrongPassword = checkSchema({
    password: {
        in: ['body'],
        exists: { errorMessage: 'Missing field' },
        isStrongPassword: getIsStrongPasswordOptions(),
    },
});

const checkPassword = checkSchema({
    password: {
        in: ['body'],
        // errorMessage: 'Invalid password',
        exists: { errorMessage: 'Missing field' },
        isString: { errorMessage: 'Not a string' },
    },
});

const checkRoles = checkSchema({
    roles: {
        in: ['body'],
        exists: { errorMessage: 'Missing field' },
        isArray: { errorMessage: 'Invalid roles (not an array)' },
    },
    'roles.*': {
        isString: { errorMessage: 'Invalid role (not string)' },
        // IsIn has a bug, use custom
        custom: {
            options: (value: string) => ROLES.includes(value),
            errorMessage: 'Invalid role (does not match any role value)',
        },
    },
});


interface Member {
    _id: string;
    roles: string[];
    // Add any other properties a member might have
}

declare global {
    namespace Express {
        interface Request {
            member?: Member | null;
        }
    }
}

/**
 * Read session
 * Authenticate and set req.member
 * Authorize according to roles
 * @param {Array} roles 
 * @returns 
 */
export const authRoles = (roles: string[]) => [
    setSession,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        //
        // Authentication, set req.member if exists
        //
        let member: Member | null = null;
        if (req.session) {
            const session = req.session;
            const members = await getCollection<Member>('members');
            member = await members.findOne({ _id: session.member });

            if (member === null) { // maybe member deleted while logging in
                // clear unknown cookie session
                res.cookie('session', null, {
                    path: '/',
                    sameSite: 'none', // sameSite (boolean|none|lax|strict): Strict or Lax enforcement
                    secure: true, // secure (boolean): Is only accessible through HTTPS?
                });

                res.status(401).json({ message: 'Please login again (member does not exist for this session)' });
                return;
            }
            req.member = member;
        }

        //
        // Authorization
        //
        if (roles && roles.length > 0) {
            if (!member) {
                res.status(403).json({ message: 'This feature is not for guest' });
                return;
            }

            //
            // Authorize member by roles
            //
            if (!member.roles.find(r => roles.includes(r))) {
                res.status(403).json({ message: 'You do not have roles to use this feature.' });
                return;
            }
        }

        next();
    },
];

interface LimiterProps extends Partial<Options> {
    windowMs?: number;
    max?: number | ((req: Request, res: Response) => number);
}

const createLimiter = (props: LimiterProps) => {
    return rateLimit({
        message: 'Too many requests, please try again later', // error message
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        keyGenerator: (req: Request, res: Response): string => (req.member ? req.member._id : req.ip), // member id or IP
        ...props
    });
};

const LIMITER = createLimiter({
    windowMs: 1 * 60 * 1000, // milliseconds per window
    max: (req: Request, res: Response): number => {
        if (!req.member) {
            return 10; // GUEST
        }

        if (req.member.roles.includes(ADMIN)) {
            return 0; // unlimited for admin
        } else {
            return 30; // normal user
        }
    },
    message: 'Requests are limited per minute. (10 for guest, 30 for user) Please try again later.', // error message
});

module.exports = {
    checkUsername,
    checkPassword, checkStrongPassword,
    checkRoles, authRoles, ROLES, ADMIN,
    LIMITER, createLimiter,
}