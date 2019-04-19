const fetch = require("node-fetch");
const chalk = require("chalk");
const nodemailer = require("nodemailer");

const util = require('util');
const exec = util.promisify(require('child_process').exec);


require("dotenv").config();

const email = process.env.TRAINLINE_EMAIL;
const password = process.env.TRAINLINE_PASSWORD;
const departureTime = process.env.DEPARTURE_TIME;
const arrivalTime = process.env.ARRIVAL_TIME;
const departure = process.env.DEPARTURE;
const arrival = process.env.ARRIVAL;

stationsId = {
    "PARIS (intramuros)": 4916,
    "LYON (gares intramuros)": 4718
}

toStationId = station => stationsId[station]
const cardId = process.env.CARD_ID || 1833434
const arrivalStationId = toStationId(arrival)
const departureStationId = toStationId(departure)
const passengerId = process.env.PASSENGER_ID || 34135937

console.info(chalk.cyan("Looking a train for " +
    email
))

extractCookieString = (r) => !r ? null : r.substring(r.indexOf("=") + 1, r.indexOf(";"))

stringifyCookie = c => Object.keys(c).reduce((acc, e) => {
    if (c[e]) {
        if (acc) {
            acc = acc + "; "
        }
        return acc + e + "=" + c[e]
    } else {
        return acc
    }
}, '')
formateDate = (d) => {
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
buildRequest = (url, body, cookie, token, extraHeaders) => {

    const referrer = url.split("/").pop();
    let opts = {
        credentials: 'include',
        headers: {
            "origin": 'https://www.trainline.fr',
            "accept-encoding": 'gzip, deflate, br',
            "accept": "application/json, text/javascript, */*; q=0.01",
            "accept-language": "fr-FR,fr;q=0.8",
            "cache-control": "no-cache",
            "content-type": "application/json; charset=UTF-8",
            "pragma": "no-cache",
            "x-ct-client-id": "761c18b4-14ec-44a7-bd33-61100dd7faab",
            "x-ct-locale": "fr",
            "x-ct-timestamp": "1554970536",
            "x-ct-version": "1254b1d98ce9b91e3e5b46a3c6e7c159e5990497",
            "x-not-a-bot": "i-am-human",
            "x-requested-with": "XMLHttpRequest",
            "x-user-agent": "CaptainTrain/1554970536(web) (Ember 3.5.1)",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36"
        },
        referrer: `https://www.trainline.fr/${referrer}`,
        referrerPolicy: "no-referrer-when-downgrade",
        body,
        method: "POST",
        mode: "cors",
    }
    if (cookie) {
        opts = Object.assign(opts, {
            headers: Object.assign(opts.headers, {
                cookie: stringifyCookie(cookie)
            })
        })
    }

    if (extraHeaders) {
        opts = Object.assign(opts, {
            headers: Object.assign(opts.headers, extraHeaders)
        })
    }

    if (token) {
        opts = Object.assign(opts, {
            headers: Object.assign(opts.headers, {
                "authorization": `Token token=${token}`,
            })
        })
    }
    // console.info(opts)
    return fetch(url, opts)
}

const getCurlTOken = async (url, body) => {
    try {
        const referrer = url.split("/").pop();
        const result = await exec(`curl --silent --output /dev/null --cookie-jar - '${url}' -H 'origin: https://www.trainline.fr' -H 'accept-encoding: gzip, deflate, br' -H 'accept-language: fr-FR,fr;q=0.8' -H 'x-ct-version: 1254b1d98ce9b91e3e5b46a3c6e7c159e5990497' -H 'x-ct-locale: fr' -H 'x-requested-with: XMLHttpRequest' -H 'pragma: no-cache' -H 'x-user-agent: CaptainTrain/1554970536(web) (Ember 3.5.1)' -H 'x-not-a-bot: i-am-human' -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36' -H 'content-type: application/json; charset=UTF-8' -H 'accept: application/json, text/javascript, */*; q=0.01' -H 'cache-control: no-cache' -H 'authority: www.trainline.fr' -H 'referer: https://www.trainline.fr/${referrer}' -H 'x-ct-timestamp: 1554970536' --data-binary '${body}' --compressed`);
        const cookies = result.stdout.split('\t')
        const ak_bmsc = cookies[cookies.indexOf('ak_bmsc') + 1].replace(/\n/g, '')
        return ak_bmsc
    } catch (error) {
        console.error(error);
        return null
    }
}

const main = async () => {
    try {
        const signInUrl = "https://www.trainline.fr/api/v5_1/account/signin"
        bodyLogin = `{\"id\":\"1\",\"email\":\"${email}\",\"password\":\"${password}\",\"facebook_id\":null,\"facebook_token\":null,\"google_code\":null,\"concur_auth_code\":null,\"concur_new_email\":null,\"concur_migration_type\":null,\"source\":null,\"correlation_key\":null,\"auth_token\":null,\"user_id\":null}`

        const ak_bmsc = await getCurlTOken(signInUrl, bodyLogin)

        const resp2ndtoken = await buildRequest(signInUrl, bodyLogin, {
            ak_bmsc
        })
        console.info(chalk.bgBlue(`2nd signin responsed with a status: ${resp2ndtoken.status}`))

        const bm_sv = extractCookieString(resp2ndtoken.headers['set-cookie']);

        const jsonSignin = await resp2ndtoken.json();
        const token = jsonSignin.meta.token
        console.info(chalk.yellow("Token & cookie fetched"))
        console.info(chalk.yellow(JSON.stringify({
            "authorization": `Token token=${token}`,
            ak_bmsc,
            bm_sv,
        }, null, 4)))

        const search = await buildRequest("https://www.trainline.fr/api/v5_1/search", `{\"search\":{\"departure_date\":\"${departureTime}\",\"arrival_date\":\"${arrivalTime}\",\"systems\":[\"sncf\"],\"departure_station_id\":\"${departureStationId}\",\"arrival_station_id\":\"${arrivalStationId}\",\"passenger_ids\":[\"${passengerId}\"],\"card_ids\":[\"${cardId}\"]}}`, {
            ak_bmsc,
            bm_sv
        }, token)
        console.info(chalk.bgBlue(`Search responsed with a status: ${search.status}`))

        const searchJson = await search.json();

        const trips = searchJson.trips
        const freeFolder = searchJson.folders.filter(f => f.cents == 0 && f.is_sellable)
        if (freeFolder.length > 0) {
            const folderToBook = freeFolder[0]
            const tripToBook = trips.filter(t => t.id == folderToBook.trip_ids[0])[0]
            console.info(chalk.green("tripToBook"))
            console.info(chalk.green(folderToBook.search_id))
            console.info(chalk.green(folderToBook.id))

            console.info(chalk.green(JSON.stringify(tripToBook, null, 4)))

            const bookCookie = {
                ak_bmsc,
                eu_business_user: false,
                eu_voucher_user: false,
                mobile: "no",
                bm_sv
            }

            const book = await buildRequest("https://www.trainline.fr/api/v5_1/book", `{\"book\":{\"search_id\":\"${folderToBook.search_id}\",\"outward_folder_id\":\"${folderToBook.id}\",\"options\":{\"${tripToBook.segment_ids[0]}\":{\"comfort_class\":\"pao.default\",\"seat\":\"aisle\"}}}}`, bookCookie, token);
            console.info(chalk.bgBlue(`Book responsed with a status: ${book.status}`))

            if (book.status === 201) {

                const host = process.env.SMTP_SERVER;
                const port = process.env.SMTP_PORT;
                const user = process.env.SMTP_USER;
                const pass = process.env.SMTP_PASSWORD;
                const receiver = process.env.RECEIVER;
                const sender = process.env.SENDER;

                // create reusable transporter object using the default SMTP transport
                let transporter = nodemailer.createTransport({
                    host: host,
                    port: port,
                    secure: true, // true for 465, false for other ports
                    auth: {
                        user: user, // generated ethereal user
                        pass: pass // generated ethereal password
                    }
                });

                const text = `We have found trains 🎉\n ${folderToBook.id}`

                // setup email data with unicode symbols
                let mailOptions = {
                    from: `"TGV max robot 🤖" <${sender}>`, // sender address
                    to: receiver, // list of receivers
                    subject: `Train found departure at ${formateDate(tripToBook.arrival_date)}`, // Subject line
                    text: text, // plain text body
                    html: text.split('\n').join('\n<br>\n') // html body
                };
                // send mail with defined transport object
                let info = await transporter.sendMail(mailOptions);
                console.info(chalk.magenta(`Message sent: ${info.messageId}`));

            } else {
                console.info(chalk.red(`Coud not book, status: ${book.status}`))
            }

        } else {
            console.info(chalk.red("No train found"))
        }

    } catch (error) {
        console.error(error);
    }
};

main();