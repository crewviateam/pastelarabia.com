import { Hono } from 'hono';
import { eq, sql, desc, asc, ilike, and, or, inArray } from 'drizzle-orm';
import { db } from '../../db';
import * as s from '../../db/schema';
import { uploadFile, getSignedFileUrl } from '../../shared/s3';

const inventory = new Hono();

// GET /api/products — list all products with filters
inventory.get('/products', async (c) => {
  const {
    search, category, brand, stockStatus, page = '1', limit = '20', sortBy = 'name', sortDir = 'asc'
  } = c.req.query();

  const conditions: any[] = [eq(s.products.isActive, true)];

  if (search) {
    conditions.push(or(
      ilike(s.products.name, `%${search}%`),
      ilike(s.products.sku, `%${search}%`)
    ));
  }
  if (category) {
    conditions.push(eq(s.products.categoryId, category));
  }
  if (brand) {
    conditions.push(eq(s.products.brandId, brand));
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const productsList = await db.select({
    id: s.products.id,
    name: s.products.name,
    sku: s.products.sku,
    image: s.products.image,
    costPrice: s.products.costPrice,
    wholesalePrice: s.products.wholesalePrice,
    retailPrice: s.products.retailPrice,
    mrp: s.products.mrp,
    reorderLevel: s.products.reorderLevel,
    isCombo: s.products.isCombo,
    brand: s.brands.name,
    category: s.categories.name,
    totalStock: sql<number>`COALESCE(SUM(${s.stockLevels.quantity}), 0)`,
    variantCount: sql<number>`(SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = ${s.products.id})`,
    createdAt: s.products.createdAt,
  }).from(s.products)
    .leftJoin(s.brands, eq(s.products.brandId, s.brands.id))
    .leftJoin(s.categories, eq(s.products.categoryId, s.categories.id))
    .leftJoin(s.stockLevels, eq(s.products.id, s.stockLevels.productId))
    .where(and(...conditions))
    .groupBy(s.products.id, s.brands.name, s.categories.name)
    .orderBy(sortDir === 'desc' ? desc(s.products.name) : asc(s.products.name))
    .limit(parseInt(limit))
    .offset(offset);

  // Total count
  const [totalResult] = await db.select({
    count: sql<number>`COUNT(DISTINCT ${s.products.id})`,
  }).from(s.products)
    .where(and(...conditions));

  // Determine stock status
  const products = productsList.map(p => ({
    ...p,
    totalStock: Number(p.totalStock),
    status: Number(p.totalStock) === 0 ? 'Out of Stock' :
            Number(p.totalStock) <= p.reorderLevel ? 'Low Stock' : 'In Stock',
  }));

  // Filter by stock status if requested
  const filtered = stockStatus
    ? products.filter(p => p.status.toLowerCase().replace(/\s/g, '_') === stockStatus)
    : products;

  return c.json({
    data: filtered,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalResult?.count || 0,
      pages: Math.ceil((totalResult?.count || 0) / parseInt(limit)),
    },
  });
});
// GET /api/storefront — specialized endpoint for variant-driven storefront
inventory.get('/storefront', async (c) => {
  const productsList = await db.select({
    id: s.products.id,
    name: s.products.name,
    sku: s.products.sku,
    image: s.products.image,
    wholesalePrice: s.products.wholesalePrice,
    category: s.categories.name,
  }).from(s.products)
    .leftJoin(s.categories, eq(s.products.categoryId, s.categories.id))
    .where(eq(s.products.isActive, true));

  const variantsList = await db.select({
    id: s.productVariants.id,
    productId: s.productVariants.productId,
    sku: s.productVariants.sku,
    shadeId: s.productVariants.shadeId,
    shadeName: s.shades.name,
    colorCode: s.shades.colorCode,
    sizeId: s.productVariants.sizeId,
    sizeName: s.sizes.name,
    wholesalePrice: s.productVariants.wholesalePrice,
    stock: sql<number>`COALESCE(SUM(${s.stockLevels.quantity}), 0)`,
  }).from(s.productVariants)
    .leftJoin(s.shades, eq(s.productVariants.shadeId, s.shades.id))
    .leftJoin(s.sizes, eq(s.productVariants.sizeId, s.sizes.id))
    .leftJoin(s.stockLevels, eq(s.productVariants.id, s.stockLevels.variantId))
    .where(eq(s.productVariants.isActive, true))
    .groupBy(s.productVariants.id, s.shades.name, s.shades.colorCode, s.sizes.name);

  const data = productsList.map(p => {
    const productVariants = variantsList.filter(v => v.productId === p.id).map(v => ({
      ...v,
      stock: Number(v.stock)
    }));
    return {
      ...p,
      variants: productVariants,
      totalStock: productVariants.reduce((sum, v) => sum + v.stock, 0)
    };
  });

  return c.json({ data });
});

