(() => {
  const lexicalTargets = [...(window.LEXICAL_SEEDS || [])];

  const withoutOnTime = lexicalTargets.filter(t => t[4] !== "on time");
  withoutOnTime.push([
    "B1-LEX-040","B1","Collocation","Workplace","address","處理、著手解決",
    "take action to deal with a problem, concern, or need",
    "address an issue",
    "We need to address the issue before the next release.",
    "The roadmap update addresses the biggest concern raised by the sales team.",
    "address"
  ]);

  const L = withoutOnTime;
  const G = window.GRAMMAR_SEEDS || [];

  const hash = s => [...String(s)].reduce((n, c) => ((n * 31) + c.charCodeAt(0)) >>> 0, 7);
  const rotate = (values, seed) => {
    const unique = [...new Set(values)];
    const offset = unique.length ? hash(seed) % unique.length : 0;
    return unique.slice(offset).concat(unique.slice(0, offset));
  };
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hasTerm = (sentence, term) => new RegExp(esc(term), "i").test(sentence);
  const blank = (sentence, term) => sentence.replace(new RegExp(esc(term), "i"), "_____");

  const canonicalKnowledge = {
    "clarify the requirements": "clarify requirements"
  };

  const noteOverrides = {
    "clarify": "clarify 常和 requirements / expectations / roles 搭配，重點是把模糊處說清楚。",
    "remind": "remind + 人 + about/to；remember 表示自己記得，兩者不要混用。",
    "attend": "attend 後面直接接 meeting / workshop / event，通常不需要介系詞。",
    "avoid": "avoid 後面常接名詞或 V-ing，例如 avoid delays / avoid making mistakes。",
    "suggest": "suggest 可接 V-ing 或 that 子句；一般不說 suggest to do。",
    "recommend": "recommend 可接名詞或 V-ing；recommend doing 比 recommend to do 自然。",
    "explain": "explain something to someone；不要說 explain me something。",
    "discuss": "discuss 後直接接主題，一般不說 discuss about the issue。",
    "focus on": "focus on + 名詞/V-ing，介系詞 on 不可省略。",
    "depend on": "depend on + 名詞；第三人稱單數要用 depends on。",
    "deal with": "deal with 必須保留 with；只寫 deal the issue 不完整。",
    "point out": "point out + 內容；常用來指出問題、風險或事實。",
    "find out": "find out 強調取得未知資訊；常接 why / whether / what。",
    "result from": "result from = 原因在後面；result in = 結果在後面。",
    "instead of": "instead of 後接名詞或 V-ing。",
    "prioritize": "prioritize 常搭配 features / tasks / problems / requirements，表示依價值、風險或資源決定先後。",
    "validate": "validate an assumption / hypothesis = 用證據確認假設是否成立。",
    "align": "align on + 方向/方案；align with + 目標/策略。",
    "mitigate": "mitigate risk 不表示完全消除風險，而是降低發生機率或影響。",
    "measure": "measure impact / performance / outcome；重點是取得可比較的數值。",
    "monitor": "monitor 強調持續觀察一段時間；measure 更偏向量化某個結果。",
    "identify": "identify = 找出「是什麼」；investigate = 深入查原因與細節。",
    "dependency": "dependency = 某項工作取決於另一件事或另一團隊的產出。",
    "assumption": "assumption 是暫時視為成立的前提；重要假設應該被驗證。",
    "constraint": "constraint 常見於 time / budget / technical / resource constraints。",
    "trade-off": "trade-off 強調兩個目標無法同時最大化，需要做選擇。",
    "metric": "metric 是可量化指標；使用前要先定義它代表哪個產品或商業結果。",
    "outcome": "outcome 聚焦最後產生的改變；output 只是產出物。",
    "friction": "friction 常指讓使用者變慢、困惑或放棄的阻力。",
    "bottleneck": "bottleneck 是限制整體流速或產能的關鍵環節。",
    "root cause": "root cause 是問題背後真正造成事件發生的原因。",
    "pain point": "pain point 是具體困擾或阻礙，最好能用研究或數據證明。",
    "hypothesis": "hypothesis 應該可以被測試與證偽；比一般 assumption 更適合實驗驗證。",
    "address": "address an issue = 著手處理問題；語氣比 fix 更廣，也很適合面試敘述。"
  };

  const distractorOverrides = {
    "validate": ["assume", "evaluate", "verify"],
    "dependency": ["assumption", "constraint", "metric"],
    "align": ["launch", "coordinate", "prioritize"],
    "measure": ["monitor", "evaluate", "estimate"],
    "mitigate": ["avoid", "monitor", "resolve"],
    "deal with": ["point out", "follow up", "focus on"],
    "address": ["handle", "solve", "deal with"],
    "assumption": ["dependency", "hypothesis", "constraint"],
    "monitor": ["measure", "evaluate", "track"]
  };

  const groups = {};
  for (const t of L) {
    const category = t[2];
    const term = t[4];
    const key = category.includes("Product Term") ? "noun" :
      (category.includes("Phrasal") || category.includes("Preposition") || term.includes(" ")) ? "phrase" : "word";
    (groups[key] ??= []).push(term);
  }

  const lexicalQuestions = [];
  L.forEach((t, i) => {
    const [code, cefr, category, domain, term, zh, definitionEn, rawKnowledge, ex1, ex2, dictionaryWord] = t;
    const knowledge = canonicalKnowledge[rawKnowledge] || rawKnowledge;
    const key = category.includes("Product Term") ? "noun" :
      (category.includes("Phrasal") || category.includes("Preposition") || term.includes(" ")) ? "phrase" : "word";
    const pool = groups[key].filter(x => x !== term);
    const preferred = distractorOverrides[term] || [];
    const fallback = rotate(pool, `${code}-pool`);
    const distractors = [...new Set([...preferred, ...fallback])].filter(x => x && x !== term).slice(0, 3);
    if (distractors.length !== 3) throw new Error(`Unable to build three distractors for ${term}`);
    const options = seed => rotate([term, ...distractors], seed);
    const note = noteOverrides[term] || `${term} = ${zh}。常見搭配：${rawKnowledge}。`;
    const common = {
      cefr, category, domain, knowledge, word: term, dictionaryWord,
      meaningZh: zh, definitionEn, note
    };

    const contextualPrompt = (example) => hasTerm(example, term)
      ? blank(example, term)
      : `Complete the natural collocation:\n${blank(rawKnowledge, term)}`;

    lexicalQuestions.push(
      {
        ...common, id: `${code}-A`, skill: "Recognition", type: "mcq", learningStage: 1,
        context: "Choose the word or phrase that makes the sentence most natural.",
        prompt: contextualPrompt(ex1), options: options(`${code}A`), answer: term, example: ex1
      },
      {
        ...common, id: `${code}-B`, skill: "Recognition in context", type: "mcq", learningStage: 2,
        context: "Read the situation carefully; the alternatives are intentionally related.",
        prompt: contextualPrompt(ex2), options: options(`${code}B`), answer: term, example: ex2
      },
      {
        ...common, id: `${code}-C`, skill: "Productive", category: "Active Recall", type: "typing", learningStage: 3,
        context: "中文 → 英文主動回憶。請輸入目標單字或片語。",
        prompt: `「${zh}」\n_____`, answer: term, accepted: [term], example: ex1
      },
      {
        ...common, id: `${code}-D`, skill: "Productive", category: "Active Recall", type: "typing", learningStage: 4,
        context: "Definition → word / phrase. Try to retrieve it without choices.",
        prompt: definitionEn, answer: term, accepted: [term], example: ex2
      },
      {
        ...common, id: `${code}-E`, skill: "Meaning discrimination", type: "mcq", learningStage: 5,
        context: "Choose the most precise English expression.",
        prompt: `Which option best matches 「${zh}」?`, options: options(`${code}E`), answer: term, example: ex1
      }
    );
  });

  const grammarQuestions = [];
  G.forEach(rule => {
    const [code, knowledge, skill, note, examples] = rule;
    examples.forEach((e, i) => {
      const [context, prompt, answer, d1, d2, d3, example] = e;
      const grammarOptions = rotate([answer, d1, d2, d3], `${code}${i}`);
      if (grammarOptions.length !== 4) throw new Error(`Grammar question ${code}-${i + 1} needs four unique options`);
      grammarQuestions.push({
        id: `${code}-${i + 1}`,
        cefr: "B1",
        category: "Grammar",
        domain: /team|project|release|product|user|dashboard|client|api|roadmap|conversion|engineering|PM/i.test(context + " " + prompt) ? "Workplace" : "General",
        skill, type: "mcq", context, prompt,
        options: grammarOptions,
        answer, knowledge, note, example, learningStage: i + 1
      });
    });
  });

  const nearMissMap = {
    "B1-LEX-028-C": {
      "deal": { type: "missing-preposition", feedback: "deal 的方向正確，但這個片語必須是 deal with。" }
    },
    "B1-LEX-028-D": {
      "deal": { type: "missing-preposition", feedback: "deal 的方向正確，但這個片語必須是 deal with。" }
    },
    "B1-LEX-040-C": {
      "deal": { type: "word-choice", feedback: "deal 需要 with；若題目要求一個可直接接 issue 的動詞，可用 address。" },
      "deal with": { type: "synonym", feedback: "deal with 語意可以，但這一輪正在訓練 address an issue。" }
    },
    "B2-PM-042-C": {
      "assume": { type: "concept-confusion", feedback: "assume = 假定；validate = 用證據驗證假設。" },
      "presume": { type: "concept-confusion", feedback: "presume = 假定；validate = 用證據驗證假設。" },
      "persume": { type: "spelling-and-concept", feedback: "你可能想到 presume（假定）；這題需要 validate（驗證）。" }
    }
  };
  lexicalQuestions.forEach(q => { if (nearMissMap[q.id]) q.nearMisses = nearMissMap[q.id]; });

  window.QUESTION_BANK = [...lexicalQuestions, ...grammarQuestions];
  window.QUESTION_META = {
    version: "stage1-500-v1",
    total: window.QUESTION_BANK.length,
    lexical: lexicalQuestions.length,
    grammar: grammarQuestions.length,
    knowledgePoints: new Set(window.QUESTION_BANK.map(q => q.knowledge)).size
  };
})();
