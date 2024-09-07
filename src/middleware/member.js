const rateLimit = require('express-rate-limit');
const { checkSchema } = require('express-validator');
const { getCollection } = require('../database.js');
const { ObjectId } = require('mongodb');
const { setSession } = require('./session.js');

const ADMIN = 'admin';
const ROLES = [ADMIN];

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
function getIsStrongPasswordOptions() {
    const opts = {
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
        pointsForContainingSymbol: 10
    };
    const requirements = `
    Length: ${opts.minLength}
    Number of Lowercases: ${opts.minLowercase}
    Number of Uppercases: ${opts.minUppercase}
    Number of Numbers: ${opts.minNumbers}
    Number of Symbols: ${opts.minSymbols}
    `

    return {
        options: opts,
        errorMessage: `You password must be: ${requirements}`,
    }
}

// express-validator middlewares
const checkUsername = checkSchema({
    username: {
        in: ['body'],
        // errorMessage: 'Invalid username',

        exists: { errorMessage: 'Missing field' },
        isAlphanumeric: { errorMessage: 'Invalid username (not alphanumeric)' },
        isLength: { options: { min: 5, max: 100 }, errorMessage: 'Invalid username (length must be 5 - 100)' },
    },
});

const checkStrongPassword = checkSchema({
    password: {
        in: ['body'],
        // errorMessage: 'Invalid password',
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
        // errorMessage: 'Invalid roles',

        exists: { errorMessage: 'Missing field' },
        isArray: { errorMessage: 'Invalid roles (not an array)' },
    },
    'roles.*': {
        isString: { errorMessage: 'Invalid role (not string)' },
        // isIn has a bug, use custom
        custom: { options: (value) => ROLES.includes(value), errorMessage: 'Invalid role (does not matched any role value)' }
    },
});

/**
 * Read session
 * Authenticate and set req.member
 * Authorize according to roles
 * @param {Array} roles 
 * @returns 
 */
const authRoles = (roles) => [
    setSession,
    async (req, res, next) => {
        //
        // Authentication, set req.member if exists
        //
        let member = null;
        if (req.session) {
            const session = req.session;
            const members = await getCollection('members');
            member = await members.findOne({ _id: session.member });
            if (member === null) { // maybe member deleted while logging in
                // This is a server side bug?

                // clear unknown cookie session
                res.cookie('session', null, {
                    path: '/',
                    sameSite: 'none', // sameSite (boolean|none|lax|strict): Strict or Lax enforcement
                    secure: true, // secure (boolean): Is only accessible through HTTPS?
                });

                res.status(401).json({ message: 'Please login again (member does not exist for this session)' }); // 401 UNAUTHORIZED (unauthenticated)
                return;
            }
            req.member = member;
        }

        //
        // Authorization
        //
        if (roles && roles.length > 0) {
            if (!member) {
                res.status(403).json({ message: 'This feature is not for guest' });  // 403 FORBIDDEN (unauthorized)
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

const createLimiter = (props) => {
    return rateLimit({
        // windowMs: 1 * 60 * 1000, // milliseconds per window
        // max: 10, // number of requests per `window`
        message: 'Too many requests, please try again later', // error message
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        keyGenerator: (req, res) => (req.member) ? req.member._id : req.ip, // member id or ip
        ...props
    });
}

const LIMITER = createLimiter({
    windowMs: 1 * 60 * 1000, // milliseconds per window
    max: (req, res) => {
        if (!req.member) {
            return 10; // GUEST
        }

        if (req.member.roles.includes(ADMIN)) {
            return 0; // unlimited
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