// GET /api/products/stats — inventory overview stats
inventory.get('/products/stats', async (c) => {
  const [stats] = await db.select({
    totalProducts: sql<number>`COUNT(DISTINCT ${s.products.id})`,
    totalVariants: sql<number>`(SELECT COUNT(*) FROM product_variants)`,
    totalStockValue: sql<string>`COALESCE(SUM(sl.total_qty * ${s.products.costPrice}), 0)`,
    outOfStock: sql<number>`COUNT(DISTINCT CASE WHEN COALESCE(sl.total_qty, 0) = 0 THEN ${s.products.id} END)`,
  }).from(s.products)
    .leftJoin(
      sql`(SELECT product_id, SUM(quantity) as total_qty FROM stock_levels GROUP BY product_id) sl`,
      sql`sl.product_id = ${s.products.id}`
    )
    .where(eq(s.products.isActive, true));

  // Low stock count
  const [lowStock] = await db.select({
    count: sql<number>`COUNT(*)`,
  }).from(sql`(
    SELECT p.id FROM products p
    LEFT JOIN (SELECT product_id, SUM(quantity) as qty FROM stock_levels GROUP BY product_id) sl
    ON sl.product_id = p.id
    WHERE p.is_active = true AND COALESCE(sl.qty, 0) <= p.reorder_level AND COALESCE(sl.qty, 0) > 0
  ) subq`);

  // Expiring soon (within 90 days)
  const [expiringSoon] = await db.select({
    count: sql<number>`COUNT(*)`,
  }).from(s.batches)
    .where(sql`${s.batches.expiryDate} IS NOT NULL AND ${s.batches.expiryDate} <= CURRENT_DATE + INTERVAL '90 days' AND ${s.batches.expiryDate} > CURRENT_DATE`);

  return c.json({
    totalProducts: stats?.totalProducts || 0,
    totalVariants: stats?.totalVariants || 0,
    totalStockValue: parseFloat(stats?.totalStockValue || '0'),
    lowStock: lowStock?.count || 0,
    expiringSoon: expiringSoon?.count || 0,
    outOfStock: stats?.outOfStock || 0,
  });
});

