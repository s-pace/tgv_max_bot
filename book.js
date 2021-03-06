const fetch = require("node-fetch");
const chalk = require("chalk");
const nodemailer = require("nodemailer");

const util = require("util");

require("dotenv").config();

const email = process.env.TRAINLINE_EMAIL;
const password = process.env.TRAINLINE_PASSWORD;
const departureTime = process.env.DEPARTURE_TIME;
const departure = process.env.DEPARTURE;
const arrival = process.env.ARRIVAL;

stationsId = {
  grenoble: 3358,
  "lyon (gares intramuros)": 4718,
  lyon: 4718,
  marseille: 4790,
  "paris (gares intramuros)": 4916,
  paris: 4916,
  toulouse: 5306,
  "le mans": 172,
  "avignon tgv ": 485,
  avignon: 485,
  vannes: 5663
};

toStationId = station => stationsId[station.toLowerCase()];
const cardId = process.env.CARD_ID || 1833434;
const arrivalStationId = toStationId(arrival);
const departureStationId = toStationId(departure);
const passengerId = process.env.PASSENGER_ID || 34135937;
const catchFetchError = e => {
  console.error(e);
  if (err.name === "AbortError") {
    console.error("Cancelled request is rejected");
  }
  if (e.type && e.type !== "system") {
    console.error("Error originating from node-fetch with type:" + e.type);
  }
  if (e.type && e.type !== "system" && e.code && e.errno) {
    console.error("Error thrown by Node.js core" + e);
  }
};

console.info(chalk.cyan("Looking a train for " + email));

extractCookieString = r =>
  !r ? null : r.substring(r.indexOf("=") + 1, r.indexOf(";"));

stringifyCookie = c =>
  Object.keys(c).reduce((acc, e) => {
    if (c[e]) {
      if (acc) {
        acc = acc + "; ";
      }
      return acc + e + "=" + c[e];
    } else {
      return acc;
    }
  }, "");

formateDate = d => {
  if (!d) {
    console.error("date undefinned");
  }

  if (typeof d === "string") {
    d = new Date(d);
  }

  const dateFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric"
  };
  return new Intl.DateTimeFormat("en-US", dateFormatOptions).format(d);
};
buildRequest = (url, body, cookie, token, extraHeaders) => {
  const referrer = url.split("/").pop();
  let opts = {
    // credentials: "include",
    headers: {
      origin: "https://www.trainline.fr",
      "accept-encoding": "fr-FR,fr;q=0.8",
      accept: "application/json, text/javascript, */*; q=0.01",
      "accept-language": "fr-FR,fr;q=0.8",
      // "cache-control": "no-cache",
      "content-type": "application/json; charset=UTF-8",
      pragma: "no-cache",
      "x-ct-client-id": "761c18b4-14ec-44a7-bd33-61100dd7faab",
      "x-ct-locale": "fr",
      "x-ct-timestamp": "1574360965",
      "x-ct-version": "eaa9fb2f01bb5bc32739c760673d38e7e9441b5f",
      "x-not-a-bot": "i-am-human",
      "x-requested-with": "XMLHttpRequest",
      "x-user-agent": "CaptainTrain/1554970536(web) (Ember 3.5.1)",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36"
    },
    // referrer: `https://www.trainline.fr/${referrer}`,
    // referrerPolicy: "no-referrer-when-downgrade",
    body,
    method: "POST"
    // mode: "cors"
  };

  if (extraHeaders) {
    opts = Object.assign(opts, {
      headers: Object.assign(opts.headers, extraHeaders)
    });
  }

  if (token) {
    opts = Object.assign(opts, {
      headers: Object.assign(opts.headers, {
        authorization: `Token token=${token}`
      })
    });
  }

  // if (cookie) {
  //   opts = Object.assign(opts, {
  //     headers: Object.assign(opts.headers, {
  //       cookie: stringifyCookie(cookie)
  //     })
  //   });
  // }

  opts.headers.cookie=`eu_business_user=false; eu_voucher_user=false; ak_bmsc=9A0C1FE47A6F2E27FE8109140B41AC4F58DD731594260000A227DE5DAA996F7D~plebpRXfz8iqSCZWx7l8uI6Kl10sGacwYx5o8ipzNNGEhOJHotzeX7ogBCkJ/lYuHi5Cd+L0RgYjkcra1+8XRp84Ocvs8rOfzCPs2UBXqr5D4TslpZAh9rG/fcli7o524JmnoUf0qC7AkzYFxHD08L69HdGwQYdHNuvtbREsu97w6YXEOps6evCGR33jLrywLBz+SVaPLzhhU7R3d/BE7Fj1HtYgVFGN6VLGvSc940MMM=; mobile=no; bm_sv=0F9B12B7D58F841C4E53533A19BEAFA6~ssfd+PR2g+SR0RSYjnTeFRM63AO5kUhR9DvuzDAxKgZM2e5CrBJ4ylKhL08LFfSFvncyMxlIBi5NlS5UUO9fOSt7K8O2Sz7d9nlCHeFlcg6O4SgUga5WEE7Xz1EDbtk8j2AaA5B3kaymkF/Nlg8fTv7GzI9a2sefAM/b0tWhNsk=`

  console.info("opts", util.inspect(opts));
  return fetch(url, opts);
};

