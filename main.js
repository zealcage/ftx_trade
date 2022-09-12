var express = require('express');
var app = express();
var bodyParser = require('body-parser');
const dotenv = require('dotenv');

const result = dotenv.config({ path: __dirname + '/.env' })

if (result.error) {
    throw result.error
}

app.use(bodyParser.json())

var http = require('http').createServer(app);

require('./app/router')(app);

console.log("%s\x1b[32m%s\x1b[0m%s\x1b[32m%s", 'Server started in ', process.env.NODE_ENV, ' mode on ', process.env.IPADD + ':' + process.env.PORT,)

http.listen(process.env.PORT, process.env.IPADD);