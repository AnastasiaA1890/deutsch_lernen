/* ==========================================================================
   Тексты для чтения. Раздел не связан с модулями слов.

   Как добавить свой текст: допиши объект в texts. Все слова текста должны
   быть в gloss — иначе при наведении не будет перевода (проверить можно
   кнопкой «Проверить словарь» в разделе чтения).

     { id, level, topic, title, titleRu, s: [ [немецкий, русский], ... ] }

   gloss: словоформа в нижнем регистре → перевод, который всплывает.
   ========================================================================== */

window.READING = {

gloss: {
  "abend": "вечер (der Abend)", "aber": "но", "acht": "восемь", "alle": "все", "alles": "всё", "alt": "старый",
  "alte": "старый (форма прилагательного)", "am": "в, на (an dem)", "an": "на, у", "anna": "Анна (имя)",
  "antworte": "отвечаю (antworten)", "apfel": "яблоко (der Apfel)", "arbeit": "работа (die Arbeit)",
  "arbeite": "работаю (arbeiten)", "arbeitet": "работает (arbeiten)", "arzt": "врач (der Arzt)",
  "auch": "тоже, также", "auf": "на", "aus": "из", "bahnhof": "вокзал (der Bahnhof)",
  "bahnsteig": "платформа (der Bahnsteig)", "bald": "скоро", "ball": "мяч (der Ball)",
  "baum": "дерево (der Baum)", "beginnt": "начинается (beginnen)", "bekomme": "получаю (bekommen)",
  "berlin": "Берлин", "besser": "лучше", "bestellt": "заказывает (bestellen)", "besuche": "навещаю (besuchen)",
  "bett": "кровать (das Bett)", "bezahle": "плачу (bezahlen)", "bezahlen": "платить",
  "bild": "картина (das Bild)", "bis": "до", "bitte": "пожалуйста", "blau": "синий",
  "blumen": "цветы (die Blumen)", "brauche": "мне нужно (brauchen)", "braun": "коричневый",
  "bringt": "приносит (bringen)", "brot": "хлеб (das Brot)", "bruder": "брат (der Bruder)",
  "buch": "книга (das Buch)", "butter": "масло (die Butter)", "bäume": "деревья (мн. ч. от Baum)",
  "bücher": "книги (мн. ч. от Buch)", "büro": "офис (das Büro)", "café": "кафе (das Café)",
  "da": "тут, на месте", "dann": "потом", "das": "это; артикль среднего рода", "dauert": "длится (dauern)",
  "dazu": "к этому", "dem": "артикль в дательном падеже", "den": "артикль в винительном падеже",
  "der": "артикль мужского рода", "deutsch": "немецкий", "dezember": "декабрь (der Dezember)",
  "die": "артикль женского рода и мн. ч.", "dort": "там", "draußen": "на улице, снаружи", "drei": "три",
  "dreißig": "тридцать", "dritten": "третий (форма)", "dunkel": "тёмный, темно",
  "e-mails": "письма, имейлы (die E-Mails)", "ein": "один; неопределённый артикль",
  "eine": "одна; неопр. артикль", "einem": "неопр. артикль в дательном падеже",
  "einen": "неопр. артикль в винительном падеже", "einer": "неопр. артикль (ж. р., дательный)",
  "eins": "час (о времени); один", "eltern": "родители (die Eltern)", "ende": "конец (das Ende)", "er": "он",
  "es": "оно; безличное «это»", "esse": "ем (essen)", "essen": "есть; еда (das Essen)",
  "euro": "евро (der Euro)", "fahre": "еду (fahren)", "fahren": "ехать, ездить", "falsch": "неправильно",
  "fenster": "окно (das Fenster)", "fertig": "готов", "finde": "нахожу; считаю (finden)",
  "fisch": "рыба (der Fisch)", "fleisch": "мясо (das Fleisch)", "fragt": "спрашивает (fragen)",
  "frankreich": "Франция", "freitag": "пятница (der Freitag)", "freue": "радуюсь (sich freuen)",
  "freund": "друг (der Freund)", "freunde": "друзья (мн. ч.)", "freundin": "подруга (die Freundin)",
  "freundlich": "дружелюбный", "frühling": "весна (der Frühling)", "frühstück": "завтрак (das Frühstück)",
  "fährt": "едет, отправляется (fahren)", "garten": "сад (der Garten)",
  "geburtstag": "день рождения (der Geburtstag)", "gehe": "иду (gehen)", "gehen": "идти",
  "geht": "идёт (gehen)", "gemüse": "овощи (das Gemüse)", "gern": "охотно, с удовольствием",
  "gibt": "даёт; es gibt — имеется (geben)", "grammatik": "грамматика (die Grammatik)",
  "gras": "трава (das Gras)", "groß": "большой", "großen": "большой (форма)", "grün": "зелёный",
  "gut": "хорошо, хороший", "gute": "хороший (форма)", "guten": "хороший (форма); Guten Tag — добрый день",
  "habe": "у меня есть (haben)", "haben": "иметь", "halb": "половина; halb neun — полдевятого",
  "hat": "имеет, у него есть (haben)", "haus": "дом (das Haus)",
  "hausaufgaben": "домашние задания (die Hausaufgaben)", "hause": "дом: nach Hause — домой, zu Hause — дома",
  "heiß": "горячий", "heiße": "меня зовут (heißen)", "heißen": "называться",
  "heißt": "зовут, называется (heißen)", "hell": "светлый", "herrn": "господину (der Herr)",
  "heute": "сегодня", "hier": "здесь", "himmel": "небо (der Himmel)", "hinter": "за, позади",
  "hotel": "отель (das Hotel)", "hund": "собака (der Hund)", "hängt": "висит (hängen)",
  "höre": "слушаю (hören)", "ich": "я", "ihnen": "Вам (вежливое)", "im": "в (in dem)", "immer": "всегда",
  "in": "в", "ins": "в (in das)", "isst": "ест (essen)", "ist": "есть, является (sein)", "italien": "Италия",
  "jahr": "год (das Jahr)", "jahre": "годы (мн. ч.)", "jeden": "каждый (винительный падеж)",
  "juli": "июль (der Juli)", "kaffee": "кофе (der Kaffee)", "kalt": "холодный, холодно",
  "kann": "могу, может (können)", "karte": "меню; карта; карточка (die Karte)",
  "kartoffeln": "картошка (die Kartoffeln)", "kasse": "касса (die Kasse)", "katze": "кошка (die Katze)",
  "kaufe": "покупаю (kaufen)", "keine": "никакой, нет (отрицание)", "kellner": "официант (der Kellner)",
  "kinder": "дети (мн. ч. от Kind)", "kindern": "детям (дательный падеж)", "kirche": "церковь (die Kirche)",
  "klar": "ясный, чётко", "klein": "маленький", "kleinen": "маленький (форма)", "kleiner": "маленький (форма)",
  "klingelt": "звонит (klingeln)", "koffer": "чемодан (der Koffer)", "kollegen": "коллеги (die Kollegen)",
  "kommen": "приходить, приезжать", "kommt": "приходит (kommen)", "kopf": "голова (der Kopf)",
  "kostet": "стоит (kosten)", "kuchen": "пирог (der Kuchen)", "kurz": "коротко, недолго",
  "kurze": "короткий (форма)", "käse": "сыр (der Käse)", "küche": "кухня (die Küche)",
  "lampe": "лампа (die Lampe)", "lang": "длинный", "lange": "долго", "langsam": "медленно", "laufen": "бегать",
  "laut": "громкий, шумный", "lehrer": "учитель (der Lehrer)", "lehrerin": "учительница (die Lehrerin)",
  "leicht": "лёгкий, легко", "leider": "к сожалению", "lena": "Лена (имя)", "lerne": "учу (lernen)",
  "lernt": "учит (lernen)", "lese": "читаю (lesen)", "licht": "свет (das Licht)", "liebe": "люблю (lieben)",
  "lieblingsfarbe": "любимый цвет (die Lieblingsfarbe)", "lieblingszeit": "любимое время (die Lieblingszeit)",
  "liegen": "лежать", "liegt": "лежит, находится (liegen)", "links": "слева", "machen": "делать",
  "macht": "делает (machen)", "mag": "люблю, нравится (mögen)", "marie": "Мари (имя)",
  "markt": "рынок (der Markt)", "mathe": "математика (die Mathe)", "max": "Макс (имя)",
  "meer": "море (das Meer)", "mein": "мой", "meine": "моя, мои", "meinem": "моему (дательный)",
  "meinen": "моего (винительный)", "mich": "меня", "milch": "молоко (die Milch)", "mimi": "Мими (кличка)",
  "mir": "мне", "mit": "с", "mitte": "середина (die Mitte)", "moment": "момент, минута (der Moment)",
  "morgen": "завтра; утро (der Morgen)", "musik": "музыка (die Musik)", "mutter": "мать (die Mutter)",
  "müller": "Мюллер (фамилия)", "nach": "в, после; nach Hause — домой",
  "nachmittag": "вторая половина дня (der Nachmittag)", "nacht": "ночь (die Nacht)", "neben": "рядом с",
  "nehme": "беру (nehmen)", "nett": "милый, приятный", "neun": "девять", "nicht": "не", "noch": "ещё",
  "nur": "только", "nächte": "ночи (мн. ч. от Nacht)", "obst": "фрукты (das Obst)", "oder": "или",
  "oft": "часто", "park": "парк (der Park)", "pause": "перерыв (die Pause)",
  "personen": "человек, лиц (die Personen)", "peter": "Петер (имя)", "platz": "площадь, место (der Platz)",
  "putze": "чищу, убираю (putzen)", "rechts": "справа", "reden": "говорить, разговаривать",
  "regnet": "идёт дождь (regnen)", "reise": "поездка (die Reise); путешествую (reisen)",
  "restaurant": "ресторан (das Restaurant)", "rose": "роза (die Rose)", "rosen": "розы (мн. ч.)",
  "rot": "красный", "rufe": "звоню; anrufen — позвонить", "ruhig": "тихий, спокойный",
  "sagt": "говорит (sagen)", "samstag": "суббота (der Samstag)", "scheint": "светит (scheinen)",
  "schlaf": "спи! (schlafen)", "schlafe": "сплю (schlafen)", "schlange": "очередь (die Schlange)",
  "schläft": "спит (schlafen)", "schmeckt": "вкусный, нравится на вкус (schmecken)",
  "schnee": "снег (der Schnee)", "schon": "уже", "schreibe": "пишу (schreiben)",
  "schule": "школа (die Schule)", "schwarz": "чёрный", "schwimmen": "плавать", "schön": "красивый, хорошо",
  "sechs": "шесть", "see": "озеро (der See)", "sehr": "очень", "seine": "его (притяжательное)",
  "seit": "с (о времени)", "sie": "она; они; Sie — Вы", "sieben": "семь", "sind": "есть, являются (sein)",
  "sitzen": "сидеть", "sitzt": "сидит (sitzen)", "so": "так", "sohn": "сын (der Sohn)",
  "soll": "должен (sollen)", "sommer": "лето (der Sommer)", "sonne": "солнце (die Sonne)",
  "sonntag": "воскресенье (der Sonntag)", "spazieren": "гулять (spazieren gehen)", "spielen": "играть",
  "spielt": "играет (spielen)", "spreche": "говорю (sprechen)", "sprechen": "говорить",
  "spricht": "говорит (sprechen)", "spät": "поздно", "stadt": "город (die Stadt)",
  "stehe": "встаю, стою (stehen; aufstehen — вставать)", "stehen": "стоять", "steht": "стоит (stehen)",
  "stock": "этаж (der Stock)", "straße": "улица (die Straße)", "straßen": "улицы (мн. ч.)",
  "stuhl": "стул (der Stuhl)", "stunde": "час (die Stunde)", "stunden": "часа, часов (мн. ч.)",
  "suche": "ищу (suchen)", "supermarkt": "супермаркет (der Supermarkt)", "suppe": "суп (die Suppe)",
  "tag": "день (der Tag)", "tage": "дни (мн. ч.)", "tee": "чай (der Tee)", "telefon": "телефон (das Telefon)",
  "telefoniere": "говорю по телефону (telefonieren)", "texte": "тексты (die Texte)",
  "ticket": "билет (das Ticket)", "tisch": "стол (der Tisch)", "treffen": "встречать(ся)",
  "trinke": "пью (trinken)", "trinken": "пить", "trinkt": "пьёт (trinken)",
  "tut": "делает; tut weh — болит (tun)", "uhr": "час; часы (die Uhr)", "um": "в (о времени)", "und": "и",
  "uns": "нас, нам; uns treffen — встречаться", "unter": "под",
  "unterricht": "уроки, занятия (der Unterricht)", "vater": "отец (der Vater)", "viel": "много",
  "viele": "многие, много", "vielleicht": "возможно", "vier": "четыре", "visum": "виза (das Visum)",
  "wachsen": "расти", "wagen": "тележка; машина (der Wagen)", "wand": "стена (die Wand)",
  "warm": "тёплый, тепло", "warte": "жду (warten)", "warten": "ждать", "wasche": "стираю, мою (waschen)",
  "wasser": "вода (das Wasser)", "weh": "больно: weh tun — болеть", "weihnachten": "Рождество",
  "wein": "вино (der Wein)", "weiß": "белый", "wenig": "мало; ein wenig — немного",
  "werde": "стану; мне исполняется (werden)", "wetter": "погода (das Wetter)", "wie": "как", "wieder": "снова",
  "winter": "зима (der Winter)", "wir": "мы", "wochenende": "выходные (das Wochenende)",
  "wohne": "живу (wohnen)", "wohnen": "жить", "wohnung": "квартира (die Wohnung)",
  "wäsche": "бельё (die Wäsche)", "wörter": "слова (мн. ч. от Wort)", "zehn": "десять",
  "zimmer": "комната (das Zimmer)", "zu": "слишком; к, в", "zucker": "сахар (der Zucker)", "zuerst": "сначала",
  "zug": "поезд (der Zug)", "zum": "к, в (zu dem)", "zur": "к, в (zu der)", "zusammen": "вместе",
  "zwanzig": "двадцать", "zwei": "два", "zwölf": "двенадцать", "zähne": "зубы (мн. ч. от Zahn)",
  "äpfel": "яблоки (мн. ч. от Apfel)", "öffnet": "открывается (öffnen)", "über": "над, о"
},

texts: [
  { id: "t01", level: "A1", topic: "Повседневность",
    title: "Mein Tag", titleRu: "Мой день", s: [
      ["Ich heiße Lena.", "Меня зовут Лена."],
      ["Ich wohne in Berlin.", "Я живу в Берлине."],
      ["Am Morgen trinke ich Kaffee.", "Утром я пью кофе."],
      ["Dann fahre ich zur Arbeit.", "Потом я еду на работу."],
      ["Am Abend lese ich ein Buch.", "Вечером я читаю книгу."],
      ["Um zehn Uhr schlafe ich.", "В десять часов я сплю."]
    ] },
  { id: "t02", level: "A1", topic: "Семья",
    title: "Meine Familie", titleRu: "Моя семья", s: [
      ["Wir sind vier Personen.", "Нас четверо."],
      ["Mein Vater heißt Peter.", "Моего отца зовут Петер."],
      ["Meine Mutter arbeitet in einem Büro.", "Моя мама работает в офисе."],
      ["Mein Bruder ist noch klein.", "Мой брат ещё маленький."],
      ["Wir wohnen zusammen in einem Haus.", "Мы живём вместе в одном доме."],
      ["Am Sonntag essen wir immer zusammen.", "В воскресенье мы всегда едим вместе."]
    ] },
  { id: "t03", level: "A1", topic: "Еда",
    title: "Im Café", titleRu: "В кафе", s: [
      ["Ich gehe gern ins Café.", "Я люблю ходить в кафе."],
      ["Das Café ist klein und schön.", "Кафе маленькое и красивое."],
      ["Ich trinke einen Kaffee mit Zucker.", "Я пью кофе с сахаром."],
      ["Meine Freundin trinkt Tee.", "Моя подруга пьёт чай."],
      ["Der Kuchen kostet drei Euro.", "Пирог стоит три евро."],
      ["Wir sitzen dort eine Stunde.", "Мы сидим там час."]
    ] },
  { id: "t04", level: "A1", topic: "Дом",
    title: "Meine Wohnung", titleRu: "Моя квартира", s: [
      ["Meine Wohnung ist nicht groß.", "Моя квартира небольшая."],
      ["Sie hat zwei Zimmer und eine Küche.", "В ней две комнаты и кухня."],
      ["Im Zimmer stehen ein Tisch und ein Bett.", "В комнате стоят стол и кровать."],
      ["Die Lampe ist alt, aber schön.", "Лампа старая, но красивая."],
      ["Das Fenster ist groß.", "Окно большое."],
      ["Ich wohne hier sehr gern.", "Мне очень нравится здесь жить."]
    ] },
  { id: "t05", level: "A1", topic: "Город",
    title: "Einkaufen", titleRu: "Покупки", s: [
      ["Heute kaufe ich Brot und Käse.", "Сегодня я покупаю хлеб и сыр."],
      ["Der Supermarkt ist neben dem Park.", "Супермаркет рядом с парком."],
      ["Die Milch kostet einen Euro.", "Молоко стоит один евро."],
      ["Ich nehme auch Äpfel.", "Я беру ещё и яблоки."],
      ["An der Kasse warte ich kurz.", "У кассы я немного жду."],
      ["Dann gehe ich nach Hause.", "Потом я иду домой."]
    ] },
  { id: "t06", level: "A1", topic: "Природа",
    title: "Das Wetter", titleRu: "Погода", s: [
      ["Heute ist das Wetter schön.", "Сегодня хорошая погода."],
      ["Die Sonne scheint.", "Светит солнце."],
      ["Es ist warm, aber nicht heiß.", "Тепло, но не жарко."],
      ["Morgen regnet es vielleicht.", "Завтра, возможно, будет дождь."],
      ["Im Winter ist es hier sehr kalt.", "Зимой здесь очень холодно."],
      ["Ich mag den Sommer.", "Я люблю лето."]
    ] },
  { id: "t07", level: "A1", topic: "Животные",
    title: "Mein Hund", titleRu: "Моя собака", s: [
      ["Mein Hund heißt Max.", "Мою собаку зовут Макс."],
      ["Er ist braun und sehr freundlich.", "Он коричневый и очень дружелюбный."],
      ["Jeden Tag laufen wir im Park.", "Каждый день мы бегаем в парке."],
      ["Max spielt gern mit dem Ball.", "Макс любит играть с мячом."],
      ["Am Abend schläft er neben meinem Bett.", "Вечером он спит рядом с моей кроватью."],
      ["Ich liebe meinen Hund.", "Я люблю свою собаку."]
    ] },
  { id: "t08", level: "A1", topic: "Город",
    title: "In der Stadt", titleRu: "В городе", s: [
      ["Ich wohne in einer kleinen Stadt.", "Я живу в маленьком городе."],
      ["Die Stadt hat einen Park und einen Bahnhof.", "В городе есть парк и вокзал."],
      ["Auf dem Platz steht eine alte Kirche.", "На площади стоит старая церковь."],
      ["Die Straßen sind ruhig.", "Улицы тихие."],
      ["Am Wochenende gibt es einen Markt.", "По выходным здесь рынок."],
      ["Ich finde meine Stadt schön.", "Я считаю свой город красивым."]
    ] },
  { id: "t09", level: "A1", topic: "Путешествия",
    title: "Am Bahnhof", titleRu: "На вокзале", s: [
      ["Der Bahnhof ist groß und laut.", "Вокзал большой и шумный."],
      ["Mein Zug fährt um acht Uhr.", "Мой поезд отправляется в восемь часов."],
      ["Ich kaufe ein Ticket.", "Я покупаю билет."],
      ["Das Ticket kostet zwanzig Euro.", "Билет стоит двадцать евро."],
      ["Ich warte auf dem Bahnsteig.", "Я жду на платформе."],
      ["Die Reise dauert zwei Stunden.", "Поездка длится два часа."]
    ] },
  { id: "t10", level: "A1", topic: "Работа",
    title: "Im Büro", titleRu: "В офисе", s: [
      ["Ich arbeite in einem Büro.", "Я работаю в офисе."],
      ["Das Büro ist im dritten Stock.", "Офис на третьем этаже."],
      ["Ich schreibe E-Mails und telefoniere viel.", "Я пишу письма и много говорю по телефону."],
      ["Meine Kollegen sind nett.", "Мои коллеги милые."],
      ["Um zwölf Uhr machen wir Pause.", "В двенадцать часов у нас перерыв."],
      ["Am Freitag arbeite ich nur bis drei.", "В пятницу я работаю только до трёх."]
    ] },
  { id: "t11", level: "A1", topic: "Еда",
    title: "Frühstück", titleRu: "Завтрак", s: [
      ["Ich stehe um sieben Uhr auf.", "Я встаю в семь часов."],
      ["Zum Frühstück esse ich Brot mit Käse.", "На завтрак я ем хлеб с сыром."],
      ["Dazu trinke ich einen Tee.", "К этому я пью чай."],
      ["Mein Bruder isst nur einen Apfel.", "Мой брат ест только яблоко."],
      ["Wir reden über den Tag.", "Мы говорим о предстоящем дне."],
      ["Das Frühstück dauert nicht lange.", "Завтрак длится недолго."]
    ] },
  { id: "t12", level: "A1", topic: "Люди",
    title: "Meine Freundin", titleRu: "Моя подруга", s: [
      ["Meine Freundin heißt Marie.", "Мою подругу зовут Мари."],
      ["Sie kommt aus Frankreich.", "Она из Франции."],
      ["Marie lernt Deutsch wie ich.", "Мари учит немецкий, как и я."],
      ["Sie spricht schon sehr gut.", "Она уже очень хорошо говорит."],
      ["Wir treffen uns oft im Café.", "Мы часто встречаемся в кафе."],
      ["Dann reden wir zusammen Deutsch.", "И тогда мы вместе говорим по-немецки."]
    ] },
  { id: "t13", level: "A1", topic: "Природа",
    title: "Der Park", titleRu: "Парк", s: [
      ["Neben meinem Haus ist ein Park.", "Рядом с моим домом есть парк."],
      ["Dort stehen viele alte Bäume.", "Там растёт много старых деревьев."],
      ["Im Sommer sind die Rosen rot und weiß.", "Летом розы красные и белые."],
      ["Kinder spielen auf dem Gras.", "Дети играют на траве."],
      ["Ein kleiner See liegt in der Mitte.", "Посередине лежит маленькое озеро."],
      ["Ich gehe dort jeden Abend spazieren.", "Я гуляю там каждый вечер."]
    ] },
  { id: "t14", level: "A1", topic: "Учёба",
    title: "Deutsch lernen", titleRu: "Учу немецкий", s: [
      ["Ich lerne seit einem Jahr Deutsch.", "Я учу немецкий уже год."],
      ["Die Grammatik ist nicht leicht.", "Грамматика непростая."],
      ["Jeden Tag lerne ich zehn Wörter.", "Каждый день я учу десять слов."],
      ["Mein Lehrer spricht langsam und klar.", "Мой учитель говорит медленно и чётко."],
      ["Ich lese kurze Texte und höre Musik.", "Я читаю короткие тексты и слушаю музыку."],
      ["Bald spreche ich besser.", "Скоро я буду говорить лучше."]
    ] },
  { id: "t15", level: "A1", topic: "Здоровье",
    title: "Beim Arzt", titleRu: "У врача", s: [
      ["Heute gehe ich zum Arzt.", "Сегодня я иду к врачу."],
      ["Mein Kopf tut weh.", "У меня болит голова."],
      ["Der Arzt fragt: Wie geht es Ihnen?", "Врач спрашивает: как вы себя чувствуете?"],
      ["Ich antworte: Nicht so gut.", "Я отвечаю: не очень хорошо."],
      ["Er sagt, ich soll viel Wasser trinken.", "Он говорит, что мне нужно много пить воды."],
      ["Am Abend geht es mir besser.", "Вечером мне становится лучше."]
    ] },
  { id: "t16", level: "A1", topic: "Повседневность",
    title: "Am Wochenende", titleRu: "В выходные", s: [
      ["Am Samstag stehe ich spät auf.", "В субботу я встаю поздно."],
      ["Ich putze die Wohnung und wasche Wäsche.", "Я убираю квартиру и стираю бельё."],
      ["Am Nachmittag besuche ich meine Eltern.", "После обеда я навещаю родителей."],
      ["Wir trinken Kaffee und reden lange.", "Мы пьём кофе и долго разговариваем."],
      ["Am Sonntag lese ich oder schlafe.", "В воскресенье я читаю или сплю."],
      ["Das Wochenende ist zu kurz.", "Выходные слишком короткие."]
    ] },
  { id: "t17", level: "A1", topic: "Животные",
    title: "Meine Katze", titleRu: "Моя кошка", s: [
      ["Meine Katze heißt Mimi.", "Мою кошку зовут Мими."],
      ["Sie ist klein und weiß.", "Она маленькая и белая."],
      ["Am Tag schläft sie viel.", "Днём она много спит."],
      ["Am Abend spielt sie mit dem Ball.", "Вечером она играет с мячом."],
      ["Mimi trinkt Milch und isst Fisch.", "Мими пьёт молоко и ест рыбу."],
      ["Sie sitzt gern am Fenster.", "Она любит сидеть у окна."]
    ] },
  { id: "t18", level: "A1", topic: "Природа",
    title: "Der Sommer", titleRu: "Лето", s: [
      ["Der Sommer ist meine Lieblingszeit.", "Лето — моё любимое время."],
      ["Die Tage sind lang und warm.", "Дни длинные и тёплые."],
      ["Wir fahren oft an den See.", "Мы часто ездим на озеро."],
      ["Dort schwimmen wir und liegen in der Sonne.", "Там мы плаваем и лежим на солнце."],
      ["Am Abend essen wir draußen.", "Вечером мы едим на улице."],
      ["Der Himmel ist blau und klar.", "Небо синее и ясное."]
    ] },
  { id: "t19", level: "A1", topic: "Природа",
    title: "Der Winter", titleRu: "Зима", s: [
      ["Im Winter ist es kalt und dunkel.", "Зимой холодно и темно."],
      ["Oft liegt Schnee auf der Straße.", "На улице часто лежит снег."],
      ["Die Kinder spielen im Schnee.", "Дети играют в снегу."],
      ["Ich trinke heißen Tee zu Hause.", "Я пью горячий чай дома."],
      ["Die Nächte sind sehr lang.", "Ночи очень длинные."],
      ["Im Dezember warten alle auf Weihnachten.", "В декабре все ждут Рождества."]
    ] },
  { id: "t20", level: "A1", topic: "Еда",
    title: "Im Restaurant", titleRu: "В ресторане", s: [
      ["Wir gehen heute ins Restaurant.", "Сегодня мы идём в ресторан."],
      ["Der Kellner bringt die Karte.", "Официант приносит меню."],
      ["Ich nehme Suppe und Fisch.", "Я возьму суп и рыбу."],
      ["Mein Freund bestellt Fleisch mit Kartoffeln.", "Мой друг заказывает мясо с картошкой."],
      ["Das Essen schmeckt sehr gut.", "Еда очень вкусная."],
      ["Am Ende bezahlen wir zusammen.", "В конце мы платим вместе."]
    ] },
  { id: "t21", level: "A1", topic: "Повседневность",
    title: "Die Uhrzeit", titleRu: "Который час", s: [
      ["Wie spät ist es?", "Который час?"],
      ["Es ist halb neun.", "Половина девятого."],
      ["Um neun Uhr beginnt die Arbeit.", "В девять часов начинается работа."],
      ["Die Pause ist um eins.", "Перерыв в час."],
      ["Um sechs Uhr gehe ich nach Hause.", "В шесть часов я иду домой."],
      ["Meine Uhr geht leider falsch.", "Мои часы, к сожалению, идут неправильно."]
    ] },
  { id: "t22", level: "A1", topic: "Общение",
    title: "Telefonieren", titleRu: "Разговор по телефону", s: [
      ["Das Telefon klingelt.", "Звонит телефон."],
      ["Guten Tag, hier ist Anna.", "Добрый день, это Анна."],
      ["Kann ich bitte mit Herrn Müller sprechen?", "Могу я поговорить с господином Мюллером?"],
      ["Einen Moment, bitte.", "Одну минуту, пожалуйста."],
      ["Er ist heute leider nicht da.", "Его сегодня, к сожалению, нет."],
      ["Dann rufe ich morgen wieder an.", "Тогда я позвоню завтра снова."]
    ] },
  { id: "t23", level: "A1", topic: "Слова",
    title: "Die Farben", titleRu: "Цвета", s: [
      ["Meine Lieblingsfarbe ist blau.", "Мой любимый цвет — синий."],
      ["Der Himmel ist blau, das Gras ist grün.", "Небо синее, трава зелёная."],
      ["Die Rose im Garten ist rot.", "Роза в саду красная."],
      ["Mein Hund ist braun.", "Моя собака коричневая."],
      ["Im Winter ist alles weiß.", "Зимой всё белое."],
      ["Die Nacht ist schwarz.", "Ночь чёрная."]
    ] },
  { id: "t24", level: "A1", topic: "Дом",
    title: "Mein Zimmer", titleRu: "Моя комната", s: [
      ["Mein Zimmer ist klein, aber hell.", "Моя комната маленькая, но светлая."],
      ["Links steht mein Bett.", "Слева стоит моя кровать."],
      ["Rechts sind ein Tisch und ein Stuhl.", "Справа стол и стул."],
      ["Auf dem Tisch liegen viele Bücher.", "На столе лежит много книг."],
      ["An der Wand hängt ein Bild.", "На стене висит картина."],
      ["Hier lerne und schlafe ich.", "Здесь я учусь и сплю."]
    ] },
  { id: "t25", level: "A1", topic: "Праздники",
    title: "Der Geburtstag", titleRu: "День рождения", s: [
      ["Heute habe ich Geburtstag.", "Сегодня у меня день рождения."],
      ["Ich werde dreißig Jahre alt.", "Мне исполняется тридцать лет."],
      ["Meine Freunde kommen am Abend.", "Мои друзья придут вечером."],
      ["Wir essen Kuchen und trinken Wein.", "Мы едим пирог и пьём вино."],
      ["Ich bekomme ein Buch und Blumen.", "Я получаю книгу и цветы."],
      ["Der Tag ist sehr schön.", "День очень хороший."]
    ] },
  { id: "t26", level: "A1", topic: "Путешествия",
    title: "Die Reise", titleRu: "Путешествие", s: [
      ["Im Juli fahre ich nach Italien.", "В июле я еду в Италию."],
      ["Ich reise gern mit dem Zug.", "Я люблю путешествовать поездом."],
      ["Mein Koffer ist schon fertig.", "Мой чемодан уже готов."],
      ["Ich brauche mein Visum und mein Ticket.", "Мне нужны виза и билет."],
      ["Das Hotel liegt am Meer.", "Отель находится у моря."],
      ["Ich freue mich sehr.", "Я очень рад."]
    ] },
  { id: "t27", level: "A1", topic: "Город",
    title: "Im Supermarkt", titleRu: "В супермаркете", s: [
      ["Der Supermarkt öffnet um acht Uhr.", "Супермаркет открывается в восемь часов."],
      ["Ich nehme einen Wagen.", "Я беру тележку."],
      ["Zuerst kaufe ich Obst und Gemüse.", "Сначала я покупаю фрукты и овощи."],
      ["Dann suche ich Milch und Butter.", "Потом я ищу молоко и масло."],
      ["An der Kasse ist heute keine Schlange.", "На кассе сегодня нет очереди."],
      ["Ich bezahle mit Karte.", "Я плачу картой."]
    ] },
  { id: "t28", level: "A1", topic: "Природа",
    title: "Der Garten", titleRu: "Сад", s: [
      ["Hinter dem Haus haben wir einen Garten.", "За домом у нас есть сад."],
      ["Dort wachsen Äpfel und Rosen.", "Там растут яблоки и розы."],
      ["Mein Vater arbeitet gern im Garten.", "Мой отец любит работать в саду."],
      ["Im Frühling ist alles grün.", "Весной всё зелёное."],
      ["Wir sitzen oft unter dem großen Baum.", "Мы часто сидим под большим деревом."],
      ["Am Abend ist es dort sehr ruhig.", "Вечером там очень тихо."]
    ] },
  { id: "t29", level: "A1", topic: "Учёба",
    title: "Die Schule", titleRu: "Школа", s: [
      ["Mein Sohn geht in die Schule.", "Мой сын ходит в школу."],
      ["Der Unterricht beginnt um acht Uhr.", "Уроки начинаются в восемь часов."],
      ["Er lernt Deutsch, Mathe und Musik.", "Он учит немецкий, математику и музыку."],
      ["Seine Lehrerin ist sehr nett.", "Его учительница очень милая."],
      ["In der Pause spielt er mit den Kindern.", "На перемене он играет с детьми."],
      ["Am Nachmittag macht er Hausaufgaben.", "После обеда он делает домашние задания."]
    ] },
  { id: "t30", level: "A1", topic: "Повседневность",
    title: "Gute Nacht", titleRu: "Спокойной ночи", s: [
      ["Es ist zehn Uhr am Abend.", "Десять часов вечера."],
      ["Ich putze die Zähne.", "Я чищу зубы."],
      ["Dann lese ich noch ein wenig.", "Потом я ещё немного читаю."],
      ["Das Licht im Zimmer ist warm.", "Свет в комнате тёплый."],
      ["Draußen ist es ruhig und dunkel.", "На улице тихо и темно."],
      ["Gute Nacht und schlaf gut!", "Спокойной ночи и хорошего сна!"]
    ] }
]
};
