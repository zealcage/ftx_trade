Trade API
-
This application lets you trade through the trading pairs requested by the user. FTX API was used to get corresponding orderbook. 

API: POST /quote  
-
Request \
● action (String): Either “buy” or “sell” \
● base_currency (String): The currency to be bought or sold \
● quote_currency (String): The currency to quote the price in \
● amount (String): The amount of the base currency to be traded \
Response \
● total (String): Total quantity of quote currency \
● price (String): The per-unit cost of the base currency \
● currency (String): The quote currency 

Explanation of how it works:
-
The api gets the "base_currency"/"quote_currency" orderbook from FTX with axios. If it reversed pair like "quote_currency"/"base_currency", that is also handeled. When order is not filled 100%, it returns also the percentage of the fullfilment as "filled".
- If "action"="buy" for non-reverse pair, api aggregates the asks until the user's order is filled. 
- If "action"="sell" for non-reverse pair, api aggregates the bids until the user's order is filled. 
- If "action"="buy" for reverse pair, api aggregates the bids until the user's order is filled. 
- If "action"="sell" for reverse pair, api aggregates the asks until the user's order is filled. 

Validation is done in the middleware with JOI data validator.

Packages used: 
- axios
- dotenv
- joi
- express

How to run
-
1- Run ```npm install``` \
2- Run ```npm start``` \
3- Make POST request to ```localhost:8080/quote```