"use strict";

var request = require('request');
'use strict';
const nodemailer = require('nodemailer');
const cheerio = require('cheerio')

require('dotenv').config();

const departureTime = process.env.DEPARTURE_TIME
const arrivalTime = process.env.ARRIVAL_TIME
const departure = process.env.DEPARTURE
const arrival = process.env.ARRIVAL

console.log(`Request for ${departure} to ${arrival} departureTime:${departureTime} arrivalTime:${arrivalTime}`)


request("https://simulateur.tgvmax.fr/VSC/", (error, response, html) => {

    if (!error && response.statusCode == 200) {
        var $ = cheerio.load(html);
        const hiddenToken = ($("#hiddenToken").val())
        console.log(`hiddenToken=${hiddenToken}`)
        const options = {
            url: `https://sncf-simulateur-api-prod.azurewebsites.net/api/RailAvailability/Search/${departure}/${arrival}/${departureTime}/${arrivalTime}`,
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Referer': 'https://simulateur.tgvmax.fr/VSC/',
                'Origin': 'https://simulateur.tgvmax.fr',
                'Content-Type': 'application/json',
                'ValidityToken': hiddenToken,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36'
            },
            json: true
        };


        function callback(error, response, body) {
            if (!error && response.statusCode == 200) {
                const nbTrains = body.length
                const avaialbleTrains = body.filter(t => t.availableSeatsCount > 0)
                if (avaialbleTrains.length > 0) {
                    console.log("alleluja");
                    avaialbleTrains.map(console.log)
                } else {
                    console.log(`Next time ;), not found over ${nbTrains} trains`);

                }
                // // Generate test SMTP service account from ethereal.email
                // // Only needed if you don't have a real mail account for testing
                // nodemailer.createTestAccount((err, account) => {
                //     // create reusable transporter object using the default SMTP transport
                //     let transporter = nodemailer.createTransport({
                //         host: 'smtp.ethereal.email',
                //         port: 587,
                //         secure: false, // true for 465, false for other ports
                //         auth: {
                //             user: account.user, // generated ethereal user
                //             pass: account.pass // generated ethereal password
                //         }
                //     });

                //     // setup email data with unicode symbols
                //     let mailOptions = {
                //         from: '"Fred Foo 👻" <foo@example.com>', // sender address
                //         to: 'bar@example.com, baz@example.com', // list of receivers
                //         subject: 'Hello ✔', // Subject line
                //         text: 'Hello world?', // plain text body
                //         html: '<b>Hello world?</b>' // html body
                //     };

                //     // send mail with defined transport object
                //     transporter.sendMail(mailOptions, (error, info) => {
                //         if (error) {
                //             return console.error(error);
                //         }
                //         console.log('Message sent: %s', info.messageId);
                //         // Preview only available when sending through an Ethereal account
                //         console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

                //         // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
                //         // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
                //     });
                // });
            } else {
                console.error(response)

            }
        }

        request(options, callback);
    }

});