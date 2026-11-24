"use strict";

const app = document.querySelector("#app");
const notice = document.querySelector("#notice");
const storageKey = "br-gr-game-v1";
const effects = new Audio();
const voice = new Audio();
const music = new Audio("./audio/music/background.mp3");
music.loop = true;
music.volume = 0.055;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

let saved = { records: {}, completed: {}, effects: true, music: false };
try {
  const data = JSON.parse(localStorage.getItem(storageKey));
  if (data && typeof data === "object") saved = { ...saved, ...data };
} catch { /* The game can run with storage disabled. */ }

let active;
let voiceJob;
let noticeTimer;
let drag;

function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(saved)); }
  catch { /* Keep progress in memory for this visit. */ }
}

function tell(text = "") {
  clearTimeout(noticeTimer);
  notice.textContent = text;
  if (text) noticeTimer = setTimeout(() => { notice.textContent = ""; }, 2300);
}

function musicButton() {
  return '<button class="action" data-action="music" aria-pressed="' + saved.music +
    '">Музыка ' + (saved.music ? "✓" : "×") + '</button>';
}

function syncMusic() {
  if (saved.music && !voiceJob && !document.hidden && !active?.paused) {
    music.play().catch(() => {});
  } else music.pause();
}

function stopVoice() {
  voiceJob?.finish(false);
  voice.pause();
}

function effect(name, quiet = false) {
  if (!saved.effects || (voiceJob && !quiet) || document.hidden || active?.paused) return;
  effects.volume = quiet ? 0.12 : 0.5;
  effects.src = "./audio/effects/" + name + ".mp3";
  effects.play().catch(() => {});
}

function playVoice(folder, name, { rate = 1, onStart, whole = false } = {}) {
  stopVoice();
  tell();
  effects.pause();
  const useSpeech = whole || (folder === "words" && !recordedWords.has(name));

  return new Promise(resolve => {
    let timeout;
    let utterance;
    let remaining = 8000;
    let deadline;
    const synth = window.speechSynthesis;
    const current = () => voiceJob === job;

    function finish(ok) {
      if (!current()) return;
      voiceJob = undefined;
      clearTimeout(timeout);
      voice.onplaying = voice.onended = voice.onerror = null;
      voice.pause();
      if (utterance) {
        utterance.onstart = utterance.onend = utterance.onerror = null;
        if (!ok) synth.cancel();
      }
      syncMusic();
      resolve(ok);
    }

    function fail() {
      if (!current()) return;
      tell(useSpeech ? "Озвучка en-GB недоступна." : "Запись недоступна. Можно продолжить игру.");
      finish(false);
    }

    function resume() {
      deadline = performance.now() + remaining;
      timeout = setTimeout(fail, remaining);
      if (utterance) {
        synth.resume();
      } else {
        voice.play().catch(error => { if (error.name !== "AbortError") fail(); });
      }
    }

    const job = {
      finish, resume,
      pause() {
        clearTimeout(timeout);
        remaining = Math.max(1, deadline - performance.now());
        if (utterance) synth.pause();
        else voice.pause();
      },
    };
    voiceJob = job;
    syncMusic();

    if (useSpeech) {
      if (!synth || !window.SpeechSynthesisUtterance) return fail();
      const voices = synth.getVoices();
      const british = voices.filter(item => /^en[-_]GB$/i.test(item.lang));
      utterance = new SpeechSynthesisUtterance(name);
      const selected = british.find(item => item.localService) || british[0];
      if (voices.length && !selected) {
        utterance = undefined;
        return fail();
      }
      if (selected) utterance.voice = selected;
      utterance.lang = "en-GB";
      utterance.rate = rate;
      utterance.onstart = () => { if (current()) onStart?.(); };
      utterance.onend = () => finish(true);
      utterance.onerror = fail;
      deadline = performance.now() + remaining;
      timeout = setTimeout(fail, remaining);
      try { synth.speak(utterance); } catch { fail(); }
    } else {
      voice.onplaying = () => { if (current()) onStart?.(); };
      voice.onended = () => finish(true);
      voice.onerror = fail;
      voice.playbackRate = rate;
      voice.src = "./audio/" + (folder === "words" ? "br_gr_words" : "br_gr_sounds") + "/" + name + ".mp3";
      resume();
    }
  });
}

function mascot(symbol, tone) {
  return '<span class="mascot ' + tone + '" aria-hidden="true"><span class="face"></span><b>' + symbol + '</b><span class="mic">♪</span></span>';
}

