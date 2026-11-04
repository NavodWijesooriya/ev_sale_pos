// Script to replace purple/tint classes with theme primary colors
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const patterns = [
  'app/**/*.tsx',
  'app/**/*.ts',
  'components/**/*.tsx',
  'components/**/*.ts',
  'components/**/*.jsx',
  'components/**/*.js',
];

const replacements = [
  // background colors
  [/bg-purple-600/g, 'bg-primary'],
  [/bg-purple-500\/10/g, 'bg-primary/10'],
  [/bg-purple-500\/20/g, 'bg-primary/20'],
  [/bg-purple-500\/5/g, 'bg-primary/5'],
  [/bg-purple-500\/15/g, 'bg-primary/15'],
  [/bg-purple-500\/30/g, 'bg-primary/30'],
  // text colors
  [/text-purple-600/g, 'text-primary-foreground'],
  [/text-purple-500/g, 'text-primary-foreground'],
  // border colors
  [/border-purple-500\/30/g, 'border-primary/30'],
  [/border-purple-500\/20/g, 'border-primary/20'],
  [/border-purple-500\/10/g, 'border-primary/10'],
  // shadows
  [/shadow-purple-500\/20/g, 'shadow-primary/20'],
  // gradients to solid primary
  [/bg-gradient-to-tr from-purple-600 to-indigo-600/g, 'bg-primary'],
  [/bg-gradient-to-r from-purple-600 to-indigo-600/g, 'bg-primary'],
  [/bg-gradient-to-r from-purple-600 to-indigo-600/g, 'bg-primary'], // duplicate safety
];

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  replacements.forEach(([regex, replace]) => {
    content = content.replace(regex, replace);
  });
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}

patterns.forEach((pattern) => {
  glob.sync(pattern, { ignore: ['node_modules/**', '.next/**'] }).forEach(processFile);
});

console.log('Purple-to-primary replacement complete.');
