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
  'js/data/stage2_1.js',
  'js/data/stage2_2.js',
  'js/data/stage2_3.js',
  'js/data/stage2_4.js',
  'js/data/stage2_5.js',
  'js/questions.js',
  'js/stage2-postprocess.js'
];

for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  vm.runInContext(source, context, { filename: file });
}

const bank = context.window.QUESTION_BANK;
const meta = context.window.QUESTION_META;

if (!Array.isArray(bank)) throw new Error('QUESTION_BANK was not created');
if (bank.length !== 1000) throw new Error(`Expected 1000 questions, got ${bank.length}`);
if (!meta || meta.total !== 1000) throw new Error(`QUESTION_META total is ${meta?.total}, expected 1000`);
if (meta.knowledgePoints !== 200) throw new Error(`Expected 200 knowledge points, got ${meta.knowledgePoints}`);
if (meta.version !== 'stage2-1000-v1') throw new Error(`Unexpected bank version: ${meta.version}`);
if (meta.stage1 !== 500 || meta.stage2 !== 500) throw new Error('Stage counts are missing or incorrect');

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
if (lexical.length !== 900) throw new Error(`Expected 900 lexical questions, got ${lexical.length}`);
const grammar = bank.filter(q => q.category === 'Grammar');
if (grammar.length !== 100) throw new Error(`Expected 100 grammar questions, got ${grammar.length}`);
const stage2 = bank.filter(q => /^(B1-WRK|B2-PRO|B2-INT)-/.test(q.id));
if (stage2.length !== 500) throw new Error(`Expected 500 Stage 2 questions, got ${stage2.length}`);
if (new Set(stage2.map(q => q.knowledge)).size !== 100) throw new Error('Stage 2 must contain 100 knowledge points');

for (const q of lexical) {
  if (!q.meaningZh || !q.definitionEn || !q.note || !q.example) {
    throw new Error(`Lexical question ${q.id} is missing learning feedback`);
  }
}

for (const q of stage2.filter(q => q.id.endsWith('-C'))) {
  if (!q.prompt.includes('完成這個常用搭配')) throw new Error(`Stage 2 recall question ${q.id} is not context-constrained`);
}

console.log(`PASS: ${bank.length} questions, ${meta.knowledgePoints} knowledge points, ${lexical.length} lexical, ${grammar.length} grammar, ${stage2.length} stage2.`);
