# English Training Lab

Adaptive English practice built around real weaknesses instead of a fixed CEFR word list.

## MVP goals

- Mobile-first browser practice
- Multiple choice + typed active recall
- A2–B2 mixed diagnostics
- Workplace / Product / PM contexts
- Local answer history, accuracy, response time and weakness aggregation
- Adaptive question weighting: weaker knowledge points return more often
- JSON export for daily review with ChatGPT
- Question bank kept separate from application logic so the bank can grow from 1,000 to 2,000+ items

## Training model

The learning path follows four stages:

1. Recognize
2. Recall
3. Use
4. Retain

A correct answer once is not treated as mastery. Questions can reappear in different forms and contexts.

## Question quality principles

Distractors should be plausible workplace English rather than obviously unrelated words. Questions should use concrete situations and test meaning, collocation, grammar or active recall. Ambiguous or low-value questions should be rewritten or retired.

## Current prototype

The first diagnostic set contains 20 deliberately varied questions covering:

- past tense
- subject–verb agreement
- articles
- conditionals
- prepositions
- B1 general/workplace vocabulary
- collocations
- active recall
- B2 Product / PM vocabulary

This small set is intentional. The interaction model and logging schema should be validated before generating the first 500-question production bank.

## Running locally

Open `index.html` in a browser, or serve the repository with any static file server.

Example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Data storage

Attempts are currently stored in browser `localStorage` under:

`english-training-attempts-v1`

The **Export** button downloads a JSON file containing both raw attempts and a weakness summary. This file can be shared back with ChatGPT for daily analysis and question-bank adjustment.

## Repository structure

```text
index.html
styles.css
manifest.webmanifest
js/
  app.js
  questions.js
```

## Next milestone

After the MVP interaction and diagnostic quality are reviewed:

- expand Stage 1 to 500 questions
- add mastery / spaced-review scheduling
- add question-quality feedback flags
- add richer weakness dashboard
- expand Stage 2 to questions 501–1000 focused on productive B1→B2 Product / PM English
