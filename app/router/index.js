const tradeServices = require("../controller/trade");
const tradeServiceValidation = require("../controller/trade/validation");

module.exports = function (app) {
    app.post('/quote', [tradeServiceValidation.tradeValidation], tradeServices.trade);
}