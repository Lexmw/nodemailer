// installed modules
const express = require("express");
const bodyParser = require("body-parser");
const path = require('path');
const fileUpload = require('express-fileupload');
const axios = require('axios');
var fs = require('fs');
var csvWriter = require('csv-write-stream')

require('dotenv').config();

// imported from mailer.js
const mailer = require("./mailer")

// create the express server
const app = express();
const imgMap = {
    '10-1000': 'graphics/00000001/10-1000- 56 gallon capacity.jpg',
    '100EE00AA2': 'graphics/00000001/EZ Lynk Auto Agent 2.0.jpg',
    '10-1001': 'graphics/00000001/1001-V2.png',
    '10-1002': 'graphics/00000001/10-1002 pictures.jpg',
    '10-1004': 'graphics/00000001/10-1004 with single infographic.jpg',
    '10-1005': 'graphics/00000001/MAIN10-1005- 14 Single Infographic.jpg',
    '10-1006': 'graphics/00000001/10-1006- Single Infographic 7-19-19.jpg',
    '10-1008': 'graphics/00000001/10-1008 thumbnail.jpg',
    '10-2000': 'graphics/00000001/Tankcomp12 (1) (1).jpg',
    '10-2001': 'graphics/00000001/Tankcomp12 (1) (1).jpg',
};

// middleware
app.use(fileUpload({createParentPath: true}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));

// route handlers
app.get('/',function(req,res){
    console.log('someone is trying to get the root...');
    res.status(200).sendFile(path.join(__dirname + '/../testForm.html'));
});

app.get('/productImage/:sku', (req, res) => {
    console.log(encodeURI(`http://sbtanks.com/mm5/${imgMap[req.params.sku]}`));
});

app.post('/register',function(req,res){
    mailer(req);
    res.redirect(301, 'https://www.sbfilters.com/new-dealer?submitted=true')
});

app.post('/miva', async (req, res) => {
    console.log('in the miva route... ');
    const {id, bill_email, bill_fname, bill_lname, bill_addr1, bill_city, bill_state, bill_zip, bill_cntry, formatted_total, orderdate, items} = req.body;
    
    const formattedItems = items.map((item) => {
        const {sku, name, price} = item;
        let nameCleanedforURL = name.replace(/[, ]+/g, "-").replace(/[.]+/g, "").trim().toLowerCase();

        const eachItemObj = {
            "productId": sku,
            "productBrand": "SB Tanks",
            "productDescription": name,
            "productTitle": name,
            "productImageUrl": encodeURI(`http://sbtanks.com/mm5/${imgMap[req.params.sku]}`),
            "productPrice": `$${price}`,
            "productType": "",
            "productUrl": `http://sbtanks.com/${nameCleanedforURL}`
        }
        return eachItemObj;
    })

    const stampedSettings = {
        "url": `https://stamped.io/api/v2/${process.env.STAMPED_STORE_HASH}/survey/reviews/bulk`,
        "method": "POST",
        'headers': {
            'Content-Type': 'application/json'
        },
        "auth": {
            "username": process.env.STAMPED_PUBLIC_KEY,
            "password": process.env.STAMPED_PRIVATE_KEY
        },
        "data": JSON.stringify(
            [
                {
                    "email": bill_email,
                    "firstName": bill_fname,
                    "lastName": bill_lname,
                    "location": `${bill_addr1} ${bill_city} ${bill_state}, ${bill_zip} ${bill_cntry}`,
                    "orderNumber": id,
                    "orderId": id,
                    "orderCurrencyISO": "USD",
                    "orderTotalPrice": formatted_total,
                    "orderSource": "SB Tanks",
                    "orderDate": orderdate,
                    "dateScheduled": orderdate,
                    "itemsList": formattedItems
                }
            ]
        ),
    };

    try {
        let stampedResult = await axios(stampedSettings);

        if (stampedResult) {
            if (stampedResult.data) {
                console.log(`Stamped Result data: `, stampedResult.data);
                if (stampedResult.data.length == 0) {
                    console.log('Successful stamped post, unsuccessful email generation, most likely a duplicate order number.')
                }
            }

        }
    } catch (err) {
        console.log(`Error with stmaped post: ${err}`);
    }
});

app.post('/filtersBronto', async (req, res) => {
    const {id, bill_email, orderdate, items} = req.body;
    console.log(id, bill_email, orderdate, items);
    // writing to the csv in append mode
    var writer = csvWriter();
    writer.pipe(fs.createWriteStream('bronto.csv', {flags: 'a'}));
    
    // bronto csv is on the item level. each order takes up multiple rows, etc.
    const formattedItems = items.map((item) => {
        const {sku, name, price, retail, base_price, total, quantity} = item;
        let nameCleanedforURL = name.replace(/[, ]+/g, "-").replace(/[.]+/g, "").trim().toLowerCase();

        // updated to reflect robert's template
        const eachItemObj = {
            "email": bill_email,
            "orderid": id,
            "shipping_date": orderdate,
            "shipping_details": "Shipped",
            "productId": sku,
            "name": name,
            "quantity": quantity,
            "unit_price": retail,
            "sale_price": base_price,
            "total_price": price,
            "url": `http://sbtanks.com/${nameCleanedforURL}`,
            "imageurl": "",
        }
        console.log(eachItemObj);
        writer.write(eachItemObj);
        return eachItemObj;
    });

    // kill the csv session
    writer.end()
    res.status(200).send();
});

module.exports = app;
