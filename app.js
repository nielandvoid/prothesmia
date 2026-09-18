(() => {
  mountHeader();
  mountSettingsPanel();
  mountBackgroundLayer();
  mountCustomAudio();
  mountYouTubeMusic();

  const ICON_PLAY_BIG = '<svg width="22" height="22" viewBox="0 0 20 20"><path d="M6 4l10 6-10 6V4z" fill="currentColor"/></svg>';
  const ICON_PAUSE_BIG =
    '<svg width="22" height="22" viewBox="0 0 20 20" fill="none"><rect x="4" y="3" width="4" height="14" fill="currentColor"/><rect x="12" y="3" width="4" height="14" fill="currentColor"/></svg>';

  function buildModes(config) {
    return [
      { id: "focus", tabLabel: "focus", sessionLabel: config.focusLabel, minutes: config.focusMinutes, tone: "focus" },
      { id: "short", tabLabel: "short break", sessionLabel: config.shortBreakLabel, minutes: config.shortBreakMinutes, tone: "break" },
      { id: "long", tabLabel: "long break", sessionLabel: config.longBreakLabel, minutes: config.longBreakMinutes, tone: "break" },
    ];
  }

  let config = loadConfig();
  let MODES = buildModes(config);

  function toneRgb() {
    const tokens = loadTheme().tokens;
    return { focus: hexToRgb(tokens.focus), break: hexToRgb(tokens.break) };
  }

  const RING_RADIUS = 172;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  const tabsEl = document.getElementById("tabs");
  const digitsEl = document.getElementById("digits");
  const sessionLabelEl = document.getElementById("session-label");
  const ringEl = document.getElementById("ring-progress");
  const startBtn = document.getElementById("start-btn");
  const resetBtn = document.getElementById("reset-btn");

  ringEl.style.strokeDasharray = String(RING_CIRCUMFERENCE);
  ringEl.style.setProperty("--circ", String(RING_CIRCUMFERENCE));

  let modeId = "focus";
  let focusCount = 0;
  let secondsLeft = minutesFor(modeId) * 60;
  let running = false;
  let endTime = null;
  let rafId = null;
  let idleTimer = null;
  let isIdlePrompt = false;

  const pausedSeconds = {};

  function minutesFor(id) {
    return MODES.find((m) => m.id === id).minutes;
  }

  function modeOf(id) {
    return MODES.find((m) => m.id === id);
  }

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function totalSeconds() {
    return minutesFor(modeId) * 60;
  }

  function buildTabs() {
    tabsEl.innerHTML = "";
    MODES.forEach((m) => {
      const unit = document.createElement("div");
      unit.className = "control-unit";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tab-btn";
      btn.dataset.mode = m.id;
      btn.textContent = m.tabLabel;
      btn.addEventListener("click", () => switchMode(m.id));

      const light = document.createElement("span");
      light.className = "indicator-light tab-light";
      light.dataset.tone = m.tone;

      unit.appendChild(btn);
      unit.appendChild(light);
      tabsEl.appendChild(unit);
    });
  }

  function switchMode(next) {
    if (next === modeId) return;

    if (running && endTime) {
      secondsLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    }
    pausedSeconds[modeId] = secondsLeft;
    running = false;
    endTime = null;
    if (rafId) cancelAnimationFrame(rafId);

    modeId = next;
    secondsLeft = pausedSeconds[modeId] !== undefined ? pausedSeconds[modeId] : minutesFor(modeId) * 60;
    renderStatic();
  }

  function reset() {
    running = false;
    endTime = null;
    if (rafId) cancelAnimationFrame(rafId);
    secondsLeft = minutesFor(modeId) * 60;
    delete pausedSeconds[modeId];
    renderStatic({ animateRing: true });
  }

  function toggleRunning() {
    running = !running;
    if (running) {
      window.prothesmiaAudioCues?.primeAudioContext();
      endTime = Date.now() + secondsLeft * 1000;
      rafId = requestAnimationFrame(tick);
    } else if (rafId) {
      cancelAnimationFrame(rafId);
    }
    renderStatic();
  }

  function setRingFraction(fraction, animate = false) {
    ringEl.style.transition = animate ? "stroke-dashoffset 0.4s ease, stroke 0.2s ease" : "stroke 0.2s ease";
    ringEl.style.strokeDashoffset = String(RING_CIRCUMFERENCE * fraction);
  }

  function updateDigits(sec) {
    const str = formatTime(sec);
    digitsEl.textContent = str;
    digitsEl.style.setProperty("--ghost-text", `"${str.replace(/\d/g, "8")}"`);
    digitsEl.classList.toggle("is-long", str.length > 5);
  }

  function tick() {
    if (!running) return;
    const remainingMs = endTime - Date.now();
    const nextInt = Math.ceil(remainingMs / 1000);

    const fraction = 1 - remainingMs / 1000 / totalSeconds();
    setRingFraction(fraction);

    if (nextInt !== secondsLeft && nextInt >= 0) {
      secondsLeft = nextInt;
      updateDigits(secondsLeft);
      if (loadAudioSettings().tickSound && secondsLeft > 0) {
        window.prothesmiaAudioCues?.playTickSound();
      }
    }

    if (remainingMs > 0) {
      rafId = requestAnimationFrame(tick);
    } else {
      running = false;
      handleSessionComplete();
    }
  }

  function handleSessionComplete() {
    if (loadAudioSettings().sessionEndSound) {
      window.prothesmiaAudioCues?.playSessionEndChime();
    }
    if (modeId === "focus") {
      focusCount += 1;
      modeId = focusCount % config.sessionsBeforeLongBreak === 0 ? "long" : "short";
    } else {
      modeId = "focus";
    }
    delete pausedSeconds[modeId];
    secondsLeft = minutesFor(modeId) * 60;
    renderStatic();

    if (config.autoStartNext) {
      toggleRunning();
    } else {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!running) {
          sessionLabelEl.textContent = "are you alive?";
          isIdlePrompt = true;
        }
      }, 10000);
    }
  }

  function renderStatic({ animateRing = false } = {}) {
    const mode = modeOf(modeId);
    const rgb = toneRgb();

    [...tabsEl.children].forEach((unit) => {
      const btn = unit.querySelector(".tab-btn");
      const light = unit.querySelector(".tab-light");
      const isActive = btn.dataset.mode === modeId;
      btn.classList.toggle("is-active", isActive);
      light.classList.toggle("is-lit", isActive);
    });

    ringEl.style.stroke = `rgb(${rgb[mode.tone]})`;
    if (!running) {
      const fraction = 1 - secondsLeft / totalSeconds();
      setRingFraction(fraction, animateRing);
    }

    updateDigits(secondsLeft);
    let labelText = mode.sessionLabel;
    if (new Date().getHours() === 3 && !window.dismissedSleepMessage) {
      labelText = "go to sleep";
    }
    sessionLabelEl.textContent = labelText;

    if (!sessionLabelEl.hasAttribute("data-sleep-listener")) {
      sessionLabelEl.setAttribute("data-sleep-listener", "true");
      sessionLabelEl.addEventListener("click", () => {
        if (sessionLabelEl.textContent === "go to sleep") {
          window.dismissedSleepMessage = true;
          renderStatic();
        }
      });
      sessionLabelEl.style.cursor = "pointer";
    }

    const isFresh = secondsLeft === totalSeconds();
    if (loadButtonProfile() === "retro") {
      startBtn.innerHTML = running ? ICON_PAUSE_BIG : ICON_PLAY_BIG;
      resetBtn.textContent = "";
    } else {
      startBtn.textContent = running ? "pause" : (isFresh ? "start" : "resume");
      resetBtn.textContent = "reset";
    }
    startBtn.setAttribute("aria-label", running ? "pause" : (isFresh ? "start" : "resume"));
  }

  buildTabs();
  renderStatic();

  startBtn.addEventListener("click", toggleRunning);
  resetBtn.addEventListener("click", reset);

  window.addEventListener("prothesmia:config-change", (e) => {
    const prevMinutesById = { focus: minutesFor("focus"), short: minutesFor("short"), long: minutesFor("long") };
    config = e.detail;
    MODES = buildModes(config);

    Object.keys(pausedSeconds).forEach((id) => {
      if (pausedSeconds[id] === prevMinutesById[id] * 60 && minutesFor(id) !== prevMinutesById[id]) {
        pausedSeconds[id] = minutesFor(id) * 60;
      }
    });

    if (!running && secondsLeft === prevMinutesById[modeId] * 60 && minutesFor(modeId) !== prevMinutesById[modeId]) {
      secondsLeft = minutesFor(modeId) * 60;
    }
    renderStatic();
  });

  window.addEventListener("prothesmia:theme-change", () => renderStatic());
  window.addEventListener("prothesmia:button-profile-change", () => renderStatic());

  let timerClicks = 0;
  let lastTimerClick = 0;
  document.querySelector(".ring-wrap").addEventListener("click", () => {
    const now = Date.now();
    if (now - lastTimerClick < 800) {
      timerClicks++;
    } else {
      timerClicks = 1;
    }
    lastTimerClick = now;

    if (timerClicks >= 10) {
      timerClicks = 0;
      if (ringEl) {
        ringEl.classList.remove("rim-deplete");
        ringEl.getBoundingClientRect();
        ringEl.classList.add("rim-deplete");
      }
    }
  });

  if (ringEl) {
    ringEl.addEventListener("animationend", () => {
      ringEl.classList.remove("rim-deplete");
    });
  }

  ["click", "keydown"].forEach((evt) => {
    window.addEventListener(evt, () => {
      clearTimeout(idleTimer);
      if (isIdlePrompt) {
        isIdlePrompt = false;
        if (!running) renderStatic();
      }
    });
  });

  function mountNotesWidget() {
    const widget = document.getElementById("notes-widget");
    const header = document.getElementById("notes-header");
    const content = document.getElementById("notes-content");
    if (!widget) return;

    widget.hidden = !config.showNotes;
    window.addEventListener("prothesmia:notes-toggle", (e) => {
      widget.hidden = !e.detail;
    });

    const savedPos = localStorage.getItem("prothesmia:notes-pos");
    if (savedPos) {
      try {
        const { x, y, w, h } = JSON.parse(savedPos);
        widget.style.left = x;
        widget.style.top = y;
        if (w) widget.style.width = w;
        if (h) widget.style.height = h;
      } catch {}
    }

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    
    header.addEventListener("pointerdown", (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = widget.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      header.setPointerCapture(e.pointerId);
    });

    header.addEventListener("pointermove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      widget.style.left = `${initialLeft + dx}px`;
      widget.style.top = `${initialTop + dy}px`;
    });

    header.addEventListener("pointerup", (e) => {
      if (!isDragging) return;
      isDragging = false;
      header.releasePointerCapture(e.pointerId);
      savePos();
    });

    new ResizeObserver(() => savePos()).observe(widget);

    function savePos() {
      localStorage.setItem("prothesmia:notes-pos", JSON.stringify({
        x: widget.style.left,
        y: widget.style.top,
        w: widget.style.width,
        h: widget.style.height
      }));
    }

    const savedNotes = localStorage.getItem("prothesmia:notes-data");
    if (savedNotes) {
      content.innerHTML = savedNotes;
    }

    function saveNotes() {
      localStorage.setItem("prothesmia:notes-data", content.innerHTML);
    }

    content.addEventListener("change", (e) => {
      if (e.target.type === "checkbox") {
        if (e.target.checked) {
          e.target.setAttribute("checked", "checked");
        } else {
          e.target.removeAttribute("checked");
        }
        saveNotes();
      }
    });

    content.addEventListener("input", (e) => {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const node = sel.focusNode;
      if (!node || node.nodeType !== Node.TEXT_NODE) {
        saveNotes();
        return;
      }

      const text = node.textContent;
      let matched = false;

      if (/^[\u200B\u200C]*(- \[ \] |\[ \] )/.test(text)) {
        const match = /^[\u200B\u200C]*(- \[ \] |\[ \] )/.exec(text);
        const range = document.createRange();
        range.setStart(node, 0);
        range.setEnd(node, match[0].length);
        range.deleteContents();
        
        const cb = document.createElement("input");
        cb.type = "checkbox";
        range.insertNode(cb);
        
        const space = document.createTextNode(" ");
        cb.after(space);
        
        range.setStartAfter(space);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        matched = true;
      }
      else if (/^[\u200B\u200C]*> /.test(text)) {
        const match = /^[\u200B\u200C]*> /.exec(text);
        const range = document.createRange();
        range.setStart(node, 0);
        range.setEnd(node, match[0].length);
        range.deleteContents();
        document.execCommand("formatBlock", false, "blockquote");
        matched = true;
      }
      else if (/^[\u200B\u200C]*(- |\* )/.test(text)) {
        const match = /^[\u200B\u200C]*(- |\* )/.exec(text);
        const range = document.createRange();
        range.setStart(node, 0);
        range.setEnd(node, match[0].length);
        range.deleteContents();
        document.execCommand("insertUnorderedList");
        matched = true;
      }
      else if (/\*\*([^\*]+)\*\*$/.test(text)) {
        const match = /\*\*([^\*]+)\*\*$/.exec(text);
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        sel.removeAllRanges();
        sel.addRange(range);
        
        document.execCommand("insertText", false, match[1]);
        const newRange = document.createRange();
        newRange.setStart(sel.focusNode, sel.focusOffset - match[1].length);
        newRange.setEnd(sel.focusNode, sel.focusOffset);
        sel.removeAllRanges();
        sel.addRange(newRange);
        
        document.execCommand("bold");
        sel.collapseToEnd();
        document.execCommand("bold");
        matched = true;
      }
      else if (/_([^_]+)_$/.test(text) || /(?<!\*)\*([^\*]+)\*$/.test(text)) {
        const match = /_([^_]+)_$/.exec(text) || /(?<!\*)\*([^\*]+)\*$/.exec(text);
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        sel.removeAllRanges();
        sel.addRange(range);
        
        document.execCommand("insertText", false, match[1]);
        const newRange = document.createRange();
        newRange.setStart(sel.focusNode, sel.focusOffset - match[1].length);
        newRange.setEnd(sel.focusNode, sel.focusOffset);
        sel.removeAllRanges();
        sel.addRange(newRange);
        
        document.execCommand("italic");
        sel.collapseToEnd();
        document.execCommand("italic");
        matched = true;
      }
      else if (/~~([^~]+)~~$/.test(text)) {
        const match = /~~([^~]+)~~$/.exec(text);
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        sel.removeAllRanges();
        sel.addRange(range);
        
        document.execCommand("insertText", false, match[1]);
        const newRange = document.createRange();
        newRange.setStart(sel.focusNode, sel.focusOffset - match[1].length);
        newRange.setEnd(sel.focusNode, sel.focusOffset);
        sel.removeAllRanges();
        sel.addRange(newRange);
        
        document.execCommand("strikeThrough");
        sel.collapseToEnd();
        document.execCommand("strikeThrough");
        matched = true;
      }

      if (matched) {
        saveNotes();
      } else if (e.inputType !== "insertText" && e.inputType !== "deleteContentBackward") {
        saveNotes();
      }
    });

    content.addEventListener("keydown", (e) => {
      if (e.key === "Backspace") {
        const sel = window.getSelection();
        if (!sel.rangeCount || !sel.isCollapsed) return;
        
        const node = sel.focusNode;
        const bq = node.nodeType === 3 ? node.parentElement.closest("blockquote") : node.closest("blockquote");
        
        if (bq) {
          let isStart = false;
          if (sel.focusOffset === 0) {
            isStart = (node.nodeType === 3 && (!node.previousSibling || node.previousSibling.nodeName === 'BR')) 
                      || node.nodeType !== 3;
          } else if (node.nodeType === 1 && sel.focusOffset > 0) {
            const prev = node.childNodes[sel.focusOffset - 1];
            if (prev && prev.nodeName === 'BR') isStart = true;
          }
          
          if (!node.textContent.trim() || isStart) {
            e.preventDefault();
            document.execCommand("insertText", false, "\u200B");
            document.execCommand("outdent");
            
            if (!bq.textContent.trim()) bq.remove();
          }
        }
      }
    });

    content.addEventListener("keyup", (e) => {
      saveNotes();
      
      let removedAny = false;
      content.querySelectorAll("strong, em, del").forEach(tag => {
        if (!tag.textContent) {
          tag.remove();
          removedAny = true;
        }
      });
      if (removedAny) document.execCommand("removeFormat");

      if (e.key === "Backspace" || e.key === "Delete") {
        setTimeout(() => {
          if (!content.textContent.trim().replace(/[\u200B\u200C]/g, "")) {
            content.innerHTML = "<div><br></div>";
            const sel = window.getSelection();
            const r = document.createRange();
            r.setStart(content.firstChild, 0);
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
            document.execCommand("removeFormat");
            saveNotes();
          }
        }, 10);
      }
    });

    content.addEventListener("focus", () => {
      document.execCommand("defaultParagraphSeparator", false, "div");
    });
  }

  mountNotesWidget();

  mountLayoutEditor({
    "focus-tabs": tabsEl,
    "focus-ring": document.querySelector("#view-focus .ring-wrap"),
    "focus-action": document.querySelector("#view-focus .controls"),
  });
})();
