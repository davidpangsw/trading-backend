/**
 * Custom supporting middleware from 'express-validator',
 * which is a middleware library that wraps 'validator'
 * Also have a look on src code like: https://github.com/validatorjs/validator.js/blob/master/src/lib/isIn.js
 * 
 * checkSchema conditions are defined separately in different modules
 */
const { validationResult } = require('express-validator');
const validator = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }

    next();
};

module.exports = validator;