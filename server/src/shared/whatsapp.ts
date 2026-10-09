import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import QRCode from 'qrcode';

export let whatsappClient: Client | null = null;
export let isWhatsappReady = false;
export let qrCodeDataUrl: string | null = null;
export let whatsappError: string | null = null;

export const initWhatsApp = () => {
  whatsappClient = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined),
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-extensions',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    }
  });

  whatsappClient.on('qr', async (qr) => {
    console.log('WhatsApp: QR Code received, scan it!');
    qrCodeDataUrl = await QRCode.toDataURL(qr);
    isWhatsappReady = false;
    whatsappError = null;
  });

  whatsappClient.on('ready', () => {
    console.log('WhatsApp: Client is ready!');
    isWhatsappReady = true;
    qrCodeDataUrl = null;
    whatsappError = null;
  });

  whatsappClient.on('authenticated', () => {
    console.log('WhatsApp: Authenticated');
    isWhatsappReady = true;
    qrCodeDataUrl = null;
    whatsappError = null;
  });

  whatsappClient.on('auth_failure', msg => {
    console.error('WhatsApp: Authentication failure', msg);
    isWhatsappReady = false;
    qrCodeDataUrl = null;
    whatsappError = 'Authentication failed. Please reconnect.';
  });

  whatsappClient.on('disconnected', (reason) => {
    console.log('WhatsApp: Client was logged out', reason);
    isWhatsappReady = false;
    qrCodeDataUrl = null;
  });

  whatsappClient.initialize().catch(err => {
    console.error('WhatsApp initialization error:', err);
    whatsappError = err.message || 'Failed to initialize WhatsApp Engine. Please restart the backend.';
  });
};

const formatNumber = (to: string) => {
  let formattedNumber = to.replace(/\D/g, '');
  if (!formattedNumber.startsWith('971') && formattedNumber.startsWith('0')) {
    formattedNumber = '971' + formattedNumber.substring(1);
  }
  return `${formattedNumber}@c.us`;
};

export const sendWhatsAppMessage = async (to: string, message: string) => {
  if (!whatsappClient || !isWhatsappReady) {
    throw new Error('WhatsApp client is not ready. Please scan the QR code in settings.');
  }

  const chatId = formatNumber(to);

  try {
    const chat = await whatsappClient.getChatById(chatId);
    await chat.sendMessage(message);
    return true;
  } catch (error) {
    console.error('WhatsApp Send Error:', error);
    throw error;
  }
};

export const sendWhatsAppPdf = async (to: string, pdfBuffer: Buffer, fileName: string, caption: string) => {
  if (!whatsappClient || !isWhatsappReady) {
    throw new Error('WhatsApp client is not ready. Please scan the QR code in settings.');
  }

  const chatId = formatNumber(to);
  const media = new MessageMedia('application/pdf', pdfBuffer.toString('base64'), fileName);

  try {
    const chat = await whatsappClient.getChatById(chatId);
    await chat.sendMessage(media, { 
      caption,
      sendMediaAsDocument: true 
    });
    return true;
  } catch (error) {
    console.error('WhatsApp Send PDF Error:', error);
    throw error;
  }
};

export const logoutWhatsApp = async () => {
  if (whatsappClient) {
    await whatsappClient.logout();
    isWhatsappReady = false;
    qrCodeDataUrl = null;
    whatsappClient.initialize().catch(err => console.error(err));
  }
};

export const getWhatsappInfo = () => {
  if (!isWhatsappReady || !whatsappClient || !whatsappClient.info) return null;
  return {
    pushname: whatsappClient.info.pushname || 'WhatsApp Account',
    wid: whatsappClient.info.wid ? whatsappClient.info.wid.user : 'Unknown Number',
  };
};
