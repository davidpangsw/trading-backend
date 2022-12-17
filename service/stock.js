const { getCollection } = require('../database.js');
const { checkSchema } = require('express-validator');

// express-validator middlewares
const checkSymbol = checkSchema({
    symbol: {
        in: ['query'],
        // errorMessage: 'Invalid password',
        exists: { errorMessage: 'Missing field' },
        isString: { errorMessage: 'Not a string' },
        isLength: { options: { min: 1, max: 100 }, errorMessage: 'Invalid symbol (length must be 1 - 100)' },
    },
})

class StockRepository {
    constructor() {
    }

    validateInt(value, defaultValue, range) {
        value = parseInt(value);
        if (isNaN(value) || !isFinite(value)) return defaultValue;
        let res = Number(value);
        if (range !== undefined) {
            let [fromInc, toInc] = range;
            if (res < fromInc || res > toInc) return defaultValue;
        }
        return res;
    }

    conditionToMongoQuery(condition) {
        // console.log(condition);
        const mongoQuery = {};

        // symbol
        if (condition.symbol) {
            const symbol = condition.symbol;
            if (typeof symbol === "string") {
                mongoQuery['symbol'] = symbol;
            } else {
                return { success: false, message: 'Invalid symbol', result: null }
            }
        }

        // sector
        if (condition.sectors) {
            const sectors = condition.sectors;
            if (sectors.every(s => typeof s === "string")) {
                mongoQuery['sector'] = { '$in': sectors };
            } else {
                return { success: false, message: 'Invalid sectors', result: null }
            }
        }

        // country
        if (condition.countries) {
            const countries = condition.countries;
            if (countries.every(s => typeof s === "string")) {
                mongoQuery['country'] = { '$in': countries };
            } else {
                return { success: false, message: 'Invalid countries', result: null }
            }
        }

        // exchange
        if (condition.exchanges) {
            const exchanges = condition.exchanges;
            if (exchanges.every(s => typeof s === "string")) {
                mongoQuery['exchange'] = { '$in': exchanges };
            } else {
                return { success: false, message: 'Invalid exchanges', result: null }
            }
        }

        // marketCap
        if (condition.marketCap) {
            const marketCap = condition.marketCap;
            if (Array.isArray(marketCap) && marketCap.length >= 2 && marketCap.every(x => typeof x === "number" && !isNaN(x))) {
                if (marketCap[1] === -1) {
                    mongoQuery['marketCap'] = { '$gte': marketCap[0] };
                } else {
                    mongoQuery['marketCap'] = { '$gte': marketCap[0], '$lt': marketCap[1] };
                }
            } else {
                return { success: false, message: 'Invalid marketCap', query: null }
            }
        }

        return { success: true, message: null, query: mongoQuery }
    }

    async screenStocks(query) {
        // console.log(query);

        // carefully check query and prevent injection
        let limit = this.validateInt(query.limit, 20, [0, 100]);
        // console.log(limit);


        let ret = [];
        if (query.conditions) {
            let conditions = query.conditions;
            if (conditions.length === 0) {
                conditions = [{}];
            }
            let symbolToStock = {};
            for (let i = 0; i < conditions.length; i++) {
                const condition = conditions[i];
                const { success, message, query: mongoQuery } = this.conditionToMongoQuery(condition);
                if (!success) {
                    return { success: false, message: message, result: null };
                }

                // console.log(`limit=${limit}, item=${JSON.stringify(mongoQuery)}`);
                const stocks = await getCollection('stocks');
                const result = await stocks.find(mongoQuery).project({
                    symbol: 1,
                    shortName: 1,
                    _id: 0,
                }).limit(limit - ret.length).toArray();

                symbolToStock = result.reduce((res, item) => {
                    res[item.symbol] = item;
                    return res;
                }, symbolToStock);
                ret = Object.values(symbolToStock);

                if (ret.length >= limit) {
                    return {
                        success: true,
                        message: `Result limited to ${ret.length}`,
                        result: ret.sort((x, y) => x.symbol.localeCompare(y.symbol)),
                    }
                }
            }
        }

        return {
            success: true,
            message: 'Success',
            result: ret.sort((x, y) => x.symbol.localeCompare(y.symbol)),
        }
    }

    async getStockBySymbol(symbol) {
        const stocks = await getCollection('stocks');

        const result = await stocks.findOne({ symbol: symbol });
        return { success: true, message: 'Success', result: result };
    }

    async getSectors() {
        const stocks = await getCollection('stocks');

        const result = await stocks.distinct("sector");
        return { success: true, message: 'Success', result: result };
    }

    async getExchanges() {
        const stocks = await getCollection('stocks');

        const result = await stocks.distinct("exchange");
        return { success: true, message: 'Success', result: result };
    }

    async getCountries() {
        const stocks = await getCollection('stocks');

        const result = await stocks.distinct("country");
        return { success: true, message: 'Success', result: result };
    }

    async getStock(_id) {
        const stocks = await getCollection('stocks');

        const result = await stocks.findOne({ _id: _id });
        return { success: true, message: 'Success', result: result }
    }
}

module.exports = {
    StockRepository,
    checkSymbol,
}