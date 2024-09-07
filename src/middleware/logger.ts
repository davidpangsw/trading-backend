import { Request, Response, NextFunction } from 'express';
import logger from '../logging'; // assuming logging is a default export

const middleware = (req: Request, res: Response, next: NextFunction): void => {
    logger.info({
        method: req.method,          // "GET"
        protocol: req.protocol,      // "http"
        hostname: req.hostname,      // "example.com"
        path: req.path,              // "/api/members"
        originalUrl: req.originalUrl, // "/api/members?filter=sharks"
        subdomains: req.subdomains,  // "['ocean']"

        "get('host')": req.get('host'),    // "example.com:5000"

        "header('Content-Type')": req.header('Content-Type'),  // "application/json"
        "header('user-agent')": req.header('user-agent'),      // "Mozilla/5.0 (Macintosh Intel Mac OS X 10_8_5) AppleWebKi..."
        "header('Authorization')": req.header('Authorization'), // "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
        
        // Uncomment if you're using cookies
        // "cookies.sessionDate": req.cookies?.sessionDate // Add optional chaining if cookies might be undefined
    });

    next();
};

export default middleware;