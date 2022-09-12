const axios = require('axios');
const crypto = require('crypto');

//  Make GET request for FTX Orderbook
async function getOrderbookFTX(base_currency, quote_currency) {
    const timestamp = Date.now();
    const method = "GET"
    const requestPath = "/markets"
    const signaturePayload = timestamp + method.toUpperCase() + "/api" + requestPath + (method.toUpperCase() === "POST" ? JSON.stringify("") : "");
    const signature = crypto.createHmac('sha256', process.env.FTX_API_SECRET)
        .update(signaturePayload)
        .digest('hex');
    return await axios.get(`https://ftx.us/api/markets/${base_currency}/${quote_currency}/orderbook?depth=50`, {
        headers: {
            "FTX-KEY": process.env.FTX_API_KEY,
            "FTX-TS": timestamp,
            "FTX-SIGN": signature,
            "Content-Type": "application/json",
            "Accepts": "application/json"
        },
        timeout: 10000
    }).catch(err => {
        return { status: err.status, error: err.response?.data?.success === false ? err.response?.data?.error : err.message }
    })
}

//  Calculates weighted average through the actions done
function calculateWeightedAverage(actions, amount) {
    let weightedAverage = 0
    for (let i = 0; i < actions.length; i++) {
        const el = actions[i];
        weightedAverage += el[0] * (el[1] / amount)
    }
    return weightedAverage
}

exports.trade = (req, res) => {
    const { action, base_currency, quote_currency, amount } = req.validatedBody

    //  Make call for both currency pairs
    Promise.all([
        getOrderbookFTX(base_currency, quote_currency),
        getOrderbookFTX(quote_currency, base_currency),
    ]).then((values) => {

        // Here we decide whether the market exist or the reverse market exists
        if (!(values[0].status === 200 || values[1].status === 200))
            throw new Error(values[0].status === 200 ? values[1].error : values[0].error)
        const successIndex = values[0].status === 200 ? 0 : 1

        let actions = []    //  Filled actions
        let amountRemained = amount //  Amount remained to keep track how much more we need to aggragate
        let total = 0 //  Total quote_currency amount filled

        if (action === "buy" && successIndex === 0) {   // If trading pair is not reverse
            const orders = values[successIndex].data.result.asks
            for (let i = 0; i < orders.length; i++) {
                const order = orders[i];
                if (order[1] >= amountRemained) {   // Order is gonna be filled here
                    actions.push([order[0], amountRemained]) // Push the order action
                    total += order[0] * amountRemained  //  Sum the total quote currency filled
                    amountRemained = 0  //  Since order is filled 100% set amount remained to 0
                    break
                } else {    // It means order is not filled 100% so keep iterating through the asks
                    amountRemained -= order[1]  // Update amount remained
                    total += order[0] * order[1]    //  Sum the total quote currency filled
                    actions.push([order[0], order[1]])
                }
            }
        } else if (action === "buy" && successIndex === 1) {    // For inverse trading pair
            const orders = values[successIndex].data.result.bids
            for (let i = 0; i < orders.length; i++) {
                const order = orders[i];
                if (order[0] * order[1] >= amountRemained) {
                    actions.push([1 / order[0], amountRemained]) // 1 / order[0] is unit price
                    total += (1 / order[0]) * amountRemained
                    amountRemained = 0
                    break
                } else {
                    amountRemained -= order[0] * order[1]
                    total += order[1]
                    actions.push([1 / order[0], order[0] * order[1]])
                }
            }
        } else if (action === "sell" && successIndex === 0) {   // If trading pair is not reverse
            const orders = values[successIndex].data.result.bids
            for (let i = 0; i < orders.length; i++) {
                const order = orders[i];
                if (order[1] >= amountRemained) {
                    actions.push([order[0], amountRemained])
                    total += order[0] * amountRemained
                    amountRemained = 0
                    break
                } else {
                    amountRemained -= order[1]
                    total += order[0] * order[1]
                    actions.push([order[0], order[1]])
                }
            }
        } else if (action === "sell" && successIndex === 1) {   // For inverse trading pair
            const orders = values[successIndex].data.result.asks
            for (let i = 0; i < orders.length; i++) {
                const order = orders[i];
                if (order[0] * order[1] >= amountRemained) {
                    actions.push([1 / order[0], amountRemained])
                    total += (1 / order[0]) * amountRemained
                    amountRemained = 0
                    break
                } else {
                    amountRemained -= order[0] * order[1]
                    total += order[1]
                    actions.push([1 / order[0], order[0] * order[1]])
                }
            }
        } else // If this 'else' works it means there is something wrong
            return res.status(400).send({ success: false, error: "Unexpected error (100)" });

        if (amountRemained > 0) // If the order is not filled 100% return the percentage
            return res.status(200).send({ total: total.toString(), price: calculateWeightedAverage(actions, amount - amountRemained).toString(), currency: quote_currency, filled: (100 - (amountRemained / amount * 100)).toFixed(2) + "%" });
        else    // Order filled.
            return res.status(200).send({ total: total.toString(), price: calculateWeightedAverage(actions, amount).toString(), currency: quote_currency });

    }).catch(error => {
        if (error.message) {
            return res.status(400).send({ success: false, error: error.message });
        } else return res.status(400).send({ success: false, error: "Unexpected error (101)" });
    })
}