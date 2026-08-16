(() => {
  const alternatives = {
    "confirm": ["verify", "check"],
    "check": ["verify", "review"],
    "review": ["examine"],
    "prepare": ["get ready"],
    "arrange": ["organize", "set up"],
    "schedule": ["book", "arrange"],
    "cancel": ["call off"],
    "postpone": ["delay", "put off"],
    "update": ["revise"],
    "share": ["communicate", "send"],
    "mention": ["bring up"],
    "describe": ["explain"],
    "respond": ["reply", "react"],
    "request": ["ask for"],
    "approve": ["authorize", "sign off on"],
    "reject": ["decline", "turn down"],
    "accept": ["agree to"],
    "agree with": ["support"],
    "disagree with": ["object to"],
    "ask for": ["request"],
    "wait for": ["await"],
    "be responsible for": ["be in charge of", "own"],
    "be aware of": ["know about"],
    "be familiar with": ["have experience with", "know well"],
    "be interested in": ["want to learn about"],
    "be able to": ["can"],
    "be likely to": ["be expected to"],
    "be supposed to": ["be expected to"],
    "be willing to": ["be ready to"],
    "take care of": ["handle", "deal with"],
    "get back to": ["reply to", "follow up with"],
    "come up with": ["think of", "develop"],
    "figure out": ["work out", "determine"],
    "go over": ["review"],
    "hand over": ["transfer", "pass on"],
    "look into": ["investigate", "examine"],
    "keep track of": ["monitor", "track"],
    "run into": ["encounter"],
    "work out": ["solve", "resolve"],
    "make progress": ["move forward", "advance"],
    "analyze": ["analyse", "examine"],
    "synthesize": ["combine", "integrate"],
    "uncover": ["discover", "reveal"],
    "assess": ["evaluate"],
    "quantify": ["measure"],
    "benchmark": ["compare against"],
    "segment": ["group"],
    "map out": ["map", "outline"],
    "prototype": ["mock up"],
    "test": ["try", "evaluate"],
    "observe": ["watch"],
    "recruit": ["enlist", "find participants"],
    "capture": ["record", "collect"],
    "document": ["record", "write down"],
    "articulate": ["express", "explain clearly"],
    "communicate": ["convey", "share"],
    "negotiate": ["work out"],
    "challenge": ["question"],
    "frame": ["define", "position"],
    "de-risk": ["reduce risk", "mitigate risk"],
    "roll out": ["release", "launch"],
    "phase in": ["introduce gradually"],
    "phase out": ["retire gradually"],
    "sunset": ["retire", "discontinue"],
    "migrate": ["move", "transfer"],
    "retain": ["keep"],
    "acquire": ["gain"],
    "instrument": ["add tracking"],
    "diagnose": ["identify the cause", "investigate"],
    "experiment with": ["test", "try"],
    "establish": ["set", "create"],
    "interpret": ["make sense of", "explain"],
    "derive": ["obtain", "draw"],
    "correlate": ["associate", "link"],
    "attribute": ["ascribe", "link"],
    "forecast": ["predict", "project"],
    "propose": ["suggest"],
    "take ownership": ["take responsibility", "own"],
    "drive alignment": ["align the team", "create alignment"],
    "build consensus": ["reach agreement", "create consensus"],
    "manage expectations": ["set expectations"],
    "set priorities": ["prioritize"],
    "resolve conflict": ["settle disagreement"],
    "influence stakeholders": ["persuade stakeholders"],
    "advocate for users": ["represent users", "speak up for users"],
    "balance needs": ["weigh needs"],
    "make a decision": ["decide"],
    "meet a deadline": ["finish on time", "deliver on time"],
    "raise a concern": ["voice a concern", "flag a concern"],
    "escalate an issue": ["raise the issue", "escalate"],
    "take initiative": ["act proactively", "be proactive"],
    "follow through": ["carry through"],
    "keep someone informed": ["keep someone updated", "update someone"],
    "push back on": ["challenge", "resist"],
    "learn from failure": ["learn from mistakes"],
    "adapt to change": ["adjust to change"],
    "demonstrate impact": ["show impact", "prove impact"]
  };

  const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  (window.QUESTION_BANK || []).forEach(q => {
    if (!/^(B1-WRK|B2-PRO|B2-INT)-/.test(q.id)) return;

    if (q.type === "typing" && alternatives[q.word]) {
      q.alternatives = [...new Set([...(q.alternatives || []), ...alternatives[q.word]])];
    }

    if (q.id.endsWith("-C") && q.knowledge && q.word) {
      const rx = new RegExp(escapeRegex(q.word), "i");
      if (rx.test(q.knowledge)) {
        const collocation = q.knowledge.replace(rx, "_____");
        q.context = "中文 → 英文主動回憶。先依語境叫出目標詞；自然且意思相符的替代表達也會被接受。";
        q.prompt = `「${q.meaningZh}」\n完成這個常用搭配：\n${collocation}`;
      }
    }
  });

  if (window.QUESTION_META) {
    window.QUESTION_META.version = "stage2-1000-v1";
    window.QUESTION_META.stage1 = 500;
    window.QUESTION_META.stage2 = 500;
  }
})();
