"use strict";

let reading;

function closeReading() {
  if (!reading) return;
  stopReading();
  reading = undefined;
}

function openReading(id) {
  reading = { id, pyramid: 0, rate: 0.9, checked: new Set(), run: 0 };
  app.innerHTML = '<section class="screen surface reading">' +
    '<header class="reading-header">' + button("menu", "Меню") +
    '<h1 lang="en">Read &amp; Check</h1>' + musicButton() + '</header>' +
    '<p class="reading-instruction">Прочитай пирамидку. Нажми на слово или на динамик рядом со строкой.</p>' +
    '<nav class="reading-tabs" aria-label="Пирамидки">' + lessons[id].reading.map((pyramid, index) =>
      '<button class="action" data-pyramid="' + index + '">' + pyramid.icon + ' ' + pyramid.title + '</button>'
    ).join("") + '</nav><div class="reading-stage"></div>' +
    '<p class="reading-status" role="status"></p>' +
    '<div class="reading-actions"><button class="action primary" data-read="check">Проверить себя</button>' +
    '<button class="action primary" data-read="expressive">Прочитать с выражением</button>' +
    '<button class="action" data-read="stop" disabled>Остановить</button></div>' +
    '<div class="reading-settings"><label>Скорость <select data-reading-rate>' +
    '<option value="0.8">0.8×</option><option value="0.9" selected>0.9×</option>' +
    '<option value="1">1.0×</option></select></label></div></section>';
  drawReading();
}

function currentPyramid() {
  return lessons[reading.id].reading[reading.pyramid];
}

function drawReading() {
  const pyramid = currentPyramid();
  app.querySelectorAll("[data-pyramid]").forEach((tab, index) => {
    tab.setAttribute("aria-pressed", index === reading.pyramid);
  });
  app.querySelector(".reading-stage").innerHTML = '<div class="pyramid pyramid-' + pyramid.tone + '">' +
    pyramid.lines.map((line, index) => {
      const width = 43 + 57 * (index + 1) / pyramid.lines.length;
      return '<div class="reading-row" data-row="' + index + '" style="--row-width:' + width + '%">' +
        '<button class="line-speaker" data-line="' + index + '" aria-label="Послушать строку ' +
        (index + 1) + '">🔊</button><div class="reading-line" lang="en">' +
        line.split(" ").map((token, wordIndex) =>
          '<button class="reading-word" data-reading-line="' + index + '" data-reading-word="' +
          wordIndex + '">' + marked(token) + '</button>'
        ).join(" ") + '</div></div>';
    }).join("") + '</div>';
}

function clearReadingHighlight() {
  app.querySelector(".reading-word.speaking")?.classList.remove("speaking");
  app.querySelector(".reading-row.speaking-line")?.classList.remove("speaking-line");
}

function readingStatus(message, playing = false) {
  app.querySelector(".reading-status").textContent = message;
  app.querySelector('[data-read="stop"]').disabled = !playing;
}

function stopReading() {
  if (!reading) return;
  reading.run++;
  stopVoice();
  clearReadingHighlight();
  readingStatus("");
}

async function speakReading(lineIndex, wordIndex, expressive = false) {
  stopReading();
  const state = reading;
  const run = state.run;
  const pyramid = currentPyramid();
  const full = lineIndex === undefined;
  const first = lineIndex ?? 0;
  const last = full ? pyramid.lines.length - 1 : first;
  const current = () => reading === state && state.run === run;
  let allPlayed = true;
  readingStatus(expressive ? "Читаем с выражением…" : "Слушаем…", true);
  for (let index = first; index <= last; index++) {
    const row = app.querySelector('[data-row="' + index + '"]');
    const line = pyramid.lines[index];
    if (expressive) {
      const ok = await playVoice("words", line, {
        rate: state.rate, whole: true,
        onStart: () => row.classList.add("speaking-line"),
      });
      if (!current()) return;
      clearReadingHighlight();
      if (!ok) return readingStatus("Для выразительного чтения нужен голос en-GB.");
    } else {
      const tokens = line.split(" ");
      const words = row.querySelectorAll(".reading-word");
      for (let w = wordIndex ?? 0; w <= (wordIndex ?? tokens.length - 1); w++) {
        const text = tokens[w].toLowerCase().replace(/[^a-z]/g, "");
        const ok = await playVoice("words", text, {
          rate: state.rate, onStart: () => words[w].classList.add("speaking"),
        });
        if (!current()) return;
        words[w].classList.remove("speaking");
        if (!ok) allPlayed = false;
      }
    }
  }
  if (full && allPlayed) {
    state.checked.add(state.pyramid);
    if (state.checked.size === lessons[state.id].reading.length && !saved.completed[state.id]) {
      saved.completed[state.id] = true;
      save();
      effect("win");
    }
  }
  readingStatus(allPlayed ? (full ? "Пирамидка прочитана!" : "") : "Некоторые слова не прозвучали. Их можно прочитать самостоятельно.");
}

app.addEventListener("click", event => {
  if (!reading) return;
  const control = event.target.closest("button");
  if (!control || control.disabled) return;
  const { pyramid, line, readingLine, readingWord, read } = control.dataset;
  if (pyramid !== undefined) {
    stopReading();
    reading.pyramid = Number(pyramid);
    drawReading();
  } else if (readingWord !== undefined) {
    void speakReading(Number(readingLine), Number(readingWord));
  } else if (line !== undefined) {
    void speakReading(Number(line));
  } else if (read === "stop") {
    stopReading();
  } else if (read) {
    void speakReading(undefined, undefined, read === "expressive");
  }
});

app.addEventListener("change", event => {
  if (reading && event.target.matches("[data-reading-rate]")) {
    stopReading();
    reading.rate = Number(event.target.value);
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopReading();
});
