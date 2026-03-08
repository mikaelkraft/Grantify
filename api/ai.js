// API: /api/ai - AI Content Generation and Assistant
// Uses Groq (OpenAI-compatible Chat Completions)

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, type, history } = req.body || {};
  const groqKey = process.env.GROQ_API_KEY;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  // Fallback for missing keys
  if (!groqKey) {
    if (type === 'blog') {
      return res.status(200).json({ 
        content: `<h2>${prompt}</h2><p>This is a human-optimized article about <strong>${prompt}</strong>. It avoids common AI traits and focuses on the Nigerian business context. To enable live generation, add GROQ_API_KEY to the environment.</p>` 
      });
    }
    return res.status(200).json({ 
      text: `Hello! I'm the Grantify assistant (running in demo mode). Add GROQ_API_KEY to enable live AI responses.`
    });
  }

  try {
    let systemInstruction = "";
    let userPrompt = prompt;

    if (type === 'blog') {
      systemInstruction = `You are a top-tier Nigerian business consultant and financial journalist.
      Write an authoritative, human-sounding 600-word article in HTML format.
      
      CRITICAL CONTENT RULES:
      1. NEVER use em dashes (—). Use commas, colons, or periods instead.
      2. AVOID generic AI openings or conclusions.
      3. FOCUS deeply on Nigeria: use Naira (₦), mention local states, or CBN/BOI policies.
      4. SOUND like a person, not a textbook. Be strategic and actionable.
      5. FORMAT: Use <h2>, <h3>, <p>, <strong>, and <ul> tags only.`;
      
      userPrompt = `Topic: "${prompt}". Write a deep-dive strategy article for Nigerian entrepreneurs.`;
    } else {
      systemInstruction = `You are the Grantify Concierge. You help people find grants and loans in Nigeria.
      Rules: No em dashes (—). Be concise, professional, and friendly. Speak specifically about Nigerian opportunities.`;
    }

    const groqUrl = `https://api.groq.com/openai/v1/chat/completions`;

    const normalizedHistory = Array.isArray(history)
      ? history
          .slice(-12)
          .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .map((m) => ({ role: m.role, content: m.content }))
      : [];

    const messages = type === 'blog'
      ? [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ]
      : [
          { role: 'system', content: systemInstruction },
          ...normalizedHistory,
          { role: 'user', content: userPrompt }
        ];

    const response = await fetch(groqUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.8
      })
    });

    if (!response.ok) throw new Error('Groq API Error');
    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || 'No response generated.';
    return res.status(200).json(type === 'blog' ? { content: aiText } : { text: aiText });
  } catch (err) {
    console.error('AI API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
