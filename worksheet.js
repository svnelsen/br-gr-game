"use strict";

const circleWords = "chip fish duck shop check chimp brush black ship lunch".split(" ");
const groupWords = "chip fish duck shop brick chimp brush black ship lunch shed kick".split(" ");
const pictureWords = [
  ["chimp", "🐵", "Шимпанзе"], ["fish", "🐠", "Рыба"], ["duck", "🦆", "Утка"],
  ["ship", "🚢", "Корабль"], ["brush", "🪥", "Щётка"], ["brick", "🧱", "Кирпич"],
];
const snakeText = "chickintheshedcankicktheshrimp";
const upperPairs = ["ch", "sh", "ck"];
const taskTitles = [
  "Прочитай слова и выдели ch, sh, ck",
  "Распредели слова по группам",
  "Прослушай слово и выбери буквосочетание",
  "Соедини большие и маленькие буквосочетания",
  "Найди и выдели в змейке все ch, sh, ck",
];
const answerAt = text => [...text.matchAll(digraphs)].map(match => match.index);
const groupOf = word => word.match(digraphs)[0];
const taskTotals = [circleWords.flatMap(answerAt).length, groupWords.length, pictureWords.length, upperPairs.length, answerAt(snakeText).length];
let worksheet;

function freshWorksheet() {
  return { circle: [], groups: [], listen: [], pairs: [], snake: [], name: "" };
}

function openWorksheet() {
  worksheet = { data: saved.sheet || freshWorksheet(), pair: "", group: "" };
  drawWorksheet();
}

function closeWorksheet() {
  worksheet = undefined;
}

function letters(text, found, key, snake = false) {
  let output = "";
  for (let index = 0; index < text.length; index++) {
    const won = found.includes(key + index);
    const part = text.slice(index, index + (won ? 2 : 1));
    output += '<button class="letter' + (won ? ' ink-' + tones[part] : '') + '" data-find="' + key +
      index + '"' + (won ? ' disabled' : '') + '>' + part + '</button>';
    if (won) index++;
  }
  return '<span class="' + (snake ? "snake-letters" : "letter-word") + '" lang="en">' + output + '</span>';
}

function speaker(word) {
  return '<button class="ws-speaker" data-ws-play="' + word + '" aria-label="Послушать ' + word + '">🔊</button>';
}

function groupBoard(data) {
  return '<p class="ws-hint">Нажми на слово, а потом на группу. Можно перетащить слово.</p><div class="group-tray">' +
    groupWords.filter(word => !data.groups.includes(word)).map(word =>
      '<div class="group-word"><button class="ws-word" draggable="true" data-group-word="' + word + '" aria-pressed="' +
      (worksheet.group === word) + '">' + word + '</button>' + speaker(word) + '</div>'
    ).join("") + '</div><div class="groups">' + upperPairs.map(pair =>
      '<div class="group-bin ink-' + tones[pair] + '" data-ws-drop="' + pair + '">' +
      '<button data-group-target="' + pair + '" class="group-target">' + pair.toUpperCase() + '</button>' +
      groupWords.filter(word => data.groups.includes(word) && groupOf(word) === pair)
        .map(word => '<span class="group-word" lang="en">' + word + speaker(word) + '</span>').join("") + '</div>'
    ).join("") + '</div>';
}

function pictureBoard(data) {
  return '<div class="pictures">' + pictureWords.map(([word, icon, label]) =>
    '<article class="picture-card"><button class="picture" data-ws-play="' + word + '" aria-label="' + label +
    ' · послушать слово"><span aria-hidden="true">' + icon + '</span><span aria-hidden="true">🔊</span></button>' +
    '<div class="choices">' + upperPairs.map(pair => {
      const solved = data.listen.includes(word);
      return '<button lang="en" data-listen="' + word + '" data-pair="' + pair + '"' +
        (solved && groupOf(word) === pair ? ' class="ink-' + tones[pair] + '"' : '') +
        (solved ? " disabled" : "") + '>' + pair + '</button>';
    }).join("") + '</div></article>'
  ).join("") + '</div>';
}

