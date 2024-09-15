// 新标签打开网页
$("#store_home").click(() => {
  chrome.tabs.create({ url: "http://127.0.0.1:8123" });
});

document.addEventListener(
  "DOMContentLoaded",
  function () {
    // 获取采集模板
    var template = -1;
    var scrapeTwice = 'N'
    document
      .getElementById("templates")
      .addEventListener("change", function () {
        template = this.value;
      });

    document
      .getElementById("scrape-twice")
      .addEventListener("change", function () {
        scrapeTwice = this.value;
      });

    var scrapeFilter = ""
    const scrapeFilterTxt = document.getElementById("scrape-filter")
    scrapeFilterTxt.addEventListener('blur', function () {
      scrapeFilter = scrapeFilterTxt.value
    });

    var scrapePages = 0
    const scrapePagesTxt = document.getElementById("scrape-pages")
    scrapePagesTxt.addEventListener('blur', function () {
      scrapePages = scrapePagesTxt.value
    });

    var scrapeFrom = 0
    const scrapeFromTxt = document.getElementById("scrape-from")
    scrapeFromTxt.addEventListener('blur', function () {
      scrapeFrom = scrapeFromTxt.value
    });

    // 先从本地存储中获取scrape-key的值，并赋值给scrape-key控件
    var apiKey = "";
    chrome.storage.sync.get(["scrapeKey"], function (result) {
      if (result.scrapeKey == "" || result.scrapeKey == undefined) {
        result.scrapeKey = "";
      }
      document.getElementById("scrape-key").value = result.scrapeKey;
      apiKey = result.scrapeKey;
    });

    // 给scrape-key绑定失去焦点事件，并获取当前控件的值保存到本地存储
    document.getElementById("scrape-key").addEventListener("blur", function () {
      chrome.storage.sync.set({ scrapeKey: this.value }, function () {
        console.log("保存成功");
      });
    });

    function buildTemplates() {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "http://127.0.0.1:8080/template/query", true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
          var xhrData = JSON.parse(xhr.responseText);
          var options = xhrData.result.list;
          var selectElement = document.getElementById("templates");
          for (var i = 0; i < options.length; i++) {
            var optionElement = document.createElement("option");
            optionElement.value = options[i].ID;
            optionElement.text = options[i].title;
            selectElement.appendChild(optionElement);
          }
        }
      };
      xhr.send();
    }
    buildTemplates();

    // 立即抓取
    var scrapeNowBtn = document.getElementById("scrapeNow");
    // 点击浏览器插件获取cookie
    var comCookies = "";
    var usCookies = "";
    var babaCookies = "";
    var amazonCookies = "";
    chrome.tabs.query(
      { active: true, windowId: chrome.windows.WINDOW_ID_CURRENT },
      function (tabs) {
        chrome.cookies.getAll(
          {
            domain: ".aliexpress.com",
          },
          (cookies) => {
            comCookies = cookies.map((c) => c.name + "=" + c.value).join(";");
          }
        );
        chrome.cookies.getAll(
          {
            domain: ".aliexpress.us",
          },
          (cookies) => {
            usCookies = cookies.map((c) => c.name + "=" + c.value).join(";");
          }
        );
        chrome.cookies.getAll(
          {
            domain: ".1688.com",
          },
          (cookies) => {
            babaCookies = cookies.map((c) => c.name + "=" + c.value).join(";");
          }
        );
        chrome.cookies.getAll(
          {
            domain: ".tmall.com",
          },
          (cookies) => {
            babaCookies = JSON.stringify(cookies);
          }
        );
        chrome.cookies.getAll(
          {
            domain: ".amazon.com",
          },
          (cookies) => {
            // cookies 是一个数组，转化为json字符串
            amazonCookies = JSON.stringify(cookies);
            console.log(amazonCookies);
          }
        );
      }
    );

    scrapeNowBtn.addEventListener(
      "click",
      function () {
        async function scrapeDom(
          apiKey,
          template,
          comCookies,
          usCookies,
          babaCookies,
          amazonCookies,
          scrapeFilters,
          scrapePages,
          scrapeFrom,
          scrapeTwice
        ) {
          const currentUrl = window.location.href;
          console.log("站点:", currentUrl)
          let support_site = false;
          if (
            currentUrl.includes("1688") ||
            currentUrl.includes("aliexpress") ||
            currentUrl.includes("amazon") ||
            currentUrl.includes(".tmall.com")
          ) {
            support_site = true
          }
          if (!support_site) {
            window.alert("不支持抓取该站点");
            return;
          }
          if (
            template == -1 ||
            template == undefined ||
            template === undefined
          ) {
            window.alert("请选择采集模板");
            return;
          }

          var local_cookies = "";
          var rec_url = "";
          if (window.location.href.indexOf("aliexpress.com") > 1) {
            local_cookies = comCookies;
            rec_url = "http://127.0.0.1:8080/product/rec";
          }
          if (window.location.href.indexOf("aliexpress.us") > 1) {
            local_cookies = usCookies;
            rec_url = "http://127.0.0.1:8080/product/rec";
          }
          if (currentUrl.includes("1688") || currentUrl.includes(".tmall")) {
            local_cookies = babaCookies;
            rec_url = "http://127.0.0.1:8012/save_init_product";
          }
          if (currentUrl.includes("amazon")) {
            local_cookies = amazonCookies;
            rec_url = "http://127.0.0.1:8012/save_init_product";
          }

          var xmlHttp = new XMLHttpRequest();
          if (xmlHttp != null) {
            xmlHttp.open("POST", rec_url);
            xmlHttp.setRequestHeader(
              "Content-Type",
              "application/json;charset=UTF-8"
            );
            xmlHttp.setRequestHeader("Api-Key", apiKey);
            // 为XMLHttpRequest设置请求头
            xmlHttp.onreadystatechange = function () {
              if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
              }
            };
            xmlHttp.send(
              JSON.stringify({
                itemUrl: encodeURIComponent(window.location.href),
                itemStatus: "待采集",
                scrapeTemplate: template,
                cookies: local_cookies,
                filter: scrapeFilters,
                scrapePages: scrapePages,
                scrapeFrom: scrapeFrom,
                scrapeTwice: scrapeTwice
              })
            );
          } else {
            console.log("不支持该浏览器！");
          }
          window.alert("采集成功！");
        }

        // scrapeDom(apiKey, template, comCookies, usCookies, babaCookies, amazonCookies, scrapeFilter, scrapeFrom)

        chrome.tabs.executeScript(
          {
            code:
              "(" +
              scrapeDom +
              ")('" +
              apiKey +
              "','" +
              template +
              "', '" +
              comCookies +
              "', '" +
              usCookies +
              "', '" +
              babaCookies +
              "', '" +
              amazonCookies +
              "', '" +
              scrapeFilter +
              "', '" +
              scrapePages +
              "', '" +
              scrapeFrom +
              "', '" +
              scrapeTwice +
              "');",
          },
          function (result) {
            // window.alert("抓取成功！");
          }
        );
      },
      false
    );
  },
  false
);
