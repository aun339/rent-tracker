import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { system, messages } = await req.json();

  const groqMessages = [
    { role: 'system', content: system },
    ...messages.filter((m: any) => m.content && m.content.trim()).map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      max_tokens: 1000,
      temperature: 0.3,
    }),
  });

  const data = await response.json();

  if (data.error) {
    console.error('Groq error:', data.error);
    return NextResponse.json({ content: [{ type: 'text', text: 'Error: ' + data.error.message }] });
  }

  const text = data.choices?.[0]?.message?.content || '';

  return NextResponse.json({
    content: [{ type: 'text', text }],
  });
}