function caseBoard(data) {
  return '<p class="ws-hint">Нажми сначала на большое сочетание, затем на маленькое.</p><div class="case-board">' +
    [upperPairs, ["ck", "ch", "sh"]].map((row, index) => '<div class="case-row">' + row.map(pair => {
      const solved = data.pairs.includes(pair);
      return '<button class="case-pair' + (solved ? ' ink-' + tones[pair] : '') + '" lang="en" data-case="' + pair +
        '" data-row-case="' + index + '" aria-pressed="' + (!index && worksheet.pair === pair) + '"' +
        (solved ? " disabled" : "") + '>' + (index ? pair : pair.toUpperCase()) + '</button>';
    }).join("") + '</div>').join("") + '</div>';
}

function drawWorksheet() {
  const { data } = worksheet;
  const lengths = [data.circle.length, data.groups.length, data.listen.length, data.pairs.length, data.snake.length];
  const done = lengths.filter((length, index) => length === taskTotals[index]).length;
  const bodies = [
    '<div class="circle-words">' + circleWords.map(word => letters(word, data.circle, word + ":")).join("") + '</div>',
    groupBoard(data), pictureBoard(data), caseBoard(data),
    '<p class="ws-hint">Нажми на первую букву каждого сочетания.</p><div class="snake"><span aria-hidden="true">🐍</span>' +
      letters(snakeText, data.snake, "snake:", true) + '</div>',
  ];
  app.innerHTML = '<section class="screen surface worksheet"><header class="reading-header">' + button("menu", "Меню") +
    '<h1 lang="en">WORKSHEET</h1>' + musicButton() + '</header><p class="ws-progress">Выполнено заданий · ' +
    done + ' из 5</p><progress max="5" value="' + done + '" aria-label="Выполнено заданий"></progress>' +
    taskTitles.map((title, index) => '<section class="ws-task"><h2>' + (index + 1) + '. ' + title +
      '</h2><p class="ws-count">' + lengths[index] + ' из ' + taskTotals[index] +
      (lengths[index] === taskTotals[index] ? ' ✓' : '') + '</p>' + bodies[index] + '</section>').join("") +
    (done === 5 ? '<section class="ws-result"><h2>Отличная работа! 5 из 5</h2>' +
      '<label>Имя <input id="child-name" autocomplete="given-name" maxlength="45" placeholder="Напиши своё имя"></label>' +
      button("worksheet-png", "Сохранить PNG", "primary") + button("worksheet-reset", "Пройти ещё раз") + '</section>' : '') +
    '<p class="brand">Meridian School · Reading Marathon · Lesson 2</p></section>';
  const field = app.querySelector("#child-name");
  if (field) field.value = data.name;
}

function correctAnswer(list, value, sound) {
  const data = worksheet.data;
  if (data[list].includes(value)) return;
  data[list].push(value);
  const complete = [data.circle, data.groups, data.listen, data.pairs, data.snake]
    .every((answers, index) => answers.length === taskTotals[index]);
  if (complete) saved.completed.worksheet = true;
  saved.sheet = data;
  save();
  drawWorksheet();
  if (sound) {
    const state = worksheet;
    void playVoice("sounds", sound).then(() => {
      if (complete && worksheet === state) effect("win");
    });
  }
  else effect(complete ? "win" : "ping");
  tell(complete ? "Рабочий лист выполнен!" : "Верно!");
}

function worksheetWrong(message = "Попробуй ещё раз.") {
  stopVoice();
  effect("wrong");
  tell(message);
}

function sortWorksheet(word, pair) {
  if (!groupWords.includes(word) || worksheet.data.groups.includes(word)) return;
  if (groupOf(word) !== pair) return worksheetWrong();
  worksheet.group = "";
  correctAnswer("groups", word);
}

