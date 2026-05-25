const fs = require("fs");

function addToJson(filepath, additions) {
  let c = fs.readFileSync(filepath, "utf8");
  for (const [before, after] of additions) {
    c = c.replace(before, after);
  }
  fs.writeFileSync(filepath, c);
  console.log("Updated:", filepath);
}

const ruAdditions = [
  [
    '"landing.faq.items.5.a": "Да. Каталог магазина кэшируется, а сканы сохраняются и отправятся при подключении.",',
    '"landing.faq.items.5.a": "Да. Каталог магазина кэшируется, а сканы сохраняются и отправятся при подключении.",\n  "landing.faq.sidebarText": "Остались вопросы? Напишите нам в Telegram, и мы поможем.",\n  "landing.faq.supportCta": "Написать в поддержку",'
  ],
  [
    '"landing.video.play": "Воспроизвести демо",',
    '"landing.video.play": "Воспроизвести демо",\n  "landing.video.caption": "60 сек",'
  ]
];

const kzAdditions = [
  [
    '"landing.faq.items.5.a": "Иә. Дүкен каталогы кэштеледі, ал скандар сақталады және қосылғанда жіберіледі.",',
    '"landing.faq.items.5.a": "Иә. Дүкен каталогы кэштеледі, ал скандар сақталады және қосылғанда жіберіледі.",\n  "landing.faq.sidebarText": "Сұрақтар қалды ма? Telegram арқылы жазыңыз, біз көмектесеміз.",\n  "landing.faq.supportCta": "Қолдауға жазу",'
  ],
  [
    '"landing.video.play": "Деманы ойнату",',
    '"landing.video.play": "Деманы ойнату",\n  "landing.video.caption": "60 сек",'
  ]
];

addToJson("src/locales/ru/home.json", ruAdditions);
addToJson("src/locales/kz/home.json", kzAdditions);
