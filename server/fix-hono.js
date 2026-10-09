const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let changed = false;
      if (content.includes('new Hono()')) {
        content = content.replace(/new Hono\(\)/g, 'new Hono<{ Variables: { user: any } }>()');
        changed = true;
      }
      
      // In branches.routes.ts, fix the eq(s.branches.id, id) issue which might be caused by missing types
      if (fullPath.endsWith('branches.routes.ts')) {
         if (content.includes('eq(s.branches.id, id)')) {
            content = content.replace(/eq\(s\.branches\.id, id\)/g, 'eq(s.branches.id, id as string)');
            changed = true;
         }
      }

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed', fullPath);
      }
    }
  }
}

processDir(path.join(__dirname, 'src/domains'));
