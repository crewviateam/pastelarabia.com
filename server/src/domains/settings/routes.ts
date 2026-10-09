import { Hono } from 'hono';
import { db } from '../../db';
import * as s from '../../db/schema';
import { eq } from 'drizzle-orm';

const settings = new Hono<{ Variables: { user: any } }>();

settings.get('/', async (c) => {
  let [conf] = await db.select().from(s.companySettings).limit(1);
  if (!conf) {
    [conf] = await db.insert(s.companySettings).values({}).returning();
  }
  return c.json(conf);
});

settings.put('/', async (c) => {
  const body = await c.req.json();
  let [conf] = await db.select().from(s.companySettings).limit(1);
  
  if (!conf) {
    [conf] = await db.insert(s.companySettings).values({
      tallyEnabled: body.tallyEnabled,
      tallyServerUrl: body.tallyServerUrl,
      tallyCompanyName: body.tallyCompanyName
    }).returning();
  } else {
    [conf] = await db.update(s.companySettings)
      .set({
        tallyEnabled: body.tallyEnabled !== undefined ? body.tallyEnabled : conf.tallyEnabled,
        tallyServerUrl: body.tallyServerUrl !== undefined ? body.tallyServerUrl : conf.tallyServerUrl,
        tallyCompanyName: body.tallyCompanyName !== undefined ? body.tallyCompanyName : conf.tallyCompanyName,
        updatedAt: new Date(),
      })
      .where(eq(s.companySettings.id, conf.id))
      .returning();
  }
  
  return c.json(conf);
});

export default settings;
