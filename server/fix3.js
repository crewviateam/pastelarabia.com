const fs = require('fs');

let dashRoutes = fs.readFileSync('src/domains/inventory/dashboard.routes.ts', 'utf8');

const replacements = [
  'velocityData', 'expiryData', 'marginsData', 'channelSplit', 'stockoutRisk', 'deadStock', 'categoryMomentum'
];

for (const name of replacements) {
  const regex = new RegExp(name + '\\.rows', 'g');
  dashRoutes = dashRoutes.replace(regex, `(${name} as any).rows`);
}

fs.writeFileSync('src/domains/inventory/dashboard.routes.ts', dashRoutes);

console.log('Fixed dashboard routes');