// GET /api/products/:id — full product detail
inventory.get('/products/:id', async (c) => {
  const id = c.req.param('id');

  const [product] = await db.select({
    id: s.products.id,
    name: s.products.name,
    sku: s.products.sku,
    description: s.products.description,
    image: s.products.image,
    costPrice: s.products.costPrice,
    wholesalePrice: s.products.wholesalePrice,
    retailPrice: s.products.retailPrice,
    mrp: s.products.mrp,
    reorderLevel: s.products.reorderLevel,
    isCombo: s.products.isCombo,
    isActive: s.products.isActive,
    brand: s.brands.name,
    brandId: s.products.brandId,
    category: s.categories.name,
    categoryId: s.products.categoryId,
    createdAt: s.products.createdAt,
  }).from(s.products)
    .leftJoin(s.brands, eq(s.products.brandId, s.brands.id))
    .leftJoin(s.categories, eq(s.products.categoryId, s.categories.id))
    .where(eq(s.products.id, id))
    .limit(1);

  if (!product) return c.json({ error: 'Product not found' }, 404);

  // Get shades
  const shades = await db.select().from(s.shades)
    .where(eq(s.shades.productId, id))
    .orderBy(asc(s.shades.sortOrder));

  // Get sizes
  const sizes = await db.select().from(s.sizes)
    .where(eq(s.sizes.productId, id))
    .orderBy(asc(s.sizes.sortOrder));

  // Get variants with stock
  const variants = await db.select({
    id: s.productVariants.id,
    sku: s.productVariants.sku,
    barcode: s.productVariants.barcode,
    shadeId: s.productVariants.shadeId,
    sizeId: s.productVariants.sizeId,
    costPrice: s.productVariants.costPrice,
    wholesalePrice: s.productVariants.wholesalePrice,
    retailPrice: s.productVariants.retailPrice,
    totalStock: sql<number>`COALESCE(SUM(${s.stockLevels.quantity}), 0)`,
    reservedStock: sql<number>`COALESCE(SUM(${s.stockLevels.reservedQuantity}), 0)`,
  }).from(s.productVariants)
    .leftJoin(s.stockLevels, eq(s.productVariants.id, s.stockLevels.variantId))
    .where(eq(s.productVariants.productId, id))
    .groupBy(s.productVariants.id);

  // Get batches
  const batches = await db.select().from(s.batches)
    .where(eq(s.batches.productId, id))
    .orderBy(desc(s.batches.createdAt));

  // Get stock by warehouse
  const stockByWarehouse = await db.select({
    warehouseId: s.warehouses.id,
    warehouseName: s.warehouses.name,
    quantity: sql<number>`COALESCE(SUM(${s.stockLevels.quantity}), 0)`,
    reservedQuantity: sql<number>`COALESCE(SUM(${s.stockLevels.reservedQuantity}), 0)`,
  }).from(s.stockLevels)
    .innerJoin(s.warehouses, eq(s.stockLevels.warehouseId, s.warehouses.id))
    .where(eq(s.stockLevels.productId, id))
    .groupBy(s.warehouses.id);

  // Combo items if applicable
  let comboItemsList: any[] = [];
  if (product.isCombo) {
    comboItemsList = await db.select({
      id: s.comboItems.id,
      productId: s.comboItems.componentProductId,
      productName: s.products.name,
      quantity: s.comboItems.quantity,
    }).from(s.comboItems)
      .innerJoin(s.products, eq(s.comboItems.componentProductId, s.products.id))
      .where(eq(s.comboItems.comboProductId, id));
  }

  return c.json({
    ...product,
    shades,
    sizes,
    variants: variants.map(v => ({ ...v, totalStock: Number(v.totalStock), reservedStock: Number(v.reservedStock) })),
    batches,
    stockByWarehouse: stockByWarehouse.map(sw => ({ ...sw, quantity: Number(sw.quantity), reservedQuantity: Number(sw.reservedQuantity) })),
    comboItems: comboItemsList,
  });
});

// POST /api/products — create product
inventory.post('/products', async (c) => {
  const body = await c.req.json();

  const [product] = await db.insert(s.products).values({
    name: body.name,
    sku: body.sku,
    brandId: body.brandId || null,
    categoryId: body.categoryId || null,
    description: body.description || null,
    image: body.image || null,
    costPrice: String(body.costPrice || 0),
    wholesalePrice: String(body.wholesalePrice || 0),
    retailPrice: String(body.retailPrice || 0),
    mrp: String(body.mrp || 0),
    reorderLevel: body.reorderLevel || 20,
    isCombo: body.isCombo || false,
  }).returning();

  // Create shades if provided
  if (body.shades?.length) {
    for (let i = 0; i < body.shades.length; i++) {
      const shade = body.shades[i];
      const [insertedShade] = await db.insert(s.shades).values({
        productId: product.id,
        name: shade.name,
        colorCode: shade.colorCode || null,
        sku: shade.sku || `${product.sku}-SH${String(i + 1).padStart(2, '0')}`,
        sortOrder: i,
      }).returning();

      // Create variant for each shade
      await db.insert(s.productVariants).values({
        productId: product.id,
        shadeId: insertedShade.id,
        sku: insertedShade.sku,
        costPrice: String(body.costPrice || 0),
        wholesalePrice: String(body.wholesalePrice || 0),
        retailPrice: String(body.retailPrice || 0),
        mrp: String(body.mrp || 0),
      });
    }
  }

  // Create sizes if provided
  if (body.sizes?.length) {
    for (let i = 0; i < body.sizes.length; i++) {
      const size = body.sizes[i];
      await db.insert(s.sizes).values({
        productId: product.id,
        name: size.name,
        sku: size.sku || `${product.sku}-SZ${String(i + 1).padStart(2, '0')}`,
        sortOrder: i,
      });
    }
  }

  // Create initial stock levels for default warehouse
  const [defaultWarehouse] = await db.select().from(s.warehouses)
    .where(eq(s.warehouses.isDefault, true)).limit(1);

  if (defaultWarehouse) {
    await db.insert(s.stockLevels).values({
      productId: product.id,
      warehouseId: defaultWarehouse.id,
      quantity: body.initialStock || 0,
    });
  }

  return c.json(product, 201);
});

