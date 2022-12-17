const logger = (req, res, next) => {
    // console.log(`${req.method} ${req.protocol} ${req.originalUrl}`);

    console.log({
        "method":      req.method,          // "GET"
        "protocol":    req.protocol,        // "http"
        "hostname":    req.hostname,        // "example.com"
        "path":        req.path,            // "/api/members"
        "originalUrl": req.originalUrl,     // "/api/members?filter=sharks"
        "subdomains":  req.subdomains,      // "['ocean']"

        "get('host')" : req.get('host'),    // "example.com:5000"

        "header('Content-Type')" : req.header('Content-Type'),  // "application/json"
        "header('user-agent')"   : req.header('user-agent'),    // "Mozilla/5.0 (Macintosh Intel Mac OS X 10_8_5) AppleWebKi..."
        "header('Authorization')": req.header('Authorization'), // "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."

        // "cookies.sessionDate" : req.cookies.sessionDate,// "2019-05-28T01:49:11.968Z"
    });

    next();
};

module.exports = logger;