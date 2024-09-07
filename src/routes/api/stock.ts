import express, { Request, Response } from 'express';
import validator from '../../middleware/validator';
import { StockRepository, checkSymbol } from '../../service/stock';
import {
    checkUsername,
    checkPassword,
    checkStrongPassword,
    checkRoles,
    ROLES,
    ADMIN,
    authRoles,
    LIMITER,
    createLimiter,
} from '../../middleware/member';

const repo = new StockRepository();
const router = express.Router();

const DEFAULT_SYMBOLS_QUERY = {
    limit: 5,
    conditions: [
        {
            // symbol: string
            // sectors: string[]
            // exchanges: string[]
            // countries: string[]
            // marketCap: number[] (length >= 2)
        },
    ],
};

router.get(
    '/',
    authRoles(),
    LIMITER,
    checkSymbol,
    validator,
    async (req: Request, res: Response) => {
        const symbol = req.query.symbol as string;

        const { success, message, result } = await repo.getStockBySymbol(symbol);
        if (!success) {
            res.status(400).json({ message });
            return;
        }
        if (result === null) {
            res.status(404).json({ message: `stock not found: ${symbol}` });
            return;
        }

        const stock = Object.keys(result).reduce((ret: any, key) => {
            if (key === '_id') return ret;
            ret[key] = result[key];
            return ret;
        }, {});

        res.json({ message, stock });
    }
);

router.get(
    '/sectors',
    async (req: Request, res: Response) => {
        const { success, message, result } = await repo.getSectors();
        if (!success) {
            res.status(400).json({ message });
            return;
        }

        res.json({ message, sectors: result });
    }
);

router.get(
    '/exchanges',
    async (req: Request, res: Response) => {
        const { success, message, result } = await repo.getExchanges();
        if (!success) {
            res.status(400).json({ message });
            return;
        }

        res.json({ message, exchanges: result });
    }
);

router.get(
    '/countries',
    async (req: Request, res: Response) => {
        const { success, message, result } = await repo.getCountries();
        if (!success) {
            res.status(400).json({ message });
            return;
        }

        res.json({ message, countries: result });
    }
);

router.post(
    '/screen',
    authRoles(),
    createLimiter({
        windowMs: 1 * 60 * 1000,
        max: (req: Request, res: Response) => {
            if (!req.member) {
                return 5;
            }

            if (req.member.roles.includes(ADMIN)) {
                return 0; // unlimited
            } else {
                return 15;
            }
        },
        message: 'Screen requests are limited per minute. (5 for guest, 15 for user) Please try again later.',
    }),
    LIMITER,
    validator,
    async (req: Request, res: Response) => {
        const body = req.body;

        const { success, message, result } = await repo.screenStocks({ ...DEFAULT_SYMBOLS_QUERY, ...body });
        if (!success) {
            res.status(400).json({ message });
            return;
        }

        res.json({ message, stocks: result });
    }
);

export default router;
