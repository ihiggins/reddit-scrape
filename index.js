const request = require("request");
const cheerio = require("cheerio");
const async = require("async");
const fs = require("fs");
const baseUrl = "http://redditlist.com/{category}";

var scrapeNames = () => {
  let category = "all";
  var requestUrl = baseUrl.replace("{category}", category);

  let startPage = 0;
  let lastPage = 41;
  var callbackPool = lastPage;
  let subredditList = [];

  return new Promise((resolve, reject) => {
    for (var i = startPage; i < lastPage; i++) {
      request(
        {
          uri: requestUrl,
          qs: {
            page: i,
          },
        },
        function (err, response, body) {
          if (err) {
            console.error(err);
          }
          let $ = cheerio.load(body);
          var listing = $($(".span4.listing")[1]).children(".listing-item");
          for (var i = 0; i < listing.length; i++) {
            subredditList.push($(listing[i]).data());
          }
          --callbackPool;
          if (callbackPool <= 0) {
            resolve(subredditList);
          }
        }
      );
    }
  });
};

var getOverlayData = (subreddits) => {
  var data = {};
  let overlayurl = "http://redditlist.com/getoverlaydata";
  async.parallelLimit(
    subreddits.map(function (subreddit) {
      return function (callback) {
        request(
          {
            method: "POST",
            uri: overlayurl,
            form: {
              subreddit: subreddit.targetSubreddit,
              adultfilter: subreddit.targetFilter,
            },
          },
          function (error, response, body) {
            try {
              if (body) {
                var test = JSON.parse(body);
                data[subreddit.targetSubreddit] = JSON.parse(test[0]);
              }
            } catch (error) {}

            callback(undefined, response);
          }
        );
      };
    }),
    20,
    function (error, results) {
      console.log(results.length);
      fs.writeFileSync("data-out.json", JSON.stringify(data, null, 4));
      console.log("Wrote to data-out.json");
    }
  );
};

var main = async () => {
  scrapeNames().then((data) => {
    console.log("Names Scraped.");
    getOverlayData(data);
  });
};

main();
