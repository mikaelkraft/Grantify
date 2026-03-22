// Handler: /api/ai

const fetchNewsContext = async (query, { regionHint } = {}) => {
  const q = `${String(query || '').trim()} ${regionHint || 'Nigeria'}`.trim();
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-NG&gl=NG&ceid=NG:en`;
  const res = await fetch(url, { headers: { 'User-Agent': 'GrantifyBot/1.0' } });
  if (!res.ok) return { items: [], contextText: '' };
  const xml = await res.text();

  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) && items.length < 6) {
    const itemXml = match[1];
    const title = (itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) || itemXml.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
    const link = (itemXml.match(/<link>([\s\S]*?)<\/link>/i) || [])[1];
    const pubDate = (itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1];
    if (!title || !link) continue;
    items.push({
      title: String(title).replace(/<[^>]+>/g, '').trim(),
      link: String(link).trim(),
      pubDate: pubDate ? String(pubDate).trim() : ''
    });
  }

  if (items.length === 0) return { items: [], contextText: '' };
  const contextText = items
    .map((i, idx) => `${idx + 1}. ${i.title}${i.pubDate ? ` (${i.pubDate})` : ''} - ${i.link}`)
    .join('\n');

  return { items, contextText };
};

const buildSourcesHtml = (items) => {
  if (!Array.isArray(items) || items.length === 0) return '';
  const safeItems = items
    .filter((i) => i && typeof i.title === 'string' && typeof i.link === 'string')
    .slice(0, 8);

  if (safeItems.length === 0) return '';

  const listItems = safeItems
    .map((i) => {
      const title = i.title.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
      const href = i.link.replace(/"/g, '&quot;').trim();
      return `<li><a href="${href}" target="_blank" rel="noopener noreferrer">${title}</a></li>`;
    })
    .join('');

  return `<h3>Sources</h3><ul>${listItems}</ul>`;
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, type, history, useSearch } = req.body || {};
  const groqKey = process.env.GROQ_API_KEY;

  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Missing prompt' });

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
    let systemInstruction = '';
    let userPrompt = prompt;
    let newsContext = '';
    let sources = [];

    if (type === 'blog') {
      systemInstruction = `You are a top-tier Nigerian business consultant and financial journalist.
      Write an authoritative, human-sounding 600-word article in HTML format.

      CRITICAL CONTENT RULES:
      1. NEVER use em dashes (—). Use commas, colons, or periods instead.
      2. AVOID generic AI openings or conclusions.
      3. FOCUS deeply on Nigeria: use Naira (₦), mention local states, or CBN/BOI policies.
      4. SOUND like a person, not a textbook. Be strategic and actionable.
      5. LINKS: If you include any links in the article body, use named anchors (descriptive link text). Do NOT show raw URLs in the body.
      6. FORMAT: Use <h2>, <h3>, <p>, <strong>, <ul>, <li>, and <a> tags only.`;

      userPrompt = `Topic: "${prompt}". Write a deep-dive strategy article for Nigerian entrepreneurs.`;

      if (useSearch) {
        try {
          const { items, contextText } = await fetchNewsContext(prompt);
          sources = items;
          newsContext = contextText;
        } catch {
          newsContext = '';
          sources = [];
        }
      }
    } else {
      systemInstruction = `You are the Grantify Concierge. You help people find grants and loans in Nigeria.
      Rules: No em dashes (—). Be concise, professional, and friendly. Speak specifically about Nigerian opportunities.`;

      if (useSearch) {
        try {
          const { items, contextText } = await fetchNewsContext(`${prompt} grants loans funding`, { regionHint: 'Nigeria' });
          sources = items;
          newsContext = contextText;
          if (newsContext) {
            systemInstruction += `\n\nYou may use the provided headlines/links as fresh context. If you reference a headline, include its link. Prefer descriptive named anchors when writing HTML.`;
          }
        } catch {
          newsContext = '';
          sources = [];
        }
      }
    }

    const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';

    const normalizedHistory = Array.isArray(history)
      ? history
          .slice(-12)
          .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .map((m) => ({ role: m.role, content: m.content }))
      : [];

    const messages = type === 'blog'
      ? [
          { role: 'system', content: systemInstruction },
          ...(newsContext
            ? [{ role: 'user', content: `Use these recent headlines and links as context (do not invent facts beyond them):\n${newsContext}` }]
            : []),
          { role: 'user', content: userPrompt }
        ]
      : [
          { role: 'system', content: systemInstruction },
          ...(newsContext
            ? [{ role: 'user', content: `Fresh context (headlines + links). Use only if relevant and do not invent facts beyond them:\n${newsContext}` }]
            : []),
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

    if (type === 'blog') {
      const sourcesHtml = buildSourcesHtml(sources);
      const finalHtml = sourcesHtml && !String(aiText).includes('<h3>Sources</h3>')
        ? `${aiText}\n${sourcesHtml}`
        : aiText;
      return res.status(200).json({ content: finalHtml, sources });
    }

    return res.status(200).json({ text: aiText, sources });
  } catch (err) {
    console.error('AI handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
