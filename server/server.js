// installed modules
const express = require("express");
const bodyParser = require("body-parser");
const path = require('path');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const dotenv = require('dotenv').config();

// const crypto = require('crypto');
// const testData = require('../miva-post-raw.json');

// imported from mailer.js
const mailer = require("./mailer")

// create the express server
const app = express();

// middleware
app.use(fileUpload({createParentPath: true}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// route handlers
app.get('/',function(req,res){
    console.log('someone is trying to get the root...');
    res.status(200).sendFile(path.join(__dirname + '/../testForm.html'));
});

app.post('/register',function(req,res){
    mailer(req);
    res.redirect(301, 'https://www.sbfilters.com/new-dealer?submitted=true')
});

app.post('/miva', async (req, res) => {
    console.log('in the miva route... ');
    const {id, bill_email, bill_fname, bill_lname, bill_addr1, bill_city, bill_state, bill_zip, bill_cntry, formatted_total, orderdate, items} = req.body;
    // const {id, bill_email, bill_fname, bill_lname, bill_addr1, bill_city, bill_state, bill_zip, bill_cntry, formatted_total, orderdate, items} = testData;

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
    
    const formattedItems = items.map((item) => {
        const {sku, name, price} = item;
        let nameCleanedforURL = name.replace(/[, ]+/g, "-").replace(/[.]+/g, "").trim().toLowerCase();

        const eachItemObj = {
            "productId": sku,
            "productBrand": "SB Tanks",
            "productDescription": name,
            "productTitle": name,
            "productImageUrl": encodeURI(`http://sbtanks.com/mm5/${imgMap[sku]}`),
            "productPrice": `$${price}`,
            "productType": "",
            //this will need to be swapped for the live site
            "productUrl": `http://dev.sbtanks.com/${nameCleanedforURL}`
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

module.exports = app;