// PUT /api/products/:id — update product
inventory.put('/products/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const [updated] = await db.update(s.products).set({
    name: body.name,
    sku: body.sku,
    brandId: body.brandId,
    categoryId: body.categoryId,
    description: body.description,
    image: body.image,
    costPrice: body.costPrice !== undefined ? String(body.costPrice) : undefined,
    wholesalePrice: body.wholesalePrice !== undefined ? String(body.wholesalePrice) : undefined,
    retailPrice: body.retailPrice !== undefined ? String(body.retailPrice) : undefined,
    mrp: body.mrp !== undefined ? String(body.mrp) : undefined,
    reorderLevel: body.reorderLevel,
    updatedAt: new Date(),
  }).where(eq(s.products.id, id)).returning();

  return c.json(updated);
});

// DELETE /api/products/:id — soft delete
inventory.delete('/products/:id', async (c) => {
  const id = c.req.param('id');
  await db.update(s.products).set({ isActive: false, updatedAt: new Date() })
    .where(eq(s.products.id, id));
  return c.json({ message: 'Product deactivated' });
});

// GET /api/categories
inventory.get('/categories', async (c) => {
  const cats = await db.select().from(s.categories).orderBy(asc(s.categories.name));
  return c.json(cats);
});

// POST /api/categories
inventory.post('/categories', async (c) => {
  const body = await c.req.json();
  const [cat] = await db.insert(s.categories)
    .values({ name: body.name, description: body.description || null })
    .returning();
  return c.json(cat);
});

// GET /api/brands
inventory.get('/brands', async (c) => {
  const brandsList = await db.select().from(s.brands).orderBy(asc(s.brands.name));
  return c.json(brandsList);
});

// POST /api/brands
inventory.post('/brands', async (c) => {
  const body = await c.req.json();
  const [brand] = await db.insert(s.brands)
    .values({ name: body.name, manufacturer: body.manufacturer || null })
    .returning();
  return c.json(brand);
});

// GET /api/warehouses
inventory.get('/warehouses', async (c) => {
  const warehousesList = await db.select().from(s.warehouses)
    .where(eq(s.warehouses.isActive, true))
    .orderBy(asc(s.warehouses.name));
  return c.json(warehousesList);
});

// ===== STOCK TRANSFERS =====

// GET /api/stock/transfers
inventory.get('/stock/transfers', async (c) => {
  const transfers = await db.select({
    id: s.stockTransfers.id,
    referenceNumber: s.stockTransfers.referenceNumber,
    productName: s.products.name,
    productSku: s.products.sku,
    quantity: s.stockTransfers.quantity,
    status: s.stockTransfers.status,
    notes: s.stockTransfers.notes,
    fromWarehouse: sql<string>`fw.name`,
    toWarehouse: sql<string>`tw.name`,
    createdAt: s.stockTransfers.createdAt,
    completedAt: s.stockTransfers.completedAt,
  }).from(s.stockTransfers)
    .innerJoin(s.products, eq(s.stockTransfers.productId, s.products.id))
    .innerJoin(sql`warehouses fw`, sql`fw.id = ${s.stockTransfers.fromWarehouseId}`)
    .innerJoin(sql`warehouses tw`, sql`tw.id = ${s.stockTransfers.toWarehouseId}`)
    .orderBy(desc(s.stockTransfers.createdAt));

  return c.json(transfers);
});

