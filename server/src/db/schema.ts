import { pgTable, text, integer, decimal, boolean, timestamp, date, pgEnum, uuid, jsonb, serial } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ===================== ENUMS =====================
export const userRoleEnum = pgEnum('user_role', ['owner', 'manager', 'accountant', 'storekeeper', 'sales_executive']);
export const customerTypeEnum = pgEnum('customer_type', ['salon', 'retailer', 'distributor']);
export const orderStatusEnum = pgEnum('order_status', ['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']);
export const quotationStatusEnum = pgEnum('quotation_status', ['draft', 'sent', 'accepted', 'expired', 'converted']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'bank_transfer', 'cheque', 'card']);
export const paymentTypeEnum = pgEnum('payment_type', ['incoming', 'outgoing']);
export const transferStatusEnum = pgEnum('transfer_status', ['pending', 'in_transit', 'completed', 'cancelled']);
export const adjustmentTypeEnum = pgEnum('adjustment_type', ['damaged', 'returned', 'expired', 'manual']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'completed']);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent']);
export const purchaseStatusEnum = pgEnum('purchase_status', ['draft', 'ordered', 'partially_received', 'received', 'cancelled']);
export const staffStatusEnum = pgEnum('staff_status', ['active', 'inactive', 'on_leave']);
export const expenseCategoryEnum = pgEnum('expense_category', ['rent', 'salaries', 'transport', 'utilities', 'marketing', 'office', 'other']);
export const notificationTypeEnum = pgEnum('notification_type', ['low_stock', 'expiry_warning', 'overdue_payment', 'new_order', 'transfer_completed', 'task_assigned', 'general']);
export const chatTypeEnum = pgEnum('chat_type', ['direct', 'group']);
export const contactTypeEnum = pgEnum('contact_type', ['customer', 'vendor', 'both']);
export const branchStatusEnum = pgEnum('branch_status', ['active', 'inactive']);
export const stockMovementTypeEnum = pgEnum('stock_movement_type', ['sale', 'purchase', 'transfer_in', 'transfer_out', 'adjustment', 'return', 'damaged', 'expired', 'initial']);

