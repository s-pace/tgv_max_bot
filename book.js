const fetch = require("node-fetch");


require("dotenv").config();

const email = process.env.TRAINLINE_EMAIL;
const password = process.env.TRAINLINE_PASSWORD;

console.log({
    email
})
extractCookieString = (r) => r.substring(r.indexOf("=") + 1, r.indexOf(";"))

stringifyCookie = c => Object.keys(c).reduce((acc, e) => {
    if (acc) {
        acc = acc + "; "
    }
    return acc + e + "=" + c[e]
}, '')

signIn = (url, cookie) => {

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
            "x-ct-version": "1254b1d98ce9b91e3e5b46a3c6e7c159e5990497",
            "x-not-a-bot": "i-am-human",
            "x-requested-with": "XMLHttpRequest",
            "x-user-agent": "CaptainTrain/1554970536(web) (Ember 3.5.1)",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36"
        },
        "referrer": "https://www.trainline.fr/signin",
        "referrerPolicy": "no-referrer-when-downgrade",
        "body": "{\"id\":\"1\",\"email\":\"" + email + "\",\"password\":\"" + password + "\",\"facebook_id\":null,\"facebook_token\":null,\"google_code\":null,\"concur_auth_code\":null,\"concur_new_email\":null,\"concur_migration_type\":null,\"source\":null,\"correlation_key\":null,\"auth_token\":null,\"user_id\":null}",
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
    return fetch(url, opts)
}

const getToken = async url => {
    try {
        const signInResponse = await signIn(url)
        const ak_bmsc = extractCookieString(signInResponse.headers.get('set-cookie'));

        const resp2ndtoken = await signIn(url, {
            ak_bmsc
        })

        const bm_sv = extractCookieString(resp2ndtoken.headers.get('set-cookie'));

        const jsonSignin = await resp2ndtoken.json();
        const token = jsonSignin.meta.token
        console.info("Token & cookie fetched")
        console.info({
            "authorization": "Token token=" + token
        })
        console.info({
            ak_bmsc,
            bm_sv,
        })

        const search = await fetch("https://www.trainline.fr/api/v5_1/search", {
            "credentials": "include",
            "headers": {
                "accept": "application/json, text/javascript, */*; q=0.01",
                "accept-language": "fr-FR,fr;q=0.8",
                "authorization": "Token token=" + token,
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
                "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36",
                cookie: stringifyCookie({
                    ak_bmsc,
                    bm_sv
                })
            },
            "referrer": "https://www.trainline.fr/search",
            "referrerPolicy": "no-referrer-when-downgrade",
            "body": "{\"search\":{\"departure_date\":\"2019-04-25T13:00:00UTC\",\"arrival_date\":\"2019-04-25T18:20:00UTC\",\"systems\":[\"sncf\"],\"departure_station_id\":\"4916\",\"arrival_station_id\":\"4718\",\"passenger_ids\":[\"34135937\"],\"card_ids\":[\"1833434\",\"12669735\"]}}",
            "method": "POST",
            "mode": "cors"
        });
        const searchJson = await search.json("https://www.trainline.fr/api/v5_1/account/signin");

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
        const stringCookie = stringifyCookie(bookCookie)

        bookOpts = {
            "credentials": "include",
            "headers": {
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
                "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36",
                "authorization": "Token token=" + token,
                "cache-control": "no-cache",
                "cookie": stringCookie
            },
            "referrer": "https://www.trainline.fr/search/paris/lyon/2019-04-25-12:00",
            "referrerPolicy": "no-referrer-when-downgrade",
            "body": "{\"book\":{\"search_id\":\"" + folderToBook.search_id + "\",\"outward_folder_id\":\"" + folderToBook.id + "\",\"options\":{\"" + tripToBook.segment_ids[0] + "\":{\"comfort_class\":\"pao.default\",\"seat\":\"aisle\"}}}}",
            "method": "POST",
            "mode": "cors"
        }

        const book = await fetch("https://www.trainline.fr/api/v5_1/book", bookOpts);
        console.log(book)

    } catch (error) {
        console.error(error);
    }
};





getToken("https://www.trainline.fr/api/v5_1/account/signin");