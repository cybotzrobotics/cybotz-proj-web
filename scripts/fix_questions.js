const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/components/QuizDebug.tsx', 'utf8');

// Remove all confidence fields (including the comma before it)
content = content.replace(/,\s*"confidence":\s*10/g, '');

// Write back to file
fs.writeFileSync('src/components/QuizDebug.tsx', content);

console.log('Fixed quiz questions - removed all confidence fields');
