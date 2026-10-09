import { db } from './src/db/index';
import * as s from './src/db/schema';
import { eq } from 'drizzle-orm';
import { uploadFile } from './src/shared/s3';

async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer, contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: res.headers.get('content-type') || 'image/jpeg'
  };
}

async function run() {
  console.log('Starting image upload process...');
  
  // 1. Fetch products from DB
  const products = await db.select().from(s.products);
  console.log(`Found ${products.length} products in DB.`);

  for (const product of products) {
    try {
      console.log(`\nProcessing: ${product.name}`);
      
      // 2. Search pastelarabia.com for the product
      const searchUrl = `https://pastelarabia.com/search/suggest.json?q=${encodeURIComponent(product.name)}&resources[type]=product`;
      const res = await fetch(searchUrl);
      const data = await res.json();
      
      const shopifyProduct = data.resources?.results?.products?.[0];
      if (!shopifyProduct || !shopifyProduct.image) {
        console.log(`❌ No image found on pastelarabia for ${product.name}`);
        continue;
      }
      
      let imageUrl = shopifyProduct.image;
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      }
      
      console.log(`Found image: ${imageUrl}`);
      
      // 3. Download the image
      const { buffer, contentType } = await fetchImageBuffer(imageUrl);
      
      // 4. Upload to S3
      const originalName = imageUrl.split('/').pop()?.split('?')[0] || 'product.jpg';
      const key = await uploadFile(buffer, originalName, contentType, 'products');
      
      const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
      console.log(`✅ Uploaded to S3: ${s3Url}`);
      
      // 5. Update DB
      await db.update(s.products)
        .set({ image: s3Url })
        .where(eq(s.products.id, product.id));
        
      console.log(`Updated DB for ${product.name}`);
      
    } catch (error) {
      console.error(`Error processing ${product.name}:`, error);
    }
  }
  
  console.log('\nAll done!');
  process.exit(0);
}

run().catch(console.error);
