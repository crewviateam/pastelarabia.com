import OpenAI from 'openai';

const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || '',
  baseURL: 'https://api.groq.com/openai/v1',
});

const MODEL = 'openai/gpt-oss-20b';

export async function chatCompletion(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  try {
    const response = await groqClient.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });

    return response.choices[0]?.message?.content || 'I could not generate a response.';
  } catch (error: any) {
    console.error('AI Error:', error.message);
    return 'Sorry, I encountered an error processing your request. Please try again.';
  }
}

export async function generateBusinessMessage(
  type: 'payment_reminder' | 'product_offer' | 'follow_up',
  context: Record<string, any>,
  language: 'en' | 'ar' = 'en'
): Promise<string> {
  const languageInstruction = language === 'ar' 
    ? 'Write the message in Arabic. Use professional Arabic business language.'
    : 'Write the message in English.';

  const prompts: Record<string, string> = {
    payment_reminder: `Generate a polite professional payment reminder message for a cosmetics wholesale business. ${languageInstruction}
Customer: ${context.customerName}
Outstanding Amount: AED ${context.amount}
Invoice: ${context.invoiceNumber}
Days Overdue: ${context.daysOverdue}
Keep it concise, professional, and friendly.`,
    product_offer: `Generate a professional product offer/promotion message for a cosmetics wholesale business. ${languageInstruction}
Product: ${context.productName}
Special Price: AED ${context.price}
Valid Until: ${context.validUntil}
Keep it engaging and professional.`,
    follow_up: `Generate a professional customer follow-up message for a cosmetics wholesale business. ${languageInstruction}
Customer: ${context.customerName}
Last Purchase: ${context.lastPurchase}
Keep it warm and professional, encouraging a reorder.`,
  };

  return chatCompletion(
    'You are a professional business message writer for a cosmetics wholesale company in the UAE. Write concise, professional messages.',
    [{ role: 'user', content: prompts[type] || prompts.follow_up }]
  );
}

export { groqClient, MODEL };