function troupe() {
  return '<div class="troupe">' + mascot("SH", "violet") + mascot("CH", "yellow") + mascot("CK", "aqua") + '</div>';
}

function wordLabel(word, highlight = false) {
  return '<span class="word" lang="en">' + (highlight ? marked(word) : word) + '</span>';
}

function button(action, label, extra = "") {
  return '<button class="action ' + extra + '" data-action="' + action + '">' + label + '</button>';
}

function leave() {
  closeWorksheet();
  closeReading();
  clearDrag();
  active?.movement?.cancel();
  active = undefined;
  stopVoice();
  effects.pause();
  syncMusic();
  tell();
}

function menu() {
  leave();
  const symbols = { blends: "BR", digraphs: "SH", memory: "Aa", reading: "▰", worksheet: "✎" };
  app.innerHTML = '<section class="screen home"><header class="hero">' + musicButton() +
    '<p class="brand">Meridian School · Reading Marathon · Lesson 2</p>' +
    '<h1>BR GR Game</h1><p lang="en">The Digraph Friends Comedy Show</p>' + troupe() + '</header>' +
    '<div class="round-list">' + Object.entries(lessons).map(([id, lesson]) =>
      '<button class="round-card" data-round="' + id + '"><span class="badge">' + symbols[id] +
      '</span><strong lang="en">' + lesson.title + (saved.completed[id] ? ' <span aria-label="пройден">✓</span>' : '') +
      '</strong><small>' + lesson.description + '</small></button>'
    ).join("") + '</div></section>';
}

