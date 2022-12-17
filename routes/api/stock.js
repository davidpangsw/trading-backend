/**
- /stocks
    - GET /?symbol=SYMBOL
    - GET /sectors
    - POST /symbols (member token => member => restrict #requests)
 */
const express = require('express');
const validator = require('../../middleware/validator.js');
const { StockRepository, checkSymbol } = require('../../service/stock.js');
const {
    checkUsername,
    checkPassword, checkStrongPassword,
    checkRoles, ROLES, ADMIN,
    authRoles,
    LIMITER, createLimiter,
} = require('../../middleware/member.js');

const repo = new StockRepository();
const router = express.Router();
const DEFAULT_SYMBOLS_QUERY = {
    limit: 5,
    // array of condition objects
    conditions: [{
        // symbol: string
        // sectors: array[string]
        // exchanges: array[string]
        // countries: array[string]
        // marketcap: array[number]   (length >=2)
    }],
};

router.get('/',
    authRoles(),
    LIMITER,
    checkSymbol,
    validator,
    async (req, res) => {
        const symbol = req.query.symbol;

        const { success, message, result } = await repo.getStockBySymbol(symbol);
        if (!success) {
            res.status(400).json({ message: message });
            return;
        }
        if (result === null) {
            res.status(404).json({ message: `stock not found: ${symbol}` }); // 404 not found
            return;
        }

        // do some formating / filtering
        const stock = Object.keys(result).reduce((ret, key) => {
            if (key === '_id') return ret;
            ret[key] = result[key];
            return ret;
        }, {});

        res.json({ message: message, stock: stock })
    }
);

router.get('/sectors',
    async (req, res) => {
        let { success, message, result } = await repo.getSectors();
        if (!success) {
            res.status(400).json({ message: message });
            return;
        }
        // Note: empty result is not an error

        // map the result to a single array
        res.json({ message: message, sectors: result });
    }
);

router.get('/exchanges',
    async (req, res) => {
        let { success, message, result } = await repo.getExchanges();
        if (!success) {
            res.status(400).json({ message: message });
            return;
        }
        // Note: empty result is not an error

        // map the result to a single array
        res.json({ message: message, exchanges: result });
    }
);

router.get('/countries',
    async (req, res) => {
        let { success, message, result } = await repo.getCountries();
        if (!success) {
            res.status(400).json({ message: message });
            return;
        }
        // Note: empty result is not an error

        // map the result to a single array
        res.json({ message: message, countries: result });
    }
);

router.post('/screen',
    authRoles(),
    createLimiter({   // additional limiter for this costly route
        windowMs: 1 * 60 * 1000, // milliseconds per window
        max: (req, res) => {
            if (!req.member) {
                return 5;
            }

            if (req.member.roles.includes(ADMIN)) {
                return 0; // unlimited
            } else {
                return 15; // normal user
            }
        },
        message: 'Screen requests are limited per minute. (5 for guest, 15 for user) Please try again later.',
    }),
    LIMITER,
    validator,
    async (req, res) => {
        const body = req.body;

        let { success, message, result } = await repo.screenStocks({ ...DEFAULT_SYMBOLS_QUERY, ...body });
        if (!success) {
            res.status(400).json({ message: message });
            return;
        }
        // Note: empty result is not an error

        res.json({ message: message, stocks: result })
    }
);

// // get by id
// router.get('/:id',
//     checkObjectId,
//     validator,
//     async (req, res) => {
//         const _id = ObjectId(req.params.id);

//         const { success, message, result } = await repo.getStock(_id);
//         if (!success) {
//             res.status(400).json({ message: message });
//             return;
//         }
//         if (result === null) {
//             res.status(404).json({ message: 'stock not found' }); // 404 not found
//             return;
//         }
//         res.json({ stock: result })
//     }
// );

module.exports = router;