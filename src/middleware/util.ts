import { ObjectId } from 'mongodb';
import { checkSchema, Schema } from 'express-validator';
import * as validator from './validator';

// Define the schema for checking ObjectId
const checkObjectId = checkSchema({
    id: {
        in: ['params'],
        errorMessage: 'Invalid id',
        custom: {
            options: (value: string): boolean => ObjectId.isValid(value),
            errorMessage: 'Invalid id format'
        },
    },
} as Schema);

// Sanitize ObjectId
const sanitizeObjectId = [
    checkSchema({
        id: {
            in: ['params'],
            custom: {
                options: (value: string): boolean => ObjectId.isValid(value),
                errorMessage: 'Invalid id format',
            },
        },
    } as Schema),
    validator,
    checkSchema({
        id: {
            in: ['params'],
            customSanitizer: {
                options: (value: string, { req, location, path }: { req: any, location: string, path: string }) => {
                    return new ObjectId(value);
                },
            },
        },
    } as Schema),
];

export { checkObjectId, sanitizeObjectId };