formateTrip = t =>
  `${t.departure_date} =>  ${t.arrival_date} ${t.cents / 100}.${t.cents %
    100} ${t.currency} ${
    !t.short_unsellable_reason ? "" : t.short_unsellable_reason
  }`;

const main = async () => {
  try {
    const cookie = {};

    // const init = await buildRequest("https://www.trainline.fr/");
    // console.info(
    //   chalk.bgBlue(`Init responsed with a status: ${init.status}`)
    // );
    // if (init.headers.raw()["set-cookie"]) {
    //   cookie.ak_bmsc = extractCookieString(init.headers.raw()["set-cookie"][0]);
    // }

    let sigin = null;

    try {
      sigin = await buildRequest(
        "https://www.trainline.fr/api/v5_1/account/signin",
        `{\"id\":\"1\",\"email\":\"${email}\",\"password\":\"${password}\",\"facebook_id\":null,\"facebook_token\":null,\"google_code\":null,\"concur_auth_code\":null,\"concur_new_email\":null,\"concur_migration_type\":null,\"source\":null,\"correlation_key\":null,\"auth_token\":null,\"user_id\":null}`
      );
    } catch (e) {
      catchFetchError(e);
    }
    console.info(
      chalk.bgBlue(`Signin responsed with a status: ${sigin.status}`)
    );

    const siginBody = await sigin.json();
    // cookie.bm_sv = extractCookieString(sigin.headers.raw()["set-cookie"][0]);
    console.log("headers.raw", util.inspect(sigin.headers.raw()))

    cookie.mobile = "no";
    cookie.eu_business_user = "false";
    cookie.eu_voucher_user = "false";

    const token = siginBody.meta.token;
    let search = null;
    try {
      search = await buildRequest(
        "https://www.trainline.fr/api/v5_1/search",
        `{\"search\":{\"departure_date\":\"${departureTime}\",\"systems\":[\"sncf\"],\"departure_station_id\":\"${departureStationId}\",\"arrival_station_id\":\"${arrivalStationId}\",\"passenger_ids\":[\"${passengerId}\"],\"card_ids\":[\"${cardId}\"]}}`,
        cookie,
        token
      );
    } catch (e) {
      catchFetchError(e);
    }

    console.info(
      chalk.bgBlue(`Search responsed with a status: ${search.status}`)
    );
    console.info(chalk.bgBlue(`statusText: ${search.statusText}`));

    const searchBody = await search.json();

    const trips = searchBody.trips;

    console.info(
      chalk.green(`${searchBody.trips.length} available from the search`)
    );
    searchBody.trips.map(t => console.log(formateTrip(t)));

    const freeFolder = searchBody.folders.filter(
      f => f.cents == 0 && f.is_sellable
    );
    if (freeFolder.length > 0) {
      const folderToBook = freeFolder[0];
      const tripToBook = trips.filter(t => t.id == folderToBook.trip_ids[0])[0];
      console.info(chalk.green("tripToBook"));
      console.info(chalk.green(folderToBook.search_id));
      console.info(chalk.green(folderToBook.id));

      console.info(chalk.green(formateTrip(tripToBook)));

      const book = await buildRequest(
        "https://www.trainline.fr/api/v5_1/book",
        `{\"book\":{\"search_id\":\"${folderToBook.search_id}\",\"outward_folder_id\":\"${folderToBook.id}\",\"options\":{\"${tripToBook.segment_ids[0]}\":{\"comfort_class\":\"pao.default\",\"seat\":\"aisle\"}}}}`,
        cookie,
        token
      );

      console.info(
        chalk.bgBlue(`Book responsed with a status: ${book.status}`)
      );

      if (book.ok) {
        bookBody = await book.json();

        pnrID = bookBody.pnrs[0].id;
        const payment = await buildRequest(
          "https://www.trainline.fr/api/v5_1/payments",
          `{\"payment\":{\"mean\":\"free\",\"cents\":0,\"currency\":\"EUR\",\"holder\":null,\"number\":null,\"expiration_month\":null,\"expiration_year\":null,\"cvv_code\":null,\"nonce\":null,\"paypal_email\":null,\"paypal_first_name\":null,\"paypal_last_name\":null,\"paypal_country\":null,\"device_data\":null,\"status\":null,\"verification_form\":null,\"verification_url\":null,\"can_save_payment_card\":false,\"is_new_customer\":false,\"digitink_value\":null,\"card_form_session\":null,\"pnr_ids\":[\"${pnrID}\"],\"order_id\":null,\"payment_card_id\":null,\"wants_all_marketing\":false}}`,
          cookie,
          token
        );

        console.info(
          chalk.bgBlue(`Payment responsed with a status: ${payment.status}`)
        );
        if (payment.ok) {
          const paymentBody = await payment.json();
          const paymentID = paymentBody.payment.id;

          const confirmation = await buildRequest(
            `https://www.trainline.fr/api/v5_1/payments/${paymentID}/confirm`,
            `{\"payment\":{\"mean\":\"free\",\"cents\":0,\"currency\":\"EUR\",\"holder\":null,\"number\":null,\"expiration_month\":null,\"expiration_year\":null,\"cvv_code\":null,\"nonce\":null,\"paypal_email\":null,\"paypal_first_name\":null,\"paypal_last_name\":null,\"paypal_country\":null,\"device_data\":null,\"status\":null,\"verification_form\":null,\"verification_url\":null,\"can_save_payment_card\":false,\"is_new_customer\":false,\"digitink_value\":null,\"card_form_session\":null,\"pnr_ids\":[\"${pnrID}\"],\"order_id\":null,\"payment_card_id\":null,\"wants_all_marketing\":false}}`,
            cookie,
            token
          );
          console.info(
            chalk.bgBlue(
              `Confirmation responsed with a status: ${confirmation.status}`
            )
          );
          if (confirmation.ok) {
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

            const text = `We have booked a train 🎉\n, you should open the trainline application or go to https://www.trainline.fr/ to see it confirmed`;

            // setup email data with unicode symbols
            let mailOptions = {
              from: `"TGV max robot 🤖" <${sender}>`, // sender address
              to: receiver, // list of receivers
              subject: `Train booked ${formateDate(
                tripToBook.departure_date
              )} >  ${formateDate(
                tripToBook.arrival_date
              )} ${departure} > ${arrival} ✅`, // Subject line
              text: text, // plain text body
              html: text.split("\n").join("\n<br>\n") // html body
            };
            // send mail with defined transport object
            const info = await transporter.sendMail(mailOptions);
            console.info(chalk.magenta(`Message sent: ${info.messageId}`));
          } else {
            console.info(
              chalk.red(
                `Coud not proceed the confirmation, status: ${confirmation.status}`
              )
            );
            const confirmationBody = await confirmation.json();
            console.info(
              chalk.red(`confirmationBody: ${JSON.stringify(confirmationBody)}`)
            );
          }
        } else {
          console.info(
            chalk.red(`Coud not proceed the payment, status: ${payment.status}`)
          );
          const paymentBody = await payment.json();
          console.info(
            chalk.red(`paymentBody: ${JSON.stringify(paymentBody)}`)
          );
        }
      } else {
        console.info(chalk.red(`Coud not book, status: ${book.status}`));
        const bookBody = await book.json();
        console.info(
          chalk.red(`Coud not book, body: ${JSON.stringify(bookBody)}`)
        );
      }
    } else {
      console.info(chalk.red("No train found"));
    }
  } catch (error) {
    console.error(error);
  }
};

main();
