"use strict";

var request = require("request");
("use strict");
const nodemailer = require("nodemailer");
const cheerio = require("cheerio");

require("dotenv").config();

const departureTime = process.env.DEPARTURE_TIME;
const arrivalTime = process.env.ARRIVAL_TIME;
const departure = process.env.DEPARTURE;
const arrival = process.env.ARRIVAL;

const formatedDepartureTime = new Date(departureTime)
const formatedArrivalTime = new Date(arrivalTime)

function formateDate(d) {
    if (!d) {
        console.error("date undefinned")
    }

    if (typeof d === 'string') {
        d = new Date(d);
    }

    const dateFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: "numeric",
        minute: "numeric"
    };
    return (new Intl.DateTimeFormat('en-US', dateFormatOptions).format(d));
}
const constraint = `${departure.substring(0,3)} to ${arrival.substring(0,3)} at ${formateDate(formatedDepartureTime)} until ${formateDate(formatedArrivalTime)} `
console.log(`${constraint}\n`)


request("https://simulateur.tgvmax.fr/VSC/", (error, response, html) => {
    if (!error && response.statusCode == 200) {
        var $ = cheerio.load(html);
        const hiddenToken = $("#hiddenToken").val();
        console.log(`hiddenToken=${hiddenToken}`);
        const options = {
            url: encodeURI(`https://sncf-simulateur-api-prod.azurewebsites.net/api/RailAvailability/Search/${departure}/${arrival}/${departureTime}/${arrivalTime}`),
            headers: {
                Accept: "application/json, text/plain, */*",
                Referer: "https://simulateur.tgvmax.fr/VSC/",
                Origin: "https://simulateur.tgvmax.fr",
                "Content-Type": "application/json",
                ValidityToken: hiddenToken
            },
            json: true
        };

        function callback(error2, response2, body2) {
            if (!error2 && response2.statusCode == 200) {
                const nbTrains = body2.length;
                for (var train in body2) console.log(`Train starting on ${formateDate(body2[train].departureDateTime)} checked`)
                const avaialbleTrains = body2.filter(t => t.availableSeatsCount > 0);
                if (avaialbleTrains.length > 0) {
                    console.log("Founded");
                    // Only needed if you don't have a real mail account for testing
                    nodemailer.createTestAccount((err, account) => {
                        // create reusable transporter object using the default SMTP transport

                        const host = process.env.SMTP_SERVER;
                        const port = process.env.SMTP_PORT;
                        const user = process.env.SMTP_USER;
                        const pass = process.env.SMTP_PASSWORD;
                        const receiver = process.env.RECEIVER;
                        const sender = process.env.SENDER;

                        let transporter = nodemailer.createTransport({
                            host: host,
                            port: port,
                            secure: true, // true for 465, false for other ports
                            auth: {
                                user: user, // generated ethereal user
                                pass: pass // generated ethereal password
                            }
                        });
                        const traintText = avaialbleTrains.reduce((acc, train) => `${acc}\n\n Train:${train.train} at ${formateDate(train.departureDateTime)} /w ${train.availableSeatsCount} seats`, '')
                        const text = `We have found trains 🎉\n ${traintText}`
                        // setup email data with unicode symbols
                        let mailOptions = {
                            from: `"TGV max robot 🤖" <${sender}>`, // sender address
                            to: receiver, // list of receivers
                            subject: ` ${constraint} found `, // Subject line
                            text: text, // plain text body
                            html: text.split('\n').join('\n<br>\n') // html body
                        };

                        // send mail with defined transport object
                        transporter.sendMail(mailOptions, (e, info) => {
                            if (e) {
                                return console.error(e);
                            }
                            console.log("Message sent: %s", info.messageId);
                        });
                    });
                } else {
                    console.log(`Next time ;), not found over ${nbTrains} trains`);
                }

            } else {
                console.log(response2.request.path)
                console.error(`Status: ${response2.statusCode}`);
                console.error(response2.statusMessage);
            }
        }

        request(options, callback);
    }
});