// POST /api/stock/transfers — create transfer
inventory.post('/stock/transfers', async (c) => {
  const body = await c.req.json();
  const user = c.get('user') as any;

  // Generate reference number
  const refNum = `TRF-${Date.now().toString().slice(-6)}`;

  const [transfer] = await db.insert(s.stockTransfers).values({
    referenceNumber: refNum,
    fromWarehouseId: body.fromWarehouseId,
    toWarehouseId: body.toWarehouseId,
    productId: body.productId,
    variantId: body.variantId || null,
    quantity: body.quantity,
    notes: body.notes || null,
    createdById: user?.userId || null,
  }).returning();

  // Update stock levels
  // Decrease source
  await db.execute(sql`
    UPDATE stock_levels SET quantity = quantity - ${body.quantity}, updated_at = NOW()
    WHERE product_id = ${body.productId} AND warehouse_id = ${body.fromWarehouseId}
    ${body.variantId ? sql`AND variant_id = ${body.variantId}` : sql``}
  `);

  // Increase or insert destination
  const [existing] = await db.select().from(s.stockLevels)
    .where(and(
      eq(s.stockLevels.productId, body.productId),
      eq(s.stockLevels.warehouseId, body.toWarehouseId)
    )).limit(1);

  if (existing) {
    await db.execute(sql`
      UPDATE stock_levels SET quantity = quantity + ${body.quantity}, updated_at = NOW()
      WHERE product_id = ${body.productId} AND warehouse_id = ${body.toWarehouseId}
    `);
  } else {
    await db.insert(s.stockLevels).values({
      productId: body.productId,
      warehouseId: body.toWarehouseId,
      quantity: body.quantity,
    });
  }

  // Mark as completed
  await db.update(s.stockTransfers).set({
    status: 'completed',
    completedAt: new Date(),
  }).where(eq(s.stockTransfers.id, transfer.id));

  return c.json(transfer, 201);
});

// ===== STOCK ADJUSTMENTS =====

// POST /api/stock/adjustments
inventory.post('/stock/adjustments', async (c) => {
  const body = await c.req.json();
  const user = c.get('user') as any;

  const refNum = `ADJ-${Date.now().toString().slice(-6)}`;

  const [adjustment] = await db.insert(s.stockAdjustments).values({
    referenceNumber: refNum,
    productId: body.productId,
    variantId: body.variantId || null,
    warehouseId: body.warehouseId,
    type: body.type,
    systemQuantity: body.systemQuantity,
    actualQuantity: body.actualQuantity,
    difference: body.actualQuantity - body.systemQuantity,
    reason: body.reason || null,
    createdById: user?.userId || null,
  }).returning();

  // Update stock level
  await db.execute(sql`
    UPDATE stock_levels SET quantity = ${body.actualQuantity}, updated_at = NOW()
    WHERE product_id = ${body.productId} AND warehouse_id = ${body.warehouseId}
  `);

  return c.json(adjustment, 201);
});

// GET /api/stock/audit
inventory.get('/stock/audit', async (c) => {
  const warehouseId = c.req.query('warehouseId');

  const conditions: any[] = [];
  if (warehouseId) conditions.push(eq(s.stockLevels.warehouseId, warehouseId));

  const auditData = await db.select({
    productId: s.products.id,
    productName: s.products.name,
    sku: s.products.sku,
    warehouseId: s.warehouses.id,
    warehouseName: s.warehouses.name,
    systemQuantity: s.stockLevels.quantity,
    variantId: s.stockLevels.variantId,
  }).from(s.stockLevels)
    .innerJoin(s.products, eq(s.stockLevels.productId, s.products.id))
    .innerJoin(s.warehouses, eq(s.stockLevels.warehouseId, s.warehouses.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(s.products.name));

  return c.json(auditData);
});

export default inventory;