function drawWorksheetPNG() {
  const nameInput = app.querySelector("#child-name");
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return tell("Впиши своё имя, чтобы сохранить результат.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f2e9ff";
  ctx.fillRect(0, 0, 1080, 1280);
  ctx.fillStyle = "#3c2069";
  ctx.fillRect(0, 0, 1080, 235);
  function label(value, x, y, size, color = "#302049", max = 945) {
    ctx.fillStyle = color;
    ctx.font = "700 " + size + "px system-ui";
    ctx.fillText(value, x, y, max);
  }
  function segments(value, y, size = 36) {
    ctx.font = "700 " + size + "px system-ui";
    const palette = { sh: "#6630aa", ch: "#745500", ck: "#087165" };
    let x = 72;
    for (const part of value.split(/(sh|ch|ck)/gi)) {
      label(part, x, y, size, palette[part.toLowerCase()]);
      x += ctx.measureText(part).width;
    }
  }
  label("Meridian School — Reading Marathon — Lesson 2", 54, 56, 32, "#ffffff");
  label("WORKSHEET", 54, 130, 59, "#ffffff");
  label(name, 54, 197, 43, "#ffffff", 690);
  label("5 из 5", 848, 197, 42, "#ffe47a", 180);
  const tops = [262, 445, 655, 858, 1027];
  const heights = [162, 190, 180, 148, 164];
  tops.forEach((top, index) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(50, top, 980, heights[index]);
    label((index + 1) + ". " + taskTitles[index], 72, top + 44, 28, "#3c2069", 895);
  });
  segments(circleWords.slice(0, 5).join("  ·  "), 355);
  segments(circleWords.slice(5).join("  ·  "), 402);
  upperPairs.forEach((pair, index) => {
    segments(pair.toUpperCase() + "  —  " + groupWords.filter(word => groupOf(word) === pair).join(", "), 533 + index * 39, 30);
  });
  for (let index = 0; index < pictureWords.length; index += 3) {
    segments(pictureWords.slice(index, index + 3).map(([word]) => word + " → " + groupOf(word)).join("    ·    "), 751 + index * 17, 29);
  }
  segments(upperPairs.map(pair => pair.toUpperCase() + " → " + pair).join("      ·      "), 961);
  segments(snakeText, 1145, 39);
  label("Отличная работа!", 54, 1245, 36, "#3c2069");
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "Meridian-Reading-Lesson-2.png";
  document.body.append(link);
  link.click();
  link.remove();
}

app.addEventListener("click", event => {
  if (!worksheet) return;
  const control = event.target.closest("button");
  if (!control || control.disabled) return;
  const { action, find, wsPlay, groupWord, groupTarget, listen, pair, rowCase } = control.dataset;
  if (action === "worksheet-png") return drawWorksheetPNG();
  if (action === "worksheet-reset") {
    stopVoice();
    saved.sheet = freshWorksheet();
    save();
    openWorksheet();
    return app.querySelector(".worksheet").scrollIntoView();
  }
  if (wsPlay) return void playVoice("words", wsPlay);
  if (find) {
    const [word, position] = find.split(":");
    const text = word === "snake" ? snakeText : word;
    if (!answerAt(text).includes(Number(position))) return worksheetWrong();
    return correctAnswer(word === "snake" ? "snake" : "circle", find);
  }
  if (groupWord) {
    worksheet.group = groupWord;
    app.querySelectorAll("[data-group-word]").forEach(item => item.setAttribute("aria-pressed", item === control));
  }
  if (groupTarget) {
    if (!worksheet.group) return tell("Сначала выбери слово.");
    return sortWorksheet(worksheet.group, groupTarget);
  }
  if (listen) {
    if (groupOf(listen) !== pair) return worksheetWrong();
    return correctAnswer("listen", listen);
  }
  if (rowCase !== undefined) {
    const target = control.dataset.case;
    if (rowCase === "0") {
      worksheet.pair = target;
      app.querySelectorAll('[data-row-case="0"]').forEach(item => item.setAttribute("aria-pressed", item === control));
    } else {
      if (!worksheet.pair) return tell("Сначала выбери большое сочетание.");
      if (worksheet.pair !== target) return worksheetWrong();
      worksheet.pair = "";
      correctAnswer("pairs", target, target);
    }
  }
});

app.addEventListener("input", event => {
  if (!worksheet || event.target.id !== "child-name") return;
  worksheet.data.name = event.target.value;
  saved.sheet = worksheet.data;
  save();
});

app.addEventListener("dragstart", event => {
  const word = event.target.closest("[data-group-word]")?.dataset.groupWord;
  if (worksheet && word) event.dataTransfer.setData("text/plain", word);
});

app.addEventListener("dragover", event => {
  if (worksheet && event.target.closest("[data-ws-drop]")) event.preventDefault();
});

app.addEventListener("drop", event => {
  const target = event.target.closest("[data-ws-drop]");
  if (!worksheet || !target) return;
  event.preventDefault();
  sortWorksheet(event.dataTransfer.getData("text/plain"), target.dataset.wsDrop);
});

menu();