function setup(id, mode = 0) {
  leave();
  if (id === "worksheet") return openWorksheet();
  if (lessons[id].reading) return openReading(id);
  app.innerHTML = '<section class="screen surface intro" data-setup="' + id + '">' + troupe() +
    '<h1 lang="en">' + lessons[id].title + '</h1><p>' + lessons[id].instructions +
    '</p><div class="actions"><label for="mode">Режим времени</label><select id="mode">' +
    [[0, "Таймер"], [60, "Обратный отсчёт · 60 с"], [90, "Обратный отсчёт · 90 с"], [120, "Обратный отсчёт · 120 с"]]
      .map(([value, label]) => '<option value="' + value + '"' + (mode === value ? " selected" : "") + '>' + label + '</option>').join("") +
    '</select></div><div class="actions">' + button("menu", "Меню") + button("start", "Начать", "primary") + '</div></section>';
  app.querySelector('[data-action="start"]').focus();
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function start(id, mode, stage = 0) {
  const pipes = lessons[id].stages?.[stage];
  const words = pipes ? shuffle(pipes.flatMap((pipe, side) =>
    shuffle(pipe.words).slice(0, 3).map(word => ({ word, side, pipe: null })))) : [];
  const cards = id === "memory" ? shuffle(shuffle(memoryWords).slice(0, 6).flatMap(word =>
    [false, true].map(audio => ({ word, audio, state: "closed" })))) : [];
  const round = {
    id, mode, stage, pipes, words, cards, elapsed: 0, last: performance.now(),
    paused: false, busy: false, checking: false, count: 0,
    first: null, total: cards.length ? cards.length / 2 : words.length,
  };
  active = round;
  app.innerHTML = '<section class="screen game"><header class="surface topbar">' +
    button("menu", "Меню") + '<h1 lang="en">' + lessons[id].title + (id === "blends" ? " · " + (stage + 1) + "/2" : "") +
    '</h1><div class="controls"><output class="clock" aria-label="Время"></output>' +
    button("pause", "Пауза") + musicButton() +
    '</div></header><div class="status"><span class="hint" role="status"></span><span class="count"></span>' +
    '<progress max="' + round.total + '" aria-label="Прогресс"></progress></div>' +
    '<div id="field"></div><div id="pause-layer"></div></section>';
  draw(round);
  clock(round);
  requestAnimationFrame(() => tick(round));
}

function displayTime(seconds) {
  return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
}

function clock(round) {
  const seconds = round.mode
    ? Math.max(0, Math.ceil(round.mode - round.elapsed / 1000))
    : Math.floor(round.elapsed / 1000);
  const target = app.querySelector(".clock");
  const formatted = displayTime(seconds);
  if (target.textContent !== formatted) target.textContent = formatted;
  target.classList.toggle("urgent", Boolean(round.mode && seconds <= 10));
}

function accountTime(round, now = performance.now()) {
  if (!round.paused && !round.checking) round.elapsed += Math.max(0, now - round.last);
  round.last = now;
}

function tick(round) {
  if (active !== round) return;
  accountTime(round);
  clock(round);
  if (round.mode && round.elapsed >= round.mode * 1000) finish(round, false);
  else requestAnimationFrame(() => tick(round));
}

function checking(round, value) {
  accountTime(round);
  round.checking = value;
}

function draw(round, focusSelector) {
  const field = app.querySelector("#field");
  field.inert = round.paused;
  const memory = round.id === "memory";
  const hint = memory ? "Найди пару из слова и его записи." :
    round.checking ? "Слушай слово…" : "Прочитай слово и выбери подходящую трубу.";
  app.querySelector(".hint").innerHTML = hint + (!memory && !round.checking
    ? '<small>Нажми на трубу или перетащи в неё слово.</small>' : '');
  app.querySelector(".count").textContent = round.count + " из " + round.total;
  app.querySelector("progress").value = round.count;
  field.innerHTML = memory ? memoryBoard(round) : factoryBoard(round);
  field.querySelector(focusSelector || "[data-autofocus]")?.focus({ preventScroll: true });
}

function factoryBoard(round) {
  const disabled = round.busy ? " disabled" : "";
  const current = round.words.find(item => item.pipe === null);
  const tray = '<div class="tray">' + (current ? '<button class="token" data-word="' + current.word +
    '" aria-label="Послушать слово ' + current.word + '"' + disabled + '>' + wordLabel(current.word) +
    '<span class="token-speaker" aria-hidden="true">🔊</span></button>' : '') + '</div>';
  return '<div class="board factory">' + tray + round.pipes.map((info, side) => {
    const bin = round.words.filter(item => item.pipe === side).map(item =>
      '<span class="mini correct">' + wordLabel(item.word, round.id === "digraphs") + '</span>'
    ).join("");
    const label = round.id === "digraphs" ? mascot(info.symbol, info.tone) : '<strong>' + info.symbol + '</strong>';
    return '<section class="pipe ' + info.tone + '"><button class="pipe-label sample" data-sample="' + side + '"' +
      disabled + ' aria-label="Послушать ' + info.symbol + '">' + label + '<span>' + info.label +
      '</span><span aria-hidden="true">🔊</span></button>' +
      '<button class="shaft" data-pipe="' + side + '"' + disabled + ' aria-label="Отправить в трубу ' + info.symbol +
      '">В трубу</button><div class="bin">' + bin + '</div></section>';
  }).join("") + '</div>';
}

function memoryBoard(round) {
  return '<div class="board memory">' + round.cards.map((card, index) =>
    '<button class="tile ' + card.state + '" data-card="' + index + '"' +
    (round.busy || card.state !== "closed" ? " disabled" : "") +
    (card.state === "gone" ? ' aria-hidden="true"' : '') +
    (card.state === "closed" ? ' aria-label="Открыть карточку ' + (index + 1) + '"' :
      card.audio ? ' aria-label="Запись слова"' : '') + '>' +
    (card.state === "closed" ? '?' : card.audio ? '🔊' : wordLabel(card.word)) + '</button>'
  ).join("") + '</div>';
}

function delay(round, duration) {
  return new Promise(resolve => {
    let last = performance.now();
    function step() {
      if (active !== round) return resolve(false);
      const now = performance.now();
      if (!round.paused) duration -= now - last;
      last = now;
      if (duration <= 0 && !round.paused) resolve(true);
      else setTimeout(step, 25);
    }
    step();
  });
}

function floatingBlock(source, from) {
  const block = source.cloneNode(true);
  block.className = "token flight";
  block.tabIndex = -1;
  block.disabled = true;
  block.removeAttribute("data-word");
  block.setAttribute("aria-hidden", "true");
  Object.assign(block.style, { left: from.left + "px", top: from.top + "px", width: from.width + "px", height: from.height + "px" });
  app.append(block);
  return block;
}

function animateBlock(round, source, from, to, returns = false) {
  if (reducedMotion.matches) return;
  const block = floatingBlock(source, from);
  const movement = block.animate([
    { transform: "translate(0,0) scale(1)", opacity: 1 },
    { transform: "translate(" + (to.left + (to.width - from.width) / 2 - from.left) + "px," +
      (to.top + (to.height - from.height) / 2 - from.top) + "px) scale(" + (returns ? "1" : ".38") + ")", opacity: returns ? 1 : .2 },
  ], { duration: returns ? 180 : 350, easing: returns ? "ease-out" : "ease-in-out" });
  round.movement = movement;
  movement.finished.catch(() => {}).finally(() => {
    block.remove();
    if (returns) source.style.visibility = "";
    if (round.movement === movement) round.movement = undefined;
  });
}

async function send(round, side, target, from) {
  if (round.busy) return;
  const item = round.words.find(entry => entry.pipe === null);
  if (!item) return;
  stopVoice();
  if (side !== item.side) {
    effect("wrong");
    tell("Попробуй другую трубу.");
    if (!reducedMotion.matches) target.animate([{ translate: "-4px" }, { translate: "4px" }, { translate: "0" }], 220);
    return;
  }
  round.busy = true;
  checking(round, true);
  const source = app.querySelector("[data-word]");
  animateBlock(round, source, from || source.getBoundingClientRect(), target.getBoundingClientRect());
  source.style.visibility = "hidden";
  const spoken = playVoice("words", item.word);
  effect("swoosh", true);
  // Playback starts inside the tap or drop event, including on mobile Safari.
  if (!await delay(round, reducedMotion.matches ? 0 : 350)) return;
  item.pipe = side;
  round.count++;
  draw(round);
  await spoken;
  if (!await delay(round, 0)) return;
  if (round.count === round.total) return finish(round, true);
  effect("ping");
  round.busy = false;
  checking(round, false);
  draw(round, "[data-pipe]");
}

async function flip(round, index) {
  const card = round.cards[index];
  if (round.busy || card.state !== "closed") return;
  const first = round.first;
  card.state = "open";
  // Only audio cards speak. A second recording replaces the first.
  const spoken = card.audio ? playVoice("words", card.word) : round.firstVoice;
  if (first === null) {
    round.first = index;
    round.firstVoice = spoken;
    if (!spoken) effect("click");
    draw(round, '[data-card]:not(:disabled)');
    return;
  }
  round.busy = true;
  checking(round, true);
  draw(round);
  await spoken;
  if (!await delay(round, 0)) return;
  const other = round.cards[first];
  const match = other.word === card.word && other.audio !== card.audio;
  effect(match ? "ping" : "wrong");
  if (!await delay(round, match ? 320 : 680)) return;
  card.state = other.state = match ? "gone" : "closed";
  if (match) round.count++;
  if (round.count === round.total) return finish(round, true);
  round.first = null;
  round.firstVoice = null;
  round.busy = false;
  checking(round, false);
  draw(round, '[data-card]:not(:disabled)');
}

function pause(round, automatic = false) {
  if (round.paused) return;
  clearDrag();
  accountTime(round);
  round.paused = true;
  syncMusic();
  voiceJob?.pause();
  effects.pause();
  round.movement?.pause();
  app.querySelector("#field").inert = true;
  app.querySelector(".topbar").inert = true;
  app.querySelector("#pause-layer").innerHTML = '<div class="pause"><div class="surface pause-panel" role="dialog" aria-modal="true" aria-label="Пауза">' +
    '<h2>Пауза</h2><div class="actions">' + button("resume", "Продолжить", "primary") + button("menu", "Меню") + '</div></div></div>';
  if (!automatic) app.querySelector('[data-action="resume"]').focus();
}

function resume(round) {
  if (!round.paused || document.hidden) return;
  round.last = performance.now();
  round.paused = false;
  app.querySelector("#pause-layer").innerHTML = "";
  app.querySelector(".topbar").inert = false;
  app.querySelector("#field").inert = false;
  voiceJob?.resume();
  syncMusic();
  if (round.movement?.playState === "paused") round.movement.play();
  app.querySelector('[data-action="pause"]').focus();
}

function finish(round, won) {
  leave();
  const seconds = won ? Math.ceil(round.elapsed / 1000) : round.mode;
  const next = won && round.stage + 1 < (lessons[round.id].stages?.length || 0);
  const key = round.id + ":" + round.stage + ":" + round.mode;
  const previous = saved.records[key];
  if (won) {
    if (previous === undefined || seconds < previous) saved.records[key] = seconds;
    if (!next) saved.completed[round.id] = true;
    save();
    effect("win");
  }
  const best = saved.records[key];
  app.innerHTML = '<section class="screen surface result ' + (won ? "won" : "") + '">' + (won ? troupe() : "") +
    '<h1>' + (won ? "Отличная работа!" : "Время вышло") + '</h1><p>' + lessons[round.id].title +
    ' · ' + round.count + ' из ' + round.total + '<br>Время: ' + displayTime(seconds) + '<br>Лучшее время: ' +
    (best === undefined ? '—' : displayTime(best)) + '</p><div class="actions">' +
    (next ? button("next", "Следующий подраунд", "primary") : "") + button("replay", "Играть снова", next ? "" : "primary") + button("menu", "Выбрать раунд") + '</div></section>';
  const replay = app.querySelector('[data-action="replay"]');
  replay.dataset.replay = round.id;
  replay.dataset.mode = round.mode;
  const nextButton = app.querySelector('[data-action="next"]');
  if (nextButton) {
    nextButton.addEventListener("click", () => start(round.id, round.mode, round.stage + 1), { once: true });
  }
  (nextButton || replay).focus();
}

function clearDrag() {
  const current = drag;
  if (!current) return;
  drag = undefined;
  current.target?.classList.remove("drop-near");
  current.block?.remove();
  current.source.classList.remove("drag-origin");
  if (current.source.hasPointerCapture(current.id)) current.source.releasePointerCapture(current.id);
}

function findShaft(x, y) {
  if (document.elementFromPoint(x, y)?.closest(".sample")) return undefined;
  return [...app.querySelectorAll(".shaft")].find(shaft => {
    const rect = shaft.getBoundingClientRect();
    return x >= rect.left - 10 && x <= rect.right + 10 &&
      y >= rect.top - 10 && y <= rect.bottom + 10;
  });
}

app.addEventListener("pointerdown", event => {
  const source = event.target.closest("button[data-word]");
  const round = active;
  if (!source || source.disabled || !round || round.paused || round.busy ||
      drag || !event.isPrimary || event.button !== 0) return;
  source.setPointerCapture(event.pointerId);
  drag = { source, round, id: event.pointerId, x: event.clientX, y: event.clientY };
});

app.addEventListener("pointermove", event => {
  if (!drag || drag.id !== event.pointerId) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (!drag.block) {
    if (Math.hypot(dx, dy) < 8) return;
    drag.block = floatingBlock(drag.source, drag.source.getBoundingClientRect());
    drag.source.classList.add("drag-origin");
  }
  drag.block.style.transform = "translate(" + dx + "px," + dy + "px)";
  const target = findShaft(event.clientX, event.clientY);
  if (target !== drag.target) {
    drag.target?.classList.remove("drop-near");
    target?.classList.add("drop-near");
    drag.target = target;
  }
});

app.addEventListener("pointerup", event => {
  if (!drag || drag.id !== event.pointerId) return;
  const { source, block, round } = drag;
  const from = block?.getBoundingClientRect();
  const target = block && findShaft(event.clientX, event.clientY);
  clearDrag();
  if (!from) {
    if (active === round && !round.busy && !round.paused) void playVoice("words", source.dataset.word);
    return;
  }
  if (target) {
    void send(round, Number(target.dataset.pipe), target, from);
  } else if (!reducedMotion.matches) {
    const to = source.getBoundingClientRect();
    source.style.visibility = "hidden";
    animateBlock(round, source, from, to, true);
  }
});

for (const type of ["pointercancel", "lostpointercapture"]) {
  app.addEventListener(type, event => {
    if (drag?.id === event.pointerId) clearDrag();
  });
}

app.addEventListener("click", event => {
  const control = event.target.closest("button");
  if (!control || control.disabled) return;
  const { action, round: id, sample, pipe, card, word } = control.dataset;
  const round = active;
  if (id) return setup(id);
  if (action === "menu") return menu();
  if (action === "start") return start(app.querySelector("[data-setup]").dataset.setup, Number(app.querySelector("#mode").value));
  if (action === "replay") return setup(control.dataset.replay, Number(control.dataset.mode));
  if (action === "music") {
    saved.music = !saved.music;
    control.textContent = "Музыка " + (saved.music ? "✓" : "×");
    control.setAttribute("aria-pressed", saved.music);
    syncMusic();
    save();
    return;
  }
  if (!round) return;
  if (action === "resume") return resume(round);
  if (round.paused || document.hidden) return;
  if (action === "pause") return pause(round);
  if (round.busy || drag) return;
  // Pointer taps are handled on release so dragging never starts preview audio.
  if (word && event.detail === 0) void playVoice("words", word);
  if (sample !== undefined) void playVoice("sounds", round.pipes[sample].audio);
  if (pipe !== undefined) void send(round, Number(pipe), control);
  if (card !== undefined) void flip(round, Number(card));
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) return syncMusic();
  syncMusic();
  if (active) pause(active, true);
  else {
    stopVoice();
    effects.pause();
  }
});
