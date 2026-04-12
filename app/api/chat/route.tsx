import { NextResponse } from 'next/server';
 
export async function POST(req: Request) {
  const { system, messages } = await req.json();
 
  // Filter out any empty messages and format for Gemini
  const contents = messages
    .filter((m: any) => m.content && m.content.trim())
    .map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
 
  // Gemini needs at least one message
  if (contents.length === 0) {
    return NextResponse.json({ content: [{ type: 'text', text: '' }] });
  }
 
  // Gemini requires conversation to start with user
  if (contents[0].role === 'model') {
    contents.shift();
  }
 
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: 1000, temperature: 0.3 },
      }),
    }
  );
 
  const data = await response.json();
  
  // Log error if any
  if (data.error) {
    console.error('Gemini error:', data.error);
    return NextResponse.json({ content: [{ type: 'text', text: 'Error: ' + data.error.message }] });
  }
 
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
 
  return NextResponse.json({
    content: [{ type: 'text', text }],
  });
}