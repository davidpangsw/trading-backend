import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * Custom supporting middleware from 'express-validator',
 * which is a middleware library that wraps 'validator'
 * Also have a look at src code like: https://github.com/validatorjs/validator.js/blob/master/src/lib/isIn.js
 * 
 * checkSchema conditions are defined separately in different modules
 */
const validator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }

    next();
};

export default validator;
