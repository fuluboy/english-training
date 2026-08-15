# English Training Lab

Personal adaptive English practice focused on CEFR B1 foundations and B2 Product / PM workplace English.

## Stage 1

Stage 1 contains **500 questions across 100 knowledge points**:

- 400 vocabulary / collocation / phrasal verb / Product & PM questions
- 100 CEFR B1 grammar questions
- recognition, contextual discrimination, Chinese → English active recall, and definition → word recall
- concrete workplace and Product / PM situations
- plausible distractors rather than unrelated choices

The bank is designed to expose lower-level gaps even when more advanced professional vocabulary is familiar.

## Adaptive learning

A daily training session contains 20 knowledge points. Historical answer accuracy, repeated exposure, response time, and time since last practice affect which knowledge points return. A knowledge point can appear in multiple question forms, so one correct answer is not treated as mastery.

Answer attempts are stored locally in the browser under `english-training-attempts-v1`. Existing MVP attempt history remains compatible with the Stage 1 bank. The Export button downloads JSON containing raw attempts, response time, question metadata, and weakness summaries for review and question-bank adjustment.

## Answer feedback

For lexical questions, the answer panel keeps the original explanation and example sentence and adds:

- Chinese meaning
- short English definition
- IPA lookup
- pronunciation button

IPA and available dictionary audio are loaded from the Free Dictionary API and cached locally. If dictionary audio is unavailable, the app falls back to the browser's English speech synthesis.

## Question quality principles

- Use concrete contexts.
- Distractors should be meaningfully plausible.
- Track vocabulary, grammar, collocation, phrasal verbs, and active recall separately.
- Preserve useful example sentences in answer explanations.
- Record near misses such as missing prepositions or confusion between related PM terms.
- Retire or rewrite ambiguous / low-value questions as daily logs reveal them.

## Repository structure

```text
index.html
styles.css
manifest.webmanifest
js/
  app.js
  questions.js
  data/
    lex1.js ... lex4.js
    gram1.js ... gram4.js
.github/
  workflows/
    pages.yml
```

## Local run

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deployment

Pushes to `main` deploy the static app through GitHub Actions to GitHub Pages. The repository's Pages source must be set to **GitHub Actions**.

Expected site URL:

`https://fuluboy.github.io/english-training/`

## Next milestone

Stage 2 will expand the bank from 500 to 1,000 questions, with more B1→B2 productive recall, interview language, Product / PM scenarios, and new questions generated from actual weakness patterns in daily logs.
