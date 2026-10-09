import { db } from './src/db/index.ts';
import * as s from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function main() {
  await db.update(s.stockLevels)
    .set({ quantity: 5 })
    .where(eq(s.stockLevels.productId, '008bbfb5-d594-44ae-b08f-96a5a5807718'));
  console.log('Stock updated!');
  process.exit(0);
}
main();
