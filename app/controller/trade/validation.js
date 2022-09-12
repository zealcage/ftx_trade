const Joi = require('joi');

const schema = Joi.object({
    action: Joi.string().trim().lowercase().valid('buy', 'sell').required(),
    base_currency: Joi.string().trim().uppercase().required(),
    quote_currency: Joi.string().trim().uppercase().required(),
    amount: Joi.number().min(0).required(),
})

//  Validate the fields
exports.tradeValidation = (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
        return res.status(400).send({ success: false, error: error.message });
    }
    req.validatedBody = value
    next()
}