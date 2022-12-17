const { ObjectId } = require('mongodb');
const { checkSchema } = require('express-validator');

const validator = require('../middleware/validator.js');
const checkObjectId = checkSchema({
    id: {
        in: ['params'],
        errorMessage: 'Invalid id',

        custom: { options: (value) => ObjectId.isValid(value), errorMessage: 'Invalid id format' },
    },
});

const sanitizeObjectId = [
    checkSchema({
        id: {
            in: ['params'],

            custom: { options: (value) => ObjectId.isValid(value), errorMessage: 'Invalid id format' },
        },
    }),
    validator,
    checkSchema({
        id: {
            in: ['params'],

            customSanitizer: { options: (value, { req, location, path }) => { return ObjectId(value); },
            },
        },
    }),
];

module.exports = {
    checkObjectId, sanitizeObjectId,
}