import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, X, Send, Loader2, Bot, ChevronDown } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type ChatPos = { x: number; y: number };

export const AiChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm your Grantify AI assistant. How can I help you today with grants, loans, or business scaling?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const buttonSize = 64;
  const margin = 24;
  const storageKey = 'grantify_chat_pos_v1';

  const clampPos = (pos: ChatPos): ChatPos => {
    const maxX = Math.max(0, window.innerWidth - buttonSize - margin);
    const maxY = Math.max(0, window.innerHeight - buttonSize - margin);
    return {
      x: Math.min(Math.max(margin, pos.x), maxX),
      y: Math.min(Math.max(margin, pos.y), maxY)
    };
  };

  const getDefaultPos = (): ChatPos => {
    return clampPos({
      // Default to bottom-left so it doesn't conflict with right-side trays (e.g. reviews)
      x: margin,
      y: window.innerHeight - buttonSize - margin
    });
  };

  const [pos, setPos] = useState<ChatPos>(() => ({ x: margin, y: margin }));
  const dragStateRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  }>({ pointerId: null, startX: 0, startY: 0, originX: 0, originY: 0, moved: false });

  useEffect(() => {
    // Load initial position after mount (needs window size).
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPos(clampPos({ x: parsed.x, y: parsed.y }));
          return;
        }
      }
    } catch {
      // ignore
    }
    setPos(getDefaultPos());
  }, []);

  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const partsToNodes = useMemo(() => {
    const urlRegex = /((?:https?:\/\/|www\.)[^\s<]+)|((?:\/blog\/|\/loan-providers|\/blog)\/?[^\s<]*)/gi;

    const normalizeInternalHref = (href: string) => {
      const raw = String(href || '').trim();
      if (!raw) return '';

      // Allow plain internal paths.
      if (raw.startsWith('/')) return raw;

      // Convert absolute Grantify links into internal SPA routes.
      // Supports both BrowserRouter-style and legacy HashRouter-style URLs.
      try {
        const u = new URL(raw);
        if (u.hostname === 'grantify.help' || u.hostname.endsWith('.grantify.help')) {
          if (u.hash && u.hash.startsWith('#/')) return u.hash.slice(1);
          return u.pathname || '/';
        }
      } catch {
        // ignore
      }

      return '';
    };

    const prettifyLinkText = (href: string, text: string) => {
      const t = String(text || '').trim();
      const h = String(href || '').trim();
      if (!t) return h;
      if (t === h) {
        try {
          const u = new URL(h);
          return u.hostname;
        } catch {
          return t;
        }
      }
      return t;
    };

    const renderTextWithLinks = (text: string) => {
      const nodes: React.ReactNode[] = [];
      const safe = String(text || '');
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      // eslint-disable-next-line no-cond-assign
      while ((match = urlRegex.exec(safe))) {
        const full = match[0];
        const index = match.index;
        if (index > lastIndex) nodes.push(safe.slice(lastIndex, index));

        const external = match[1];
        const internal = match[2];

        if (internal) {
          nodes.push(
            <Link
              key={`l_${index}`}
              to={internal}
              className="underline break-all"
              onClick={() => setIsOpen(false)}
            >
              {internal}
            </Link>
          );
        } else if (external) {
          const href = external.startsWith('http') ? external : `https://${external}`;
          nodes.push(
            <a
              key={`a_${index}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline break-all"
            >
              {external}
            </a>
          );
        }

        lastIndex = index + full.length;
      }
      if (lastIndex < safe.length) nodes.push(safe.slice(lastIndex));
      return nodes;
    };

    const renderAssistantContent = (content: string) => {
      const raw = String(content || '');
      // Fast path for plain text.
      if (!/[<>]/.test(raw) || typeof DOMParser === 'undefined') {
        return renderTextWithLinks(raw);
      }

      try {
        const doc = new DOMParser().parseFromString(raw, 'text/html');
        const nodes: React.ReactNode[] = [];
        let key = 0;

        const pushText = (t: string) => {
          if (!t) return;
          nodes.push(...renderTextWithLinks(t));
        };

        const pushBreak = () => {
          // Avoid stacking too many blank lines.
          const last = nodes[nodes.length - 1];
          if (last && (last as any)?.type === 'br') return;
          nodes.push(<br key={`br_${key++}`} />);
        };

        const walk = (node: Node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            pushText((node.nodeValue || '').replace(/\s+/g, ' '));
            return;
          }
          if (node.nodeType !== Node.ELEMENT_NODE) return;

          const el = node as Element;
          const tag = el.tagName.toLowerCase();

          if (tag === 'br') {
            pushBreak();
            return;
          }

          if (tag === 'a') {
            const href = String(el.getAttribute('href') || '').trim();
            const text = prettifyLinkText(href, el.textContent || '');
            const internal = normalizeInternalHref(href);

            if (internal) {
              nodes.push(
                <Link
                  key={`il_${key++}`}
                  to={internal}
                  className="underline break-words"
                  onClick={() => setIsOpen(false)}
                >
                  {text}
                </Link>
              );
              return;
            }

            if (/^https?:\/\//i.test(href)) {
              nodes.push(
                <a
                  key={`ea_${key++}`}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline break-words"
                >
                  {text || href}
                </a>
              );
              return;
            }

            // Unknown/unsafe href, render as plain text.
            pushText(text);
            return;
          }

          // Treat common block tags as paragraph boundaries.
          if (tag === 'p' || tag === 'div' || tag === 'li' || tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'ul' || tag === 'ol') {
            if (nodes.length) pushBreak();
            if (tag === 'li') pushText('• ');
            Array.from(el.childNodes).forEach(walk);
            pushBreak();
            return;
          }

          // Inline / unknown tags: walk children.
          Array.from(el.childNodes).forEach(walk);
        };

        Array.from(doc.body.childNodes).forEach(walk);
        return nodes.length ? nodes : renderTextWithLinks(raw.replace(/<[^>]+>/g, ''));
      } catch {
        return renderTextWithLinks(raw.replace(/<[^>]+>/g, ''));
      }
    };

    return { renderTextWithLinks, renderAssistantContent };
  }, []);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: userMessage, 
          type: 'chat',
          history: messages,
          useSearch: true
        })
      });

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.text || "Sorry, I couldn't process that. Please try again." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting to my brain right now. Please try again later!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePointerDown: React.PointerEventHandler<HTMLButtonElement> = (e) => {
    // Left click or touch only
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    (e.currentTarget as HTMLButtonElement).setPointerCapture?.(e.pointerId);
    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: false
    };
  };

  const handleTogglePointerMove: React.PointerEventHandler<HTMLButtonElement> = (e) => {
    const st = dragStateRef.current;
    if (st.pointerId !== e.pointerId) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (!st.moved && Math.hypot(dx, dy) < 6) return;
    st.moved = true;
    setPos(clampPos({ x: st.originX + dx, y: st.originY + dy }));
  };

  const handleTogglePointerUp: React.PointerEventHandler<HTMLButtonElement> = (e) => {
    const st = dragStateRef.current;
    if (st.pointerId !== e.pointerId) return;
    dragStateRef.current.pointerId = null;

    if (st.moved) {
      setPos((p) => {
        const next = clampPos(p);
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      return;
    }
    setIsOpen((v) => !v);
  };

  const popDirection = pos.y > 560 ? 'up' : 'down';
  const chatWindowClass = popDirection === 'up'
    ? 'bottom-[76px] right-0'
    : 'top-[76px] right-0';

  return (
    <div
      className="fixed z-10 pointer-events-none"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Chat Window */}
      {isOpen && (
        <div
          className={`pointer-events-auto absolute ${chatWindowClass} w-80 md:w-96 h-[500px] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300`}
        >
          {/* Header */}
          <div className="p-6 bg-grantify-green text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot size={20} className="text-grantify-gold" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Grantify AI Assistant</h4>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-grantify-gold rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-green-100 font-bold uppercase tracking-wider">Online</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full transition"
              title="Minimize chat"
            >
              <ChevronDown size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-gray-50/50 dark:bg-gray-950">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-grantify-green text-white rounded-tr-none' 
                    : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-sm border border-gray-100 dark:border-gray-800 rounded-tl-none'
                }`}>
                  <div className="whitespace-pre-wrap break-words">
                    {msg.role === 'assistant'
                      ? partsToNodes.renderAssistantContent(msg.content)
                      : partsToNodes.renderTextWithLinks(msg.content)}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 dark:border-gray-800">
                  <Loader2 size={16} className="animate-spin text-grantify-green" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-grow px-4 py-3 bg-gray-50 dark:bg-gray-950 rounded-xl outline-none focus:ring-2 focus:ring-grantify-green transition text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              disabled={isLoading}
            />
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className="w-12 h-12 bg-grantify-green text-white rounded-xl flex items-center justify-center hover:bg-green-800 transition disabled:opacity-50"
              title="Send message"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {/* Toggle Button (draggable) */}
      <button
        onPointerDown={handleTogglePointerDown}
        onPointerMove={handleTogglePointerMove}
        onPointerUp={handleTogglePointerUp}
        onPointerCancel={handleTogglePointerUp}
        className="pointer-events-auto w-16 h-16 bg-grantify-green text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group relative touch-none"
        title={isOpen ? "Close chat" : "Open AI assistant"}
        aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
      >
        {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-grantify-gold rounded-full flex items-center justify-center text-[10px] font-black text-grantify-green shadow-md">
            1
          </span>
        )}
      </button>
    </div>
  );
};
