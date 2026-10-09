const fs = require('fs');
const path = require('path');

const agentFile = path.join(__dirname, 'src', 'domains', 'ai', 'agent.ts');
let content = fs.readFileSync(agentFile, 'utf8');

content = content.replace(/rows\.forEach\(r => \{/g, 'rows.forEach((r: any) => {');

fs.writeFileSync(agentFile, content, 'utf8');
console.log('Fixed typings!');