// ===================== BRANCHES =====================
export const branches = pgTable('branches', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  address: text('address'),
  city: text('city'),
  country: text('country').default('UAE'),
  phone: text('phone'),
  email: text('email'),
  managerId: uuid('manager_id'),
  status: branchStatusEnum('status').notNull().default('active'),
  isDefault: boolean('is_default').notNull().default(false),
  invoicePrefix: text('invoice_prefix'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ===================== AUTH =====================
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull().default('sales_executive'),
  avatar: text('avatar'),
  phone: text('phone'),
  permissions: jsonb('permissions').$type<Record<string, boolean>>(),
  branchIds: jsonb('branch_ids').$type<string[]>(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ===================== PRODUCTS & INVENTORY =====================
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const brands = pgTable('brands', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  logo: text('logo'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  sku: text('sku').notNull().unique(),
  brandId: uuid('brand_id').references(() => brands.id),
  categoryId: uuid('category_id').references(() => categories.id),
  description: text('description'),
  image: text('image'),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }).notNull().default('0'),
  wholesalePrice: decimal('wholesale_price', { precision: 10, scale: 2 }).notNull().default('0'),
  retailPrice: decimal('retail_price', { precision: 10, scale: 2 }).notNull().default('0'),
  mrp: decimal('mrp', { precision: 10, scale: 2 }).notNull().default('0'),
  reorderLevel: integer('reorder_level').notNull().default(20),
  isCombo: boolean('is_combo').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const shades = pgTable('shades', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  colorCode: text('color_code'),
  sku: text('sku').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const sizes = pgTable('sizes', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  sku: text('sku').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const productVariants = pgTable('product_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  shadeId: uuid('shade_id').references(() => shades.id),
  sizeId: uuid('size_id').references(() => sizes.id),
  sku: text('sku').notNull().unique(),
  barcode: text('barcode'),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }),
  wholesalePrice: decimal('wholesale_price', { precision: 10, scale: 2 }),
  retailPrice: decimal('retail_price', { precision: 10, scale: 2 }),
  mrp: decimal('mrp', { precision: 10, scale: 2 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const batches = pgTable('batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id),
  batchNumber: text('batch_number').notNull(),
  manufacturingDate: date('manufacturing_date'),
  expiryDate: date('expiry_date'),
  quantity: integer('quantity').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const warehouses = pgTable('warehouses', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const stockLevels = pgTable('stock_levels', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').notNull().default(0),
  reservedQuantity: integer('reserved_quantity').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const stockTransfers = pgTable('stock_transfers', {
  id: uuid('id').defaultRandom().primaryKey(),
  referenceNumber: text('reference_number').notNull(),
  fromWarehouseId: uuid('from_warehouse_id').references(() => warehouses.id).notNull(),
  toWarehouseId: uuid('to_warehouse_id').references(() => warehouses.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id),
  quantity: integer('quantity').notNull(),
  status: transferStatusEnum('status').notNull().default('pending'),
  notes: text('notes'),
  createdById: uuid('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export const stockAdjustments = pgTable('stock_adjustments', {
  id: uuid('id').defaultRandom().primaryKey(),
  referenceNumber: text('reference_number').notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id).notNull(),
  type: adjustmentTypeEnum('type').notNull(),
  systemQuantity: integer('system_quantity').notNull(),
  actualQuantity: integer('actual_quantity').notNull(),
  difference: integer('difference').notNull(),
  reason: text('reason'),
  createdById: uuid('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const comboItems = pgTable('combo_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  comboProductId: uuid('combo_product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  componentProductId: uuid('component_product_id').references(() => products.id).notNull(),
  componentVariantId: uuid('component_variant_id').references(() => productVariants.id),
  quantity: integer('quantity').notNull().default(1),
});

// ===================== CONTACTS (Distributors + Suppliers unified) =====================
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  type: customerTypeEnum('type').notNull().default('retailer'),
  contactType: contactTypeEnum('contact_type').default('customer'),
  contactPerson: text('contact_person'),
  email: text('email'),
  phone: text('phone'),
  whatsapp: text('whatsapp'),
  address: text('address'),
  city: text('city'),
  country: text('country').default('UAE'),
  trn: text('trn'),
  creditLimit: decimal('credit_limit', { precision: 10, scale: 2 }).notNull().default('0'),
  outstandingBalance: decimal('outstanding_balance', { precision: 10, scale: 2 }).notNull().default('0'),
  paymentTerms: integer('payment_terms').default(30),
  priceLevel: text('price_level').default('wholesale'),
  isActive: boolean('is_active').notNull().default(true),
  lastPurchaseDate: date('last_purchase_date'),
  notes: text('notes'),
  createdById: uuid('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ===================== SUPPLIERS =====================
export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  contactPerson: text('contact_person'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  trn: text('trn'),
  outstandingPayable: decimal('outstanding_payable', { precision: 10, scale: 2 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  lastPurchaseDate: date('last_purchase_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ===================== SALES ORDERS =====================
export const salesOrders = pgTable('sales_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  customerId: uuid('customer_id').references(() => customers.id).notNull(),
  branchId: uuid('branch_id').references(() => branches.id),
  status: orderStatusEnum('status').notNull().default('draft'),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull().default('0'),
  vatAmount: decimal('vat_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  paidAmount: decimal('paid_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  balanceDue: decimal('balance_due', { precision: 10, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  createdById: uuid('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const salesOrderItems = pgTable('sales_order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => salesOrders.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 5, scale: 2 }).notNull().default('0'),
  vatRate: decimal('vat_rate', { precision: 5, scale: 2 }).notNull().default('5'),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
});

// ===================== QUOTATIONS =====================
export const quotations = pgTable('quotations', {
  id: uuid('id').defaultRandom().primaryKey(),
  quotationNumber: text('quotation_number').notNull().unique(),
  customerId: uuid('customer_id').references(() => customers.id).notNull(),
  status: quotationStatusEnum('status').notNull().default('draft'),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull().default('0'),
  vatAmount: decimal('vat_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  validUntil: date('valid_until'),
  notes: text('notes'),
  createdById: uuid('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const quotationItems = pgTable('quotation_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  quotationId: uuid('quotation_id').references(() => quotations.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 5, scale: 2 }).notNull().default('0'),
  vatRate: decimal('vat_rate', { precision: 5, scale: 2 }).notNull().default('5'),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
});

// ===================== INVOICES =====================
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  customerId: uuid('customer_id').references(() => customers.id).notNull(),
  branchId: uuid('branch_id').references(() => branches.id),
  orderId: uuid('order_id').references(() => salesOrders.id),
  quotationId: uuid('quotation_id').references(() => quotations.id),
  status: invoiceStatusEnum('status').notNull().default('unpaid'),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull().default('0'),
  vatAmount: decimal('vat_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  paidAmount: decimal('paid_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  balanceDue: decimal('balance_due', { precision: 10, scale: 2 }).notNull().default('0'),
  currency: text('currency').notNull().default('AED'),
  dueDate: date('due_date'),
  notes: text('notes'),
  createdById: uuid('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id),
  description: text('description'),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 5, scale: 2 }).notNull().default('0'),
  vatRate: decimal('vat_rate', { precision: 5, scale: 2 }).notNull().default('5'),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
});

// ===================== PURCHASES =====================
export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  poNumber: text('po_number').notNull().unique(),
  supplierId: uuid('supplier_id').references(() => suppliers.id).notNull(),
  status: purchaseStatusEnum('status').notNull().default('draft'),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull().default('0'),
  vatAmount: decimal('vat_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  expectedDate: date('expected_date'),
  notes: text('notes'),
  createdById: uuid('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrders.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id),
  quantity: integer('quantity').notNull(),
  receivedQuantity: integer('received_quantity').notNull().default(0),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }).notNull(),
  vatRate: decimal('vat_rate', { precision: 5, scale: 2 }).notNull().default('5'),
  totalCost: decimal('total_cost', { precision: 10, scale: 2 }).notNull(),
  batchNumber: text('batch_number'),
  expiryDate: date('expiry_date'),
});

// ===================== PAYMENTS =====================
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  referenceNumber: text('reference_number').notNull().unique(),
  type: paymentTypeEnum('type').notNull(),
  customerId: uuid('customer_id').references(() => customers.id),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  invoiceId: uuid('invoice_id').references(() => invoices.id),
  purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrders.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  method: paymentMethodEnum('method').notNull().default('cash'),
  date: date('date').notNull(),
  notes: text('notes'),
  createdById: uuid('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================== EXPENSES =====================
export const expenses = pgTable('expenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  category: expenseCategoryEnum('category').notNull(),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  date: date('date').notNull(),
  method: paymentMethodEnum('method').notNull().default('cash'),
  receipt: text('receipt'),
  notes: text('notes'),
  createdById: uuid('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================== STAFF =====================
export const staff = pgTable('staff', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  name: text('name').notNull(),
  role: text('role').notNull(),
  phone: text('phone'),
  email: text('email'),
  status: staffStatusEnum('status').notNull().default('active'),
  joinedDate: date('joined_date'),
  salary: decimal('salary', { precision: 10, scale: 2 }),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }),
  salesTarget: decimal('sales_target', { precision: 10, scale: 2 }),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  assignedToId: uuid('assigned_to_id').references(() => staff.id),
  assignedById: uuid('assigned_by_id').references(() => users.id),
  dueDate: timestamp('due_date'),
  priority: taskPriorityEnum('priority').notNull().default('medium'),
  status: taskStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const attendance = pgTable('attendance', {
  id: uuid('id').defaultRandom().primaryKey(),
  staffId: uuid('staff_id').references(() => staff.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  checkIn: timestamp('check_in'),
  checkOut: timestamp('check_out'),
  status: text('status').notNull().default('present'),
});

// ===================== CHAT =====================
export const chatConversations = pgTable('chat_conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  type: chatTypeEnum('type').notNull().default('direct'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const chatParticipants = pgTable('chat_participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => chatConversations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  lastReadAt: timestamp('last_read_at'),
});

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => chatConversations.id, { onDelete: 'cascade' }).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  messageType: text('message_type').notNull().default('text'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================== AI =====================
export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  title: text('title'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const aiMessages = pgTable('ai_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => aiConversations.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================== NOTIFICATIONS =====================
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: notificationTypeEnum('type').notNull().default('general'),
  title: text('title').notNull(),
  message: text('message').notNull(),
  link: text('link'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const activityLog = pgTable('activity_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  userName: text('user_name').notNull(),
  action: text('action').notNull(),
  module: text('module').notNull(),
  entityId: text('entity_id'),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================== WEBSITE =====================
export const websiteConfig = pgTable('website_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyName: text('company_name').notNull().default('Glow Wholesale'),
  companyNameAr: text('company_name_ar'),
  tagline: text('tagline'),
  taglineAr: text('tagline_ar'),
  logo: text('logo'),
  aboutText: text('about_text'),
  aboutTextAr: text('about_text_ar'),
  phone: text('phone'),
  whatsapp: text('whatsapp'),
  email: text('email'),
  address: text('address'),
  addressAr: text('address_ar'),
  brandColors: jsonb('brand_colors'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const websiteEnquiries = pgTable('website_enquiries', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  company: text('company'),
  phone: text('phone'),
  email: text('email'),
  productInterest: text('product_interest'),
  message: text('message'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================== SETTINGS =====================
export const businessSettings = pgTable('business_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyName: text('company_name').notNull().default('Glow Wholesale Trading LLC'),
  trn: text('trn').default('100123456789003'),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  logo: text('logo'),
  defaultCurrency: text('default_currency').notNull().default('AED'),
  vatRate: decimal('vat_rate', { precision: 5, scale: 2 }).notNull().default('5'),
  invoicePrefix: text('invoice_prefix').notNull().default('INV'),
  orderPrefix: text('order_prefix').notNull().default('ORD'),
  quotationPrefix: text('quotation_prefix').notNull().default('QTN'),
  purchasePrefix: text('purchase_prefix').notNull().default('PO'),
  nextInvoiceNumber: integer('next_invoice_number').notNull().default(1001),
  nextOrderNumber: integer('next_order_number').notNull().default(5001),
  nextQuotationNumber: integer('next_quotation_number').notNull().default(3001),
  nextPurchaseNumber: integer('next_purchase_number').notNull().default(2001),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ===================== STOCK MOVEMENTS =====================
export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id),
  branchId: uuid('branch_id').references(() => branches.id),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id),
  type: stockMovementTypeEnum('type').notNull(),
  quantity: integer('quantity').notNull(),
  previousQuantity: integer('previous_quantity'),
  newQuantity: integer('new_quantity'),
  referenceType: text('reference_type'),
  referenceId: uuid('reference_id'),
  referenceNumber: text('reference_number'),
  batchNumber: text('batch_number'),
  notes: text('notes'),
  createdById: uuid('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
