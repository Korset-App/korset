const fs = require("fs");

function patchHomeJson(filepath, additions) {
  let c = fs.readFileSync(filepath, "utf8");
  for (const [trigger, newLine] of additions) {
    c = c.replace(trigger, trigger + "\n" + newLine);
  }
  fs.writeFileSync(filepath, c);
  console.log("Patched:", filepath);
}

const ruAdds = [
  [
    '  "landing.faq.items.5.a": "Да. Каталог магазина кэшируется, а сканы сохраняются и отправятся при подключении.",',
    '  "landing.faq.sidebarText": "Остались вопросы? Напишите нам в Telegram, и мы поможем.",\n  "landing.faq.supportCta": "Написать в поддержку",'
  ],
  [
    '  "landing.video.play": "Воспроизвести демо",',
    '  "landing.video.caption": "60 сек",'
  ]
];

const kzAdds = [
  [
    '  "landing.faq.items.5.a": "Иә. Дүкен каталогы кэштеледі, ал скандар сақталады және қосылғанда жіберіледі.",',
    '  "landing.faq.sidebarText": "Сұрақтар қалды ма? Telegram арқылы жазыңыз, біз көмектесеміз.",\n  "landing.faq.supportCta": "Қолдауға жазу",'
  ],
  [
    '  "landing.video.play": "Демоны қосу",',
    '  "landing.video.caption": "60 сек",'
  ]
];

patchHomeJson("src/locales/ru/home.json", ruAdds);
patchHomeJson("src/locales/kz/home.json", kzAdds);
