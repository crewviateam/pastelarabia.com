import { db } from './index';
import * as s from './schema';
import bcrypt from 'bcryptjs';

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

import { sql } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Starting realistic database seed...');

  try {
    // 1. Clean existing data
    await db.execute(sql`
      TRUNCATE TABLE 
        users, customers, brands, categories, products, shades, product_variants, 
        batches, warehouses, stock_levels, stock_movements, sales_orders, sales_order_items, 
        invoices, invoice_items, payments, purchase_orders, purchase_order_items, 
        expenses, activity_log, chat_messages, chat_conversations 
      CASCADE
    `);

    console.log('Cleared existing data.');

    // 2. Users
    const passwordHash = await bcrypt.hash('password123', 10);
    const [owner] = await db.insert(s.users).values({
      email: 'owner@pastelarabia.com',
      password: passwordHash,
      name: 'Pastel Admin',
      role: 'owner',
    }).returning();

    // 3. Customers
    const customersList = await db.insert(s.customers).values([
      { name: 'Sephora Dubai Mall', type: 'retailer', email: 'purchasing@sephora.ae', city: 'Dubai', outstandingBalance: '15000' },
      { name: 'Faces MENA', type: 'retailer', email: 'orders@faces.com', city: 'Abu Dhabi', outstandingBalance: '5000' },
      { name: 'Glow Beauty Lounge', type: 'salon', email: 'info@glowlounge.ae', city: 'Sharjah', outstandingBalance: '1200' },
      { name: 'NStyle Beauty Clinic', type: 'salon', email: 'accounts@nstyle.ae', city: 'Dubai', outstandingBalance: '0' },
      { name: 'Gulf Cosmetics Distributors', type: 'distributor', email: 'bulk@gcd.ae', city: 'Riyadh', outstandingBalance: '45000' }
    ]).returning();

    // 4. Categories & Brands
    const [catFace, catLips, catEyes] = await db.insert(s.categories).values([
      { name: 'Face' }, { name: 'Lips' }, { name: 'Eyes' }
    ]).returning();

    const [brandPastel] = await db.insert(s.brands).values([
      { name: 'Pastel Cosmetics' }
    ]).returning();

    // 5. Real Products & Variants
    const createdProducts = [];
    const allVariants = [];

    const productsData = [
      {
        name: 'Pastel Daylong Matte Liquid Lipstick', skuPrefix: 'DAYLONG', catId: catLips.id, cost: '15', wholesale: '28', retail: '55',
        shades: [
           { name: '20 Nude', code: '#E3C1B6' },
           { name: '27 Classic Red', code: '#B80000' },
           { name: '15 Soft Pink', code: '#FF94A5' },
           { name: '09 Coral', code: '#FF7F50' },
           { name: '38 Burgundy', code: '#800020' },
           { name: 'Dead Shade 99', code: '#333333' } // For dead stock radar
        ]
      },
      {
        name: 'Pastel Profashion Cream Blush', skuPrefix: 'BLUSH', catId: catFace.id, cost: '20', wholesale: '35', retail: '65',
        shades: [
           { name: '41 Peach', code: '#FFDAB9' },
           { name: '43 Rose', code: '#FF007F' },
           { name: '45 Berry', code: '#8A2BE2' }
        ]
      },
      {
        name: 'Pastel Show Your Magic Lip Gloss', skuPrefix: 'MAGIC', catId: catLips.id, cost: '12', wholesale: '22', retail: '45',
        shades: [
           { name: 'Clear Glass', code: '#FFFFFF' },
           { name: 'Pink Glitter', code: '#FFC0CB' }
        ]
      },
      {
        name: 'Pastel Matte Waterproof Eyeliner', skuPrefix: 'EYELINER', catId: catEyes.id, cost: '10', wholesale: '18', retail: '35',
        shades: [
           { name: 'True Black', code: '#000000' },
           { name: 'Deep Brown', code: '#654321' }
        ]
      },
      {
        name: 'Pastel Profashion Liquid Concealer', skuPrefix: 'CONCEAL', catId: catFace.id, cost: '18', wholesale: '32', retail: '50',
        shades: [
           { name: '101 Fair', code: '#FDEFE0' },
           { name: '103 Light', code: '#F4D2B6' },
           { name: '105 Medium', code: '#DFA77E' },
           { name: '107 Tan', code: '#C48154' }
        ]
      }
    ];

    for (const p of productsData) {
      const [prod] = await db.insert(s.products).values({
        name: p.name,
        sku: p.skuPrefix,
        brandId: brandPastel.id,
        categoryId: p.catId,
        costPrice: p.cost,
        wholesalePrice: p.wholesale,
        retailPrice: p.retail,
        mrp: p.retail,
        reorderLevel: randomInt(30, 80),
        description: 'Original high-quality cosmetics imported from Pastel.'
      }).returning();
      createdProducts.push(prod);

      for (let i = 0; i < p.shades.length; i++) {
        const sh = p.shades[i];
        const [shade] = await db.insert(s.shades).values({
          productId: prod.id,
          name: sh.name,
          colorCode: sh.code,
          sku: `${p.skuPrefix}-${i+1}`,
          sortOrder: i
        }).returning();

        const [variant] = await db.insert(s.productVariants).values({
          productId: prod.id,
          shadeId: shade.id,
          sku: `${p.skuPrefix}-V-${i+1}`,
          costPrice: p.cost,
          wholesalePrice: p.wholesale,
          retailPrice: p.retail,
          mrp: p.retail
        }).returning();

        allVariants.push({ variant, product: prod, shade });
      }
    }

    // 6. Warehouses
    const [warehouse1] = await db.insert(s.warehouses).values({
      name: 'Pastel UAE Main Hub',
      address: 'JAFZA, Dubai',
      isDefault: true,
    }).returning();

    // 7. Batches & Stock
    // We want some stock to expire very soon (<3 months), some later.
    const now = new Date();
    
    for (const item of allVariants) {
       let qty = randomInt(50, 400);
       
       // Force a "stockout risk" by making one item have < 10 stock
       if (item.shade.name === '27 Classic Red') {
         qty = 12; // High velocity, low stock
       }
       
       const isDeadStock = item.shade.name === 'Dead Shade 99';
       if (isDeadStock) qty = 150; // Sitting dead stock

       // 30% chance to have a batch expiring in 2 months
       const isExpiringSoon = Math.random() > 0.7;
       let expiryDate = new Date();
       if (isExpiringSoon) {
         expiryDate.setMonth(now.getMonth() + randomInt(1, 2));
       } else {
         expiryDate.setMonth(now.getMonth() + randomInt(7, 18));
       }

       const [batch] = await db.insert(s.batches).values({
         productId: item.product.id,
         variantId: item.variant.id,
         batchNumber: `BTH-${item.variant.sku}-${randomInt(1000, 9999)}`,
         quantity: qty,
         expiryDate: expiryDate.toISOString().split('T')[0]
       }).returning();

       await db.insert(s.stockLevels).values({
         productId: item.product.id,
         variantId: item.variant.id,
         warehouseId: warehouse1.id,
         quantity: qty,
       });
    }

    // 8. 6 Months of Historical Invoices
    console.log('Generating 6 months of historical data...');
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 180); // 180 days ago
    
    let invoiceCounter = 1000;

    while (currentDate <= now) {
      // 3 to 8 invoices per day
      const invoicesToday = randomInt(3, 8);
      
      for (let i = 0; i < invoicesToday; i++) {
        const customer = customersList[randomInt(0, customersList.length - 1)];
        const numItems = randomInt(1, 5);
        let subtotal = 0;
        const invoiceItemsData = [];

        // Pick items
        for (let j = 0; j < numItems; j++) {
           const randIdx = randomInt(0, allVariants.length - 1);
           const vItem = allVariants[randIdx];
           
           // Skip dead stock
           if (vItem.shade.name === 'Dead Shade 99') continue;

           const qty = randomInt(5, 50); // Wholesale quantities
           const price = parseFloat(vItem.variant.wholesalePrice || '0');
           const lineTotal = qty * price;
           subtotal += lineTotal;

           invoiceItemsData.push({
             productId: vItem.product.id,
             variantId: vItem.variant.id,
             quantity: qty,
             unitPrice: price.toString(),
             totalPrice: lineTotal.toString()
           });
        }

        if (invoiceItemsData.length === 0) continue;

        const vatAmount = subtotal * 0.05;
        const totalAmount = subtotal + vatAmount;
        const isPaid = Math.random() > 0.3; // 70% chance paid
        const status = isPaid ? 'paid' : 'overdue';

        const [invoice] = await db.insert(s.invoices).values({
           invoiceNumber: `INV-PASTEL-${invoiceCounter++}`,
           customerId: customer.id,
           status: status,
           subtotal: subtotal.toString(),
           vatAmount: vatAmount.toString(),
           totalAmount: totalAmount.toString(),
           paidAmount: isPaid ? totalAmount.toString() : '0',
           balanceDue: isPaid ? '0' : totalAmount.toString(),
           createdAt: currentDate,
           dueDate: new Date(currentDate.getTime() + 30*24*60*60*1000).toISOString().split('T')[0], // 30 days net
           createdById: owner.id
        }).returning();

        // Insert items
        for (const item of invoiceItemsData) {
          await db.insert(s.invoiceItems).values({
             invoiceId: invoice.id,
             ...item
          });
        }
      }
      // advance 1 day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('✅ Realistic Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
