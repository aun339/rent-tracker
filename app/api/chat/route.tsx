import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  const { system, messages, imageBase64, imageType, pdfText } = body;

  // Build system prompt — inject PDF text or image instruction
  let fullSystem = system;
  if (pdfText) fullSystem += `\n\nPDF CONTENT EXTRACTED:\n${pdfText}`;
  if (imageBase64) fullSystem += `\n\nThe user has uploaded an image. Analyze it carefully for any rent receipts, building names, house numbers, tenant names, amounts, or dates and extract that information into the appropriate action.`;

  const groqMessages: any[] = [{ role: 'system', content: fullSystem }];

  // Add conversation history
  for (const m of messages.filter((m: any) => m.content?.trim())) {
    groqMessages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
  }

  // If image, use vision model
  if (imageBase64) {
    // Use llama vision for image understanding
    const visionMessages = [
      { role: 'system', content: fullSystem },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${imageType};base64,${imageBase64}` } },
          { type: 'text', text: messages[messages.length - 1]?.content || 'Analyze this image and extract rent information.' }
        ]
      }
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model: 'llama-3.2-90b-vision-preview', messages: visionMessages, max_tokens: 1000, temperature: 0.2 }),
    });
    const data = await response.json();
    if (data.error) return NextResponse.json({ content: [{ type:'text', text:'Error: '+data.error.message }] });
    return NextResponse.json({ content: [{ type:'text', text: data.choices?.[0]?.message?.content || '' }] });
  }

  // Normal text
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: groqMessages, max_tokens: 1000, temperature: 0.2 }),
  });
  const data = await response.json();
  if (data.error) return NextResponse.json({ content: [{ type:'text', text:'Error: '+data.error.message }] });
  return NextResponse.json({ content: [{ type:'text', text: data.choices?.[0]?.message?.content || '' }] });
}
