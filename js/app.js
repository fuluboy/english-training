(() => {
  const STORAGE_KEY = "english-training-attempts-v1";
  const DICT_CACHE_KEY = "english-training-dictionary-cache-v1";
  const SESSION_SIZE = 20;
  const BANK_VERSION = window.QUESTION_META?.version || "stage1-500-v1";
  const bank = window.QUESTION_BANK || [];

  const $ = (id) => document.getElementById(id);
  const views = [$("homeView"), $("quizView"), $("resultView")];
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

  const state = {
    mode: "training",
    sessionId: null,
    questions: [],
    index: 0,
    startedAt: 0,
    selected: null,
    locked: false,
    sessionAttempts: []
  };

  const loadJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };

  const saveJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const loadAttempts = () => loadJson(STORAGE_KEY, []);
  const saveAttempts = (attempts) => saveJson(STORAGE_KEY, attempts);

  const showView = (target) => {
    views.forEach(v => v.classList.add("hidden"));
    target.classList.remove("hidden");
  };

  const shuffle = (items) => {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

  const groupByKnowledge = (items) => {
    const map = new Map();
    items.forEach(q => {
      if (!map.has(q.knowledge)) map.set(q.knowledge, []);
      map.get(q.knowledge).push(q);
    });
    return map;
  };

  const getQuestionStats = (attempts) => {
    const map = new Map();
    attempts.forEach(a => {
      if (!map.has(a.questionId)) map.set(a.questionId, { total: 0, correct: 0, avgMs: 0 });
      const s = map.get(a.questionId);
      s.avgMs = ((s.avgMs * s.total) + a.responseMs) / (s.total + 1);
      s.total += 1;
      if (a.correct) s.correct += 1;
    });
    return map;
  };

  const getKnowledgeStats = (attempts) => {
    const map = new Map();
    attempts.forEach(a => {
      if (!map.has(a.knowledge)) map.set(a.knowledge, { total: 0, correct: 0, avgMs: 0, lastAt: 0 });
      const s = map.get(a.knowledge);
      s.avgMs = ((s.avgMs * s.total) + a.responseMs) / (s.total + 1);
      s.total += 1;
      if (a.correct) s.correct += 1;
      s.lastAt = Math.max(s.lastAt, new Date(a.timestamp).getTime() || 0);
    });
    return map;
  };

  const knowledgeWeight = (knowledge, stats) => {
    const s = stats.get(knowledge);
    if (!s) return 3.2;
    const accuracy = s.correct / s.total;
    const weaknessBoost = (1 - accuracy) * 5.2;
    const familiarityDecay = Math.min(s.total, 10) * 0.16;
    const daysSince = s.lastAt ? Math.max(0, (Date.now() - s.lastAt) / 86400000) : 0;
    const spacingBoost = Math.min(daysSince, 14) * 0.10;
    return Math.max(0.8, 1.4 + weaknessBoost + spacingBoost - familiarityDecay);
  };

  const chooseVariant = (questions, qStats) => {
    const ranked = [...questions].sort((a, b) => {
      const sa = qStats.get(a.id) || { total: 0, correct: 0 };
      const sb = qStats.get(b.id) || { total: 0, correct: 0 };
      if (sa.total !== sb.total) return sa.total - sb.total;
      const aa = sa.total ? sa.correct / sa.total : 0;
      const ab = sb.total ? sb.correct / sb.total : 0;
      if (aa !== ab) return aa - ab;
      return (a.learningStage || 1) - (b.learningStage || 1);
    });
    const leastSeen = ranked[0]?.id;
    const tied = ranked.filter(q => {
      const sq = qStats.get(q.id) || { total: 0 };
      const sl = qStats.get(leastSeen) || { total: 0 };
      return sq.total === sl.total;
    });
    return shuffle(tied)[0] || ranked[0];
  };

  const weightedKnowledgeSample = (items, size, attempts) => {
    const groups = groupByKnowledge(items);
    const kStats = getKnowledgeStats(attempts);
    const qStats = getQuestionStats(attempts);
    const pool = [...groups.entries()].map(([knowledge, questions]) => ({ knowledge, questions }));
    const selected = [];

    while (pool.length && selected.length < size) {
      const weights = pool.map(g => knowledgeWeight(g.knowledge, kStats));
      const total = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      let idx = 0;
      for (; idx < pool.length; idx++) {
        r -= weights[idx];
        if (r <= 0) break;
      }
      const group = pool.splice(Math.min(idx, pool.length - 1), 1)[0];
      selected.push(chooseVariant(group.questions, qStats));
    }

    return shuffle(selected);
  };

  const diagnosticSample = (items, size) => {
    const groups = [...groupByKnowledge(items).values()];
    return shuffle(groups).slice(0, size).map(group => shuffle(group)[0]);
  };

  const startSession = (mode) => {
    const attempts = loadAttempts();
    state.mode = mode;
    state.sessionId = uid();
    state.questions = mode === "diagnostic"
      ? diagnosticSample(bank, Math.min(SESSION_SIZE, 100))
      : weightedKnowledgeSample(bank, SESSION_SIZE, attempts);
    state.index = 0;
    state.sessionAttempts = [];
    showView($("quizView"));
    renderQuestion();
  };

  const renderQuestion = () => {
    const q = state.questions[state.index];
    state.selected = null;
    state.locked = false;
    state.startedAt = performance.now();
    $("feedback").className = "feedback hidden";
    $("feedback").innerHTML = "";
    $("submitBtn").classList.remove("hidden");
    $("nextBtn").classList.add("hidden");

    $("progressText").textContent = `${state.index + 1} / ${state.questions.length}`;
    $("progressBar").style.width = `${((state.index + 1) / state.questions.length) * 100}%`;
    $("questionContext").textContent = q.context || "";
    $("questionPrompt").textContent = q.prompt;
    $("questionTags").innerHTML = [q.cefr, q.category, q.skill, q.domain]
      .map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("");

    if (q.type === "mcq") {
      $("answerArea").innerHTML = `<div class="choice-list">${q.options.map((o, i) =>
        `<button class="choice" type="button" data-value="${escapeHtml(o)}"><strong>${String.fromCharCode(65 + i)}.</strong> ${escapeHtml(o)}</button>`
      ).join("")}</div>`;
      document.querySelectorAll(".choice").forEach(btn => {
        btn.addEventListener("click", () => {
          if (state.locked) return;
          document.querySelectorAll(".choice").forEach(b => b.classList.remove("selected"));
          btn.classList.add("selected");
          state.selected = btn.dataset.value;
        });
      });
    } else {
      $("answerArea").innerHTML = `<input id="typingInput" class="typing-input" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Type your answer" />`;
      $("typingInput").addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !state.locked) submitAnswer();
      });
      setTimeout(() => $("typingInput")?.focus(), 50);
    }
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  }

  const getNearMiss = (q, rawAnswer) => {
    if (!q.nearMisses) return null;
    return q.nearMisses[normalize(rawAnswer)] || null;
  };

  const getDictionaryCache = () => loadJson(DICT_CACHE_KEY, {});
  const setDictionaryCache = (cache) => saveJson(DICT_CACHE_KEY, cache);

  const fetchDictionaryEntry = async (word) => {
    if (!word) return null;
    const key = normalize(word);
    const cache = getDictionaryCache();
    if (cache[key]) return cache[key];

    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (!response.ok) throw new Error("dictionary lookup failed");
      const data = await response.json();
      const entry = data?.[0];
      const phonetics = entry?.phonetics || [];
      const phonetic = entry?.phonetic || phonetics.find(p => p.text)?.text || "";
      const audioRaw = phonetics.find(p => p.audio)?.audio || "";
      const audio = audioRaw.startsWith("//") ? `https:${audioRaw}` : audioRaw;
      const compact = { phonetic, audio };
      cache[key] = compact;
      setDictionaryCache(cache);
      return compact;
    } catch {
      cache[key] = { phonetic: "", audio: "" };
      setDictionaryCache(cache);
      return cache[key];
    }
  };

  const speakWithBrowser = (text) => {
    if (!("speechSynthesis" in window)) return false;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
    return true;
  };

  const bindPronunciation = (q, dictionaryData) => {
    const btn = document.getElementById("pronounceBtn");
    if (!btn) return;
    btn.disabled = false;
    btn.addEventListener("click", () => {
      if (dictionaryData?.audio) {
        const audio = new Audio(dictionaryData.audio);
        audio.play().catch(() => speakWithBrowser(q.word));
      } else {
        speakWithBrowser(q.word);
      }
    });
  };

  const hydrateWordInfo = async (q) => {
    if (!q.word) return;
    const ipaEl = document.getElementById("wordIpa");
    const sourceEl = document.getElementById("pronounceSource");
    const btn = document.getElementById("pronounceBtn");
    if (!ipaEl || !btn) return;

    const data = await fetchDictionaryEntry(q.dictionaryWord || q.word);
    ipaEl.textContent = data?.phonetic ? `/${data.phonetic.replace(/^\/|\/$/g, "")}/` : "IPA unavailable";
    sourceEl.textContent = data?.audio ? "Dictionary audio" : "Browser voice";
    bindPronunciation(q, data);
  };

  const renderWordCard = (q) => {
    if (!q.word) return "";
    return `
      <section class="word-card">
        <div class="word-card-head">
          <div>
            <span class="word-label">WORD / PHRASE</span>
            <strong class="word-term">${escapeHtml(q.word)}</strong>
            <span id="wordIpa" class="word-ipa">loading IPA…</span>
          </div>
          <button id="pronounceBtn" class="pronounce-btn" type="button" disabled>▶ 發音</button>
        </div>
        <div class="word-meaning"><strong>${escapeHtml(q.meaningZh || "")}</strong></div>
        <div class="word-definition">${escapeHtml(q.definitionEn || "")}</div>
        <div id="pronounceSource" class="word-source">Dictionary lookup</div>
      </section>
    `;
  };

  const submitAnswer = () => {
    if (state.locked) return;
    const q = state.questions[state.index];
    const responseMs = Math.round(performance.now() - state.startedAt);
    const rawAnswer = q.type === "mcq" ? state.selected : ($("typingInput")?.value || "");
    if (!rawAnswer || !normalize(rawAnswer)) return;

    const accepted = (q.accepted || [q.answer]).map(normalize);
    const correct = accepted.includes(normalize(rawAnswer));
    const nearMiss = correct ? null : getNearMiss(q, rawAnswer);
    state.locked = true;

    const attempt = {
      attemptId: uid(),
      sessionId: state.sessionId,
      bankVersion: BANK_VERSION,
      timestamp: new Date().toISOString(),
      mode: state.mode,
      questionIndex: state.index,
      questionId: q.id,
      cefr: q.cefr,
      category: q.category,
      domain: q.domain,
      skill: q.skill,
      knowledge: q.knowledge,
      learningStage: q.learningStage || null,
      questionType: q.type,
      answer: rawAnswer,
      correctAnswer: q.answer,
      correct,
      errorType: correct ? null : (nearMiss?.type || "incorrect"),
      nearMiss: Boolean(nearMiss),
      responseMs
    };

    const all = loadAttempts();
    all.push(attempt);
    saveAttempts(all);
    state.sessionAttempts.push(attempt);

    if (q.type === "typing") $("typingInput").disabled = true;

    const feedback = $("feedback");

    if (state.mode === "diagnostic") {
      feedback.className = "feedback neutral";
      feedback.innerHTML = `
        <strong>已記錄</strong>
        <div class="answer-note">診斷模式不立即揭示答案，避免前一題影響後續測量。</div>
      `;
    } else {
      if (q.type === "mcq") {
        document.querySelectorAll(".choice").forEach(btn => {
          const val = normalize(btn.dataset.value);
          if (val === normalize(q.answer)) btn.classList.add("correct");
          if (btn.classList.contains("selected") && !correct) btn.classList.add("incorrect");
        });
      }

      const statusHtml = nearMiss
        ? `<strong>接近，但還差一點</strong>
           <div class="answer-note">${escapeHtml(nearMiss.feedback || "概念接近，但搭配或形式還需要調整。")}</div>
           <div class="answer-note">建議答案：${escapeHtml(q.answer)}</div>`
        : `<strong>${correct ? "答對了" : `正確答案：${escapeHtml(q.answer)}`}</strong>`;

      feedback.className = `feedback ${nearMiss ? "near" : (correct ? "correct" : "incorrect")}`;
      feedback.innerHTML = `
        ${statusHtml}
        ${renderWordCard(q)}
        <div class="answer-note">${escapeHtml(q.note || "")}</div>
        ${q.example ? `<div class="example">${escapeHtml(q.example)}</div>` : ""}
      `;

      if (q.word) hydrateWordInfo(q);
    }

    $("submitBtn").classList.add("hidden");
    $("nextBtn").classList.remove("hidden");
    updateDashboard();
  };

  const nextQuestion = () => {
    if (state.index + 1 >= state.questions.length) return finishSession();
    state.index += 1;
    renderQuestion();
  };

  const aggregateWeaknesses = (attempts) => {
    const groups = new Map();
    attempts.forEach(a => {
      [
        [`skill:${a.skill}`, a.skill, "skill"],
        [`category:${a.category}`, a.category, "category"],
        [`knowledge:${a.knowledge}`, a.knowledge, "knowledge"],
        [`cefr:${a.cefr}`, `${a.cefr} overall`, "cefr"]
      ].forEach(([key, label, groupType]) => {
        if (!groups.has(key)) groups.set(key, { label, groupType, total: 0, correct: 0, ms: 0 });
        const g = groups.get(key);
        g.total += 1;
        if (a.correct) g.correct += 1;
        g.ms += a.responseMs;
      });
    });

    return [...groups.values()]
      .filter(g => g.groupType === "knowledge" ? (g.total >= 1 && g.correct < g.total) : g.total >= 2)
      .map(g => ({
        ...g,
        accuracy: g.correct / g.total,
        avgMs: g.ms / g.total,
        evidence: g.total >= 3 ? "moderate" : "early"
      }))
      .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);
  };

  const updateDashboard = () => {
    const attempts = loadAttempts();
    $("totalAnswered").textContent = attempts.length;
    if (!attempts.length) {
      $("overallAccuracy").textContent = "—";
      $("avgResponse").textContent = "—";
      $("weakCount").textContent = "0";
      $("dataStatus").textContent = "尚無資料";
      $("weaknessList").className = "weakness-list empty-state";
      $("weaknessList").textContent = "完成第一輪作答後，這裡會開始顯示弱點。";
      return;
    }

    const correct = attempts.filter(a => a.correct).length;
    const avgMs = attempts.reduce((s, a) => s + a.responseMs, 0) / attempts.length;
    $("overallAccuracy").textContent = `${Math.round(correct / attempts.length * 100)}%`;
    $("avgResponse").textContent = `${(avgMs / 1000).toFixed(1)}s`;
    $("dataStatus").textContent = `${attempts.length} attempts`;

    const weaknesses = aggregateWeaknesses(attempts).filter(g => g.accuracy < .8).slice(0, 6);
    $("weakCount").textContent = weaknesses.length;
    if (!weaknesses.length) {
      $("weaknessList").className = "weakness-list empty-state";
      $("weaknessList").textContent = "目前還沒有明顯弱點；繼續累積作答資料。";
    } else {
      $("weaknessList").className = "weakness-list";
      $("weaknessList").innerHTML = weaknesses.map(g => `
        <div class="weak-row">
          <div><strong>${escapeHtml(g.label)}</strong><small>${g.correct}/${g.total} correct · avg ${(g.avgMs / 1000).toFixed(1)}s · ${g.evidence === "early" ? "early signal" : "repeated signal"}</small></div>
          <div class="weak-score">${Math.round(g.accuracy * 100)}%</div>
        </div>`).join("");
    }
  };

  const finishSession = () => {
    const s = state.sessionAttempts;
    const correct = s.filter(a => a.correct).length;
    const accuracy = s.length ? correct / s.length : 0;
    $("sessionAccuracy").textContent = `${Math.round(accuracy * 100)}%`;
    $("sessionSummary").textContent = `${correct} / ${s.length} correct${state.mode === "diagnostic" ? " · diagnostic" : ""}`;

    const weak = aggregateWeaknesses(s).filter(g => g.accuracy < .8).slice(0, 4);
    $("sessionInsights").innerHTML = weak.length
      ? weak.map(g => `<div class="insight"><strong>${escapeHtml(g.label)}</strong>：${Math.round(g.accuracy * 100)}% correct${g.evidence === "early" ? "（目前只是初步訊號）" : ""}。</div>`).join("")
      : `<div class="insight">這輪沒有明顯弱點。下一輪會增加主動回憶與較少出現的知識點。</div>`;

    showView($("resultView"));
    updateDashboard();
  };

  const exportAttempts = (onlySession = false) => {
    const attempts = onlySession ? state.sessionAttempts : loadAttempts();
    const payload = {
      schemaVersion: 3,
      bankVersion: BANK_VERSION,
      questionBank: window.QUESTION_META || null,
      exportedAt: new Date().toISOString(),
      summary: {
        attempts: attempts.length,
        correct: attempts.filter(a => a.correct).length,
        weaknesses: aggregateWeaknesses(attempts).slice(0, 20)
      },
      attempts
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `english-training-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  $("startBtn").addEventListener("click", () => startSession("training"));
  $("diagnosticBtn").addEventListener("click", () => startSession("diagnostic"));
  $("submitBtn").addEventListener("click", submitAnswer);
  $("nextBtn").addEventListener("click", nextQuestion);
  $("quitBtn").addEventListener("click", () => { showView($("homeView")); updateDashboard(); });
  $("backHomeBtn").addEventListener("click", () => { showView($("homeView")); updateDashboard(); });
  $("exportBtn").addEventListener("click", () => exportAttempts(false));
  $("exportResultBtn").addEventListener("click", () => exportAttempts(true));

  updateDashboard();
})();
