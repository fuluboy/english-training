const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.createContext(context);

const files = [
  'js/data/lex1.js',
  'js/data/lex2.js',
  'js/data/lex3.js',
  'js/data/lex4.js',
  'js/data/gram1.js',
  'js/data/gram2.js',
  'js/data/gram3.js',
  'js/data/gram4.js',
  'js/questions.js'
];

for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  vm.runInContext(source, context, { filename: file });
}

const bank = context.window.QUESTION_BANK;
const meta = context.window.QUESTION_META;

if (!Array.isArray(bank)) throw new Error('QUESTION_BANK was not created');
if (bank.length !== 500) throw new Error(`Expected 500 questions, got ${bank.length}`);
if (!meta || meta.total !== 500) throw new Error('QUESTION_META total is not 500');
if (meta.knowledgePoints !== 100) throw new Error(`Expected 100 knowledge points, got ${meta.knowledgePoints}`);

const ids = new Set();
for (const q of bank) {
  if (!q.id || ids.has(q.id)) throw new Error(`Missing or duplicate question id: ${q.id}`);
  ids.add(q.id);
  if (!q.cefr || !q.category || !q.domain || !q.skill || !q.knowledge || !q.type || !q.prompt || !q.answer) {
    throw new Error(`Question ${q.id} is missing required metadata`);
  }
  if (q.type === 'mcq') {
    if (!Array.isArray(q.options) || q.options.length !== 4) throw new Error(`Question ${q.id} must have four choices`);
    if (!q.options.includes(q.answer)) throw new Error(`Question ${q.id} does not include the correct answer in options`);
    if (new Set(q.options).size !== 4) throw new Error(`Question ${q.id} has duplicate options`);
  }
}

const lexical = bank.filter(q => q.word);
if (lexical.length !== 400) throw new Error(`Expected 400 lexical questions, got ${lexical.length}`);
const grammar = bank.filter(q => q.category === 'Grammar');
if (grammar.length !== 100) throw new Error(`Expected 100 grammar questions, got ${grammar.length}`);

for (const q of lexical) {
  if (!q.meaningZh || !q.definitionEn || !q.note || !q.example) {
    throw new Error(`Lexical question ${q.id} is missing learning feedback`);
  }
}

console.log(`PASS: ${bank.length} questions, ${meta.knowledgePoints} knowledge points, ${lexical.length} lexical, ${grammar.length} grammar.`);
