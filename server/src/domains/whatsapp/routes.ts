import { Hono } from 'hono';
import { isWhatsappReady, qrCodeDataUrl, logoutWhatsApp, getWhatsappInfo, whatsappError } from '../../shared/whatsapp';
import { authMiddleware } from '../../shared/auth';

const whatsappRoutes = new Hono<{ Variables: { user: any } }>();
whatsappRoutes.use('*', authMiddleware);

whatsappRoutes.get('/status', (c) => {
  return c.json({
    ready: isWhatsappReady,
    hasQr: !!qrCodeDataUrl,
    info: getWhatsappInfo(),
    error: whatsappError,
  });
});

whatsappRoutes.post('/logout', async (c) => {
  await logoutWhatsApp();
  return c.json({ success: true });
});

whatsappRoutes.get('/qr', (c) => {
  if (isWhatsappReady) {
    return c.json({ error: 'WhatsApp is already connected' }, 400);
  }
  if (!qrCodeDataUrl) {
    return c.json({ error: 'QR Code not yet generated, please wait a moment' }, 404);
  }
  return c.json({ qrCode: qrCodeDataUrl });
});

export default whatsappRoutes;
