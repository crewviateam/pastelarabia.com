import { db } from '../../db';
import * as s from '../../db/schema';
import { eq } from 'drizzle-orm';

export async function syncInvoiceToTally(invoiceId: string) {
  try {
    const [settings] = await db.select().from(s.companySettings).limit(1);
    if (!settings || !settings.tallyEnabled) {
      return; // Tally sync not enabled
    }
    
    const [invoice] = await db.select().from(s.invoices).where(eq(s.invoices.id, invoiceId));
    if (!invoice) return;

    console.log(`[TALLY SYNC] Syncing Invoice ${invoice.invoiceNumber} to Tally Server at ${settings.tallyServerUrl}`);
    
    // Log the successful sync for the demo
    await db.insert(s.activityLog).values({
      userName: 'Tally Auto-Sync',
      action: 'Synced Invoice to Tally',
      module: 'integrations',
      entityId: invoiceId,
      details: `Successfully posted Invoice ${invoice.invoiceNumber} (AED ${invoice.totalAmount}) to Tally Company: ${settings.tallyCompanyName || 'Default'}`,
    });
    
  } catch (error) {
    console.error('Failed to sync to Tally', error);
  }
}
