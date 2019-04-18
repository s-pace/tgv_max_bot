const fetch = require("node-fetch");
const chalk = require('chalk');

require("dotenv").config();

const email = process.env.TRAINLINE_EMAIL;
const password = process.env.TRAINLINE_PASSWORD;

console.info(chalk.cyan("Looking a train for " +
    email
))

extractCookieString = (r) => r.substring(r.indexOf("=") + 1, r.indexOf(";"))

stringifyCookie = c => Object.keys(c).reduce((acc, e) => {
    if (acc) {
        acc = acc + "; "
    }
    return acc + e + "=" + c[e]
}, '')

buildRequest = (url, body, cookie, token, extraHeaders) => {

    const referrer = url.split("/").pop();
    let opts = {
        credentials: 'include',
        "headers": {
            "accept": "application/json, text/javascript, */*; q=0.01",
            "accept-language": "fr-FR,fr;q=0.8",
            "cache-control": "no-cache",
            "content-type": "application/json; charset=UTF-8",
            "pragma": "no-cache",
            "x-ct-client-id": "761c18b4-14ec-44a7-bd33-61100dd7faab",
            "x-ct-locale": "fr",
            "x-ct-timestamp": "1554970536",
            // "x-ct-version": "1254b1d98ce9b91e3e5b46a3c6e7c159e5990497",
            "x-not-a-bot": "i-am-human",
            "x-requested-with": "XMLHttpRequest",
            "x-user-agent": "CaptainTrain/1554970536(web) (Ember 3.5.1)",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36"
        },
        "referrer": "https://www.trainline.fr/" + referrer,
        "referrerPolicy": "no-referrer-when-downgrade",
        body,
        "method": "POST",
        "mode": "cors"
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
                "authorization": "Token token=" + token,
            })
        })
    }
    console.info(url)
    console.info(opts)
    return fetch(url, opts)
}

const getToken = async url => {
    try {
        bodyLogin = "{\"id\":\"1\",\"email\":\"" + email + "\",\"password\":\"" + password + "\",\"facebook_id\":null,\"facebook_token\":null,\"google_code\":null,\"concur_auth_code\":null,\"concur_new_email\":null,\"concur_migration_type\":null,\"source\":null,\"correlation_key\":null,\"auth_token\":null,\"user_id\":null}"
        const signInResponse = await buildRequest(url, bodyLogin)
        const ak_bmsc = extractCookieString(signInResponse.headers.get('set-cookie'));
        console.info(chalk.bgBlue("First signin responsed with a status: " + signInResponse.status))

        const resp2ndtoken = await buildRequest(url, bodyLogin, {
            ak_bmsc
        })
        console.info(chalk.bgBlue("2nd signin responsed with a status: " + resp2ndtoken.status))

        const bm_sv = extractCookieString(resp2ndtoken.headers.get('set-cookie'));

        const jsonSignin = await resp2ndtoken.json();
        const token = jsonSignin.meta.token
        console.info(chalk.yellow("Token & cookie fetched"))
        console.info(chalk.yellow(JSON.stringify({
            "authorization": "Token token=" + token,
            ak_bmsc,
            bm_sv,
        }, null, 4)))

        const search = await buildRequest("https://www.trainline.fr/api/v5_1/search", "{\"search\":{\"departure_date\":\"2019-04-25T13:00:00UTC\",\"arrival_date\":\"2019-04-25T18:20:00UTC\",\"systems\":[\"sncf\"],\"departure_station_id\":\"4916\",\"arrival_station_id\":\"4718\",\"passenger_ids\":[\"34135937\"],\"card_ids\":[\"1833434\",\"12669735\"]}}", {
            ak_bmsc,
            bm_sv
        }, token)
        console.info(chalk.bgBlue("Search responsed with a status: " + search.status))

        const searchJson = await search.json();

        const trips = searchJson.trips
        const freeFolder = searchJson.folders.filter(f => f.cents == 0)

        const folderToBook = freeFolder[0]
        const tripToBook = trips.filter(t => t.id == folderToBook.trip_ids[0])[0]

        console.info("tripToBook")
        console.info(folderToBook.search_id)
        console.info(folderToBook.id)
        console.info(tripToBook.segment_ids[0])

        const bookCookie = {
            ak_bmsc,
            eu_business_user: false,
            eu_voucher_user: false,
            mobile: "no",
            bm_sv
        }

        const book = await buildRequest("https://www.trainline.fr/api/v5_1/book", "{\"book\":{\"search_id\":\"" + folderToBook.search_id + "\",\"outward_folder_id\":\"" + folderToBook.id + "\",\"options\":{\"" + tripToBook.segment_ids[0] + "\":{\"comfort_class\":\"pao.default\",\"seat\":\"aisle\"}}}}", bookCookie, token);
        console.log(book)

    } catch (error) {
        console.error(error);
    }
};





getToken("https://www.trainline.fr/api/v5_1/account/signin");