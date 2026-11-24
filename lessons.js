"use strict";

const tones = { sh: "violet", ch: "yellow", ck: "aqua" };
const digraphs = /sh|ch|ck/gi;

function marked(text) {
  return text.replace(digraphs, pair => '<span class="ink-' + tones[pair.toLowerCase()] + '">' + pair + '</span>');
}

function pipe(symbol, tone, words, label = "") {
  return { symbol: symbol.toUpperCase(), audio: symbol, tone, words: words.split(" "), label };
}

const lessons = {
  blends: {
    title: "Blends", description: "Собери слова по сочетаниям согласных",
    instructions: "Прочитай слово и отправь его в нужную трубу. Нажми на заголовок трубы, чтобы услышать сочетание.",
    stages: [
      [pipe("st", "violet", "stop step stem stand stamp best test nest"),
        pipe("sp", "yellow", "spin spot spit span spend spell spill"),
        pipe("bl", "aqua", "blink blot blend blob black block")],
      [pipe("tr", "violet", "trip trap trim trot track trick"),
        pipe("gr", "yellow", "grab grin grip grass grand"),
        pipe("br", "aqua", "brag brat bran brim brick")],
    ],
  },
  digraphs: {
    title: "Digraphs", description: "Найди SH, CH и CK",
    instructions: "Прочитай слово и выбери трубу с его диграфом. Нажми на героя, чтобы услышать звук.",
    stages: [[
      pipe("sh", "violet", "ship shop shut shed shin fish dish wish cash rush", "Шутки"),
      pipe("ch", "yellow", "chip chop chat chin much rich", "Рэп"),
      pipe("ck", "aqua", "back pack sack neck deck pick kick sick lock rock duck luck black block stick track trick brick stack stuck", "Крик Ура!"),
    ]],
  },
  memory: {
    title: "Memory Match", description: "Сопоставь слово и запись",
    instructions: "Открывай карточки. Найди шесть пар из написанного слова и его записи.",
  },
  reading: {
    title: "Read & Check", description: "Прочитай четыре пирамидки",
    reading: [
      { title: "Кот", icon: "🐈‍⬛", tone: "violet", lines: ["Black", "Black cat", "The black cat", "The black cat can", "The black cat can jump."] },
      { title: "Рыба", icon: "🐠", tone: "yellow", lines: ["Fish", "Big fish", "This big fish", "This big fish can", "This big fish can swim."] },
      { title: "Трава", icon: "🌿", tone: "aqua", lines: ["Grass", "The grass", "On the grass", "Sits on the grass", "The black cat sits on the grass."] },
      { title: "Лягушка", icon: "🐸", tone: "pink", lines: ["The frog", "The frog can", "The frog can spin", "The frog can spin on", "The frog can spin on the grass."] },
    ],
  },
  worksheet: { title: "WORKSHEET", description: "Выполни задания и сохрани результат" },
};

const memoryWords = "stick black block track trick shock check chick stack stuck brick fish ship chip duck brush chimp".split(" ");
const recordedWords = new Set("back best big black blend blink blob block blot brag bran brat brick brim can cash cat chat check chick chin chip chop deck dish duck fast fish grab grand grant grass grin grip kick last lock luck much neck nest pack pick rich rock rush sack shed shin ship shock shop shut sick span spell spend spill spin spit spot stack stamp stand stem step stick stop stuck test the this track trap trick trim trip trot wish".split(" "));
