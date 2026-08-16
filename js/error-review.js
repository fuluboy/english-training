(() => {
  const ATTEMPTS_KEY = "english-training-attempts-v1";
  const REVIEWED_KEY = "english-training-reviewed-words-v1";
  const DICT_CACHE_KEY = "english-training-dictionary-cache-v1";
  const bank = window.QUESTION_BANK || [];

  const $ = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[c]));

  const loadJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };
  const saveJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const masteryCredit = (a) => Number.isFinite(a.masteryCredit) ? Math.max(0, Math.min(1, a.masteryCredit)) : (a.correct ? 1 : 0);

  const lexicalByKnowledge = new Map();
  bank.filter(q => q.word).forEach(q => {
    if (!lexicalByKnowledge.has(q.knowledge)) lexicalByKnowledge.set(q.knowledge, q);
    const current = lexicalByKnowledge.get(q.knowledge);
    if ((q.learningStage || 9) < (current.learningStage || 9)) lexicalByKnowledge.set(q.knowledge, q);
  });

  let activeFilter = "due";

  const getEntries = () => {
    const attempts = loadJson(ATTEMPTS_KEY, []);
    const reviewed = new Set(loadJson(REVIEWED_KEY, []));
    const groups = new Map();

    attempts.forEach(a => {
      const q = lexicalByKnowledge.get(a.knowledge);
      if (!q) return;
      if (!groups.has(a.knowledge)) {
        groups.set(a.knowledge, { knowledge: a.knowledge, q, total: 0, score: 0, incorrect: 0, exact: 0, alternatives: 0, lastAt: 0, lastWrongAt: 0 });
      }
      const g = groups.get(a.knowledge);
      g.total += 1;
      g.score += masteryCredit(a);
      if (a.correct) {
        if (a.acceptedAlternative) g.alternatives += 1;
        else g.exact += 1;
      } else {
        g.incorrect += 1;
        g.lastWrongAt = Math.max(g.lastWrongAt, new Date(a.timestamp).getTime() || 0);
      }
      g.lastAt = Math.max(g.lastAt, new Date(a.timestamp).getTime() || 0);
    });

    return [...groups.values()]
      .filter(g => g.incorrect > 0)
      .map(g => ({ ...g, mastery: g.total ? g.score / g.total : 0, reviewed: reviewed.has(g.knowledge) }))
      .sort((a, b) => {
        if (a.reviewed !== b.reviewed) return a.reviewed ? 1 : -1;
        if (a.mastery !== b.mastery) return a.mastery - b.mastery;
        if (a.incorrect !== b.incorrect) return b.incorrect - a.incorrect;
        return b.lastWrongAt - a.lastWrongAt;
      });
  };

  const dueEntries = (entries) => entries.filter(e => !e.reviewed && (e.mastery < 0.8 || e.incorrect >= 2));

  const updateHomeBadge = () => {
    const btn = $("errorVocabBtn");
    if (!btn) return;
    const count = dueEntries(getEntries()).length;
    btn.textContent = count ? `錯誤單字表 · ${count}` : "錯誤單字表";
  };

  const showReview = () => {
    $("homeView")?.classList.add("hidden");
    $("quizView")?.classList.add("hidden");
    $("resultView")?.classList.add("hidden");
    $("reviewView")?.classList.remove("hidden");
    renderList();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showHome = () => {
    $("reviewView")?.classList.add("hidden");
    $("homeView")?.classList.remove("hidden");
    updateHomeBadge();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setFilter = (filter) => {
    activeFilter = filter;
    document.querySelectorAll("[data-review-filter]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.reviewFilter === filter);
    });
    renderList();
  };

  const markReviewed = (knowledge, reviewed) => {
    const set = new Set(loadJson(REVIEWED_KEY, []));
    if (reviewed) set.add(knowledge); else set.delete(knowledge);
    saveJson(REVIEWED_KEY, [...set]);
    renderList();
    updateHomeBadge();
  };

  const speakWithBrowser = (text) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  };

  const fetchDictionaryEntry = async (q) => {
    const word = q.dictionaryWord || q.word;
    if (!word) return { phonetic: "", audio: "" };
    const key = String(word).toLowerCase();
    const cache = loadJson(DICT_CACHE_KEY, {});
    if (cache[key]) return cache[key];
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (!response.ok) throw new Error("lookup failed");
      const data = await response.json();
      const entry = data?.[0];
      const phonetics = entry?.phonetics || [];
      const phonetic = entry?.phonetic || phonetics.find(p => p.text)?.text || "";
      const audioRaw = phonetics.find(p => p.audio)?.audio || "";
      const audio = audioRaw.startsWith("//") ? `https:${audioRaw}` : audioRaw;
      cache[key] = { phonetic, audio };
      saveJson(DICT_CACHE_KEY, cache);
      return cache[key];
    } catch {
      cache[key] = { phonetic: "", audio: "" };
      saveJson(DICT_CACHE_KEY, cache);
      return cache[key];
    }
  };

  const revealCard = async (button, entry) => {
    const card = button.closest(".vocab-review-card");
    const answer = card?.querySelector(".vocab-review-answer");
    if (!answer) return;
    const hidden = answer.classList.toggle("hidden");
    button.textContent = hidden ? "顯示英文" : "收起答案";
    if (hidden || answer.dataset.hydrated === "true") return;

    answer.dataset.hydrated = "true";
    const ipa = answer.querySelector(".review-ipa");
    const audioBtn = answer.querySelector(".review-audio-btn");
    const dictionary = await fetchDictionaryEntry(entry.q);
    if (ipa) ipa.textContent = dictionary.phonetic ? `/${dictionary.phonetic.replace(/^\/|\/$/g, "")}/` : "IPA unavailable";
    if (audioBtn) {
      audioBtn.disabled = false;
      audioBtn.addEventListener("click", () => {
        if (dictionary.audio) new Audio(dictionary.audio).play().catch(() => speakWithBrowser(entry.q.word));
        else speakWithBrowser(entry.q.word);
      });
    }
  };

  const renderCard = (entry) => {
    const q = entry.q;
    const mastery = Math.round(entry.mastery * 100);
    const status = entry.reviewed ? "已標記熟悉" : entry.incorrect >= 2 ? `重複答錯 ${entry.incorrect} 次` : "答錯 1 次";
    return `
      <article class="vocab-review-card" data-knowledge="${escapeHtml(entry.knowledge)}">
        <div class="vocab-review-front">
          <div class="review-copy">
            <div class="review-meta">
              <span class="tag">${escapeHtml(q.cefr)}</span>
              <span class="tag">${escapeHtml(q.domain)}</span>
              <span class="review-error-count">${escapeHtml(status)}</span>
            </div>
            <strong class="review-zh">${escapeHtml(q.meaningZh || entry.knowledge)}</strong>
            <span class="review-progress">歷史掌握 ${mastery}% · ${entry.score}/${entry.total} mastery credit</span>
          </div>
          <div class="review-actions">
            <button class="secondary-btn review-reveal-btn" type="button">顯示英文</button>
            <button class="ghost-btn review-known-btn" type="button">${entry.reviewed ? "移回待背" : "我記住了"}</button>
          </div>
        </div>
        <div class="vocab-review-answer hidden">
          <div class="review-word-head">
            <div>
              <strong class="review-word">${escapeHtml(q.word)}</strong>
              <span class="review-ipa">loading IPA…</span>
            </div>
            <button class="pronounce-btn review-audio-btn" type="button" disabled>▶ 發音</button>
          </div>
          <div class="review-definition">${escapeHtml(q.definitionEn || "")}</div>
          ${q.note ? `<div class="review-note"><strong>用法：</strong>${escapeHtml(q.note)}</div>` : ""}
          ${q.example ? `<div class="review-example"><strong>例句：</strong>${escapeHtml(q.example)}</div>` : ""}
        </div>
      </article>`;
  };

  const renderList = () => {
    const list = $("errorVocabList");
    if (!list) return;
    const all = getEntries();
    const due = dueEntries(all);
    const reviewed = all.filter(e => e.reviewed);
    let entries = activeFilter === "all" ? all.filter(e => !e.reviewed)
      : activeFilter === "repeated" ? all.filter(e => !e.reviewed && e.incorrect >= 2)
      : activeFilter === "reviewed" ? reviewed
      : due;

    $("errorVocabSummary").textContent = `待背 ${due.length} · 曾答錯 ${all.length} · 已標記熟悉 ${reviewed.length}`;

    if (!entries.length) {
      list.innerHTML = `<div class="review-empty">這個分類目前沒有單字。繼續做題，新的錯題會自動出現在這裡。</div>`;
      return;
    }

    list.innerHTML = entries.map(renderCard).join("");
    list.querySelectorAll(".vocab-review-card").forEach((card, index) => {
      const entry = entries[index];
      card.querySelector(".review-reveal-btn")?.addEventListener("click", (e) => revealCard(e.currentTarget, entry));
      card.querySelector(".review-known-btn")?.addEventListener("click", () => markReviewed(entry.knowledge, !entry.reviewed));
    });
  };

  $("errorVocabBtn")?.addEventListener("click", showReview);
  $("reviewBackBtn")?.addEventListener("click", showHome);
  document.querySelectorAll("[data-review-filter]").forEach(btn => btn.addEventListener("click", () => setFilter(btn.dataset.reviewFilter)));

  updateHomeBadge();
})();
