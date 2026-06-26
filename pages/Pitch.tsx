import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/storage';
import { Trophy, ThumbsUp, Send, Loader2, Sparkles, Award, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const SECTORS = ['Agriculture', 'Tech', 'Trade', 'Creative', 'Manufacturing', 'Health', 'Education', 'Finance', 'Other'];
const WORD_LIMIT = 100;

const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

interface Pitch {
  id: string;
  name: string;
  sector: string;
  content: string;
  claps: number;
  is_winner: boolean;
  week_label: string;
  created_at: string;
}

export const Pitch: React.FC = () => {
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clappedIds, setClappedIds] = useState<Set<string>>(new Set());
  const [clappingId, setClappingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', sector: '', content: '' });

  useEffect(() => {
    document.title = 'Fund My Business Pitch Competition — Weekly ₦50K Prize | Grantify';
    loadPitches();
    // Restore locally clapped pitches from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('grantify_clapped_pitches') || '[]');
      setClappedIds(new Set(saved));
    } catch { /* ignore */ }
  }, []);

  const loadPitches = async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.getPitches();
      setPitches(Array.isArray(data?.pitches) ? data.pitches : []);
    } catch (err) {
      console.error('Failed to load pitches', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClap = async (pitch: Pitch) => {
    if (clappedIds.has(pitch.id) || clappingId) return;
    setClappingId(pitch.id);
    try {
      const result = await ApiService.clapPitch(pitch.id);
      if (result?.claps !== undefined) {
        setPitches(prev => prev.map(p => p.id === pitch.id ? { ...p, claps: result.claps } : p));
        const next = new Set(clappedIds);
        next.add(pitch.id);
        setClappedIds(next);
        try { localStorage.setItem('grantify_clapped_pitches', JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      }
    } catch (err: any) {
      // 409 = already clapped from this IP
    } finally {
      setClappingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!form.name.trim() || !form.sector || !form.content.trim()) {
      setMessage('Please fill in all fields.');
      return;
    }
    const wordCount = countWords(form.content);
    if (wordCount > WORD_LIMIT) {
      setMessage(`Your pitch is ${wordCount} words. Please keep it to ${WORD_LIMIT} words or less.`);
      return;
    }
    setSubmitting(true);
    try {
      await ApiService.submitPitch(form);
      setMessage('🎉 Your pitch has been submitted! Good luck.');
      setForm({ name: '', sector: '', content: '' });
      setShowForm(false);
      await loadPitches();
    } catch (err: any) {
      setMessage(err?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const wordCount = countWords(form.content);
  const isOverLimit = wordCount > WORD_LIMIT;
  const winner = pitches.find(p => p.is_winner);
  const nonWinners = pitches.filter(p => !p.is_winner);
  const weekLabel = pitches[0]?.week_label || 'This Week';

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="rounded-[2rem] bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 text-white p-8 md:p-12 shadow-2xl relative overflow-hidden mb-10">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-grantify-gold/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-grantify-gold/20 border border-grantify-gold/30 text-grantify-gold rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest mb-4">
            <Trophy size={12} /> Weekly Competition · {weekLabel}
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-[1.1] mb-4">
            Fund My Business<br />
            <span className="text-grantify-gold">Pitch Competition</span>
          </h1>
          <p className="text-white/80 text-base max-w-xl leading-relaxed mb-6">
            Share your 100-word business pitch. The community votes. The most compelling idea wins
            <strong className="text-white"> ₦50,000</strong> in advertising visibility and business tool credits.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-grantify-gold text-gray-900 font-black px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              <Send size={16} /> Submit Your Pitch
            </button>
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <Clock size={14} /> New winner announced weekly
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-2xl border text-sm font-bold flex items-center gap-2 ${
          message.includes('🎉') ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
        }`}>
          {message.includes('🎉') ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message}
        </div>
      )}

      {/* Submission Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-[1.75rem] border border-gray-100 dark:border-gray-800 shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Submit Pitch</div>
                <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">Share Your Business Idea</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Your Name</label>
                <input
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-800 dark:text-gray-100"
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="John Adeyemi" required maxLength={80}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Business Sector</label>
                <select
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-800 dark:text-gray-100"
                  value={form.sector} onChange={e => setForm(p => ({ ...p, sector: e.target.value }))} required
                  title="Business Sector"
                  aria-label="Business Sector"
                >
                  <option value="">Select sector…</option>
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
                  Your Pitch
                  <span className={`ml-2 font-bold ${isOverLimit ? 'text-red-500' : wordCount > 80 ? 'text-amber-500' : 'text-gray-400'}`}>
                    {wordCount}/{WORD_LIMIT} words
                  </span>
                </label>
                <textarea
                  className={`w-full min-h-[120px] rounded-xl border p-3 text-sm text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-950 resize-none ${
                    isOverLimit ? 'border-red-400' : 'border-gray-200 dark:border-gray-800'
                  }`}
                  value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="Describe your business idea in 100 words or less. What problem does it solve? Who is your customer? Why will it succeed?"
                  required
                />
                {isOverLimit && <p className="text-xs text-red-500 mt-1">{wordCount - WORD_LIMIT} words over the limit.</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-black text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={submitting || isOverLimit} className="flex-1 inline-flex items-center justify-center gap-2 bg-grantify-green text-white py-3 rounded-xl text-sm font-black shadow-md hover:shadow-lg hover:bg-green-700 transition-all disabled:opacity-50">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {submitting ? 'Submitting…' : 'Submit Pitch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Winner Spotlight */}
      {winner && (
        <div className="mb-8 rounded-2xl border-2 border-grantify-gold bg-gradient-to-br from-grantify-gold/10 to-amber-50 dark:from-grantify-gold/5 dark:to-amber-900/10 p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="text-grantify-gold" size={20} />
            <span className="text-xs font-black uppercase tracking-widest text-grantify-gold">🏆 This Week's Winner</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-black text-gray-900 dark:text-gray-100 text-lg">{winner.name}</div>
              <div className="text-xs font-bold text-grantify-gold uppercase tracking-wider mb-2">{winner.sector}</div>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed italic">"{winner.content}"</p>
            </div>
            <div className="text-center flex-shrink-0">
              <div className="text-2xl font-black text-grantify-gold">{winner.claps}</div>
              <div className="text-[10px] text-gray-400 uppercase font-bold">claps</div>
            </div>
          </div>
        </div>
      )}

      {/* Pitches Grid */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">Community Pitches</h2>
          <p className="text-sm text-gray-500 mt-0.5">Vote for the most compelling business idea</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-gray-900 dark:bg-gray-700 text-white font-black text-sm px-4 py-2.5 rounded-xl shadow-sm hover:bg-grantify-green transition-all"
        >
          <Send size={14} /> Submit
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-grantify-green" size={32} /></div>
      ) : nonWinners.length === 0 && !winner ? (
        <div className="text-center py-16 text-gray-400">
          <Sparkles size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold text-lg">No pitches yet this week.</p>
          <p className="text-sm mt-1">Be the first to submit your business idea!</p>
          <button onClick={() => setShowForm(true)} className="mt-4 inline-flex items-center gap-2 bg-grantify-green text-white font-black px-5 py-2.5 rounded-xl shadow-md hover:bg-green-700 transition-all">
            <Send size={14} /> Submit Your Pitch
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {nonWinners.map((pitch, i) => {
            const hasClapped = clappedIds.has(pitch.id);
            const isClapping = clappingId === pitch.id;
            return (
              <div key={pitch.id} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-black text-gray-900 dark:text-gray-100">{pitch.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-grantify-green bg-grantify-green/10 px-2 py-0.5 rounded-full">{pitch.sector}</span>
                      <span className="text-[10px] text-gray-400">{pitch.week_label}</span>
                    </div>
                  </div>
                  {i === 0 && !winner && (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                      <Award size={8} /> Leading
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4 italic">"{pitch.content}"</p>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleClap(pitch)}
                    disabled={hasClapped || !!clappingId}
                    className={`inline-flex items-center gap-2 text-sm font-black px-4 py-2 rounded-xl border transition-all ${
                      hasClapped
                        ? 'bg-grantify-green/10 border-grantify-green/30 text-grantify-green cursor-default'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-grantify-green/5 hover:border-grantify-green/30 hover:text-grantify-green'
                    } disabled:opacity-60`}
                  >
                    {isClapping ? <Loader2 size={14} className="animate-spin" /> : <ThumbsUp size={14} />}
                    {hasClapped ? 'Clapped!' : 'Clap'} · {pitch.claps}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* How it Works */}
      <div className="mt-12 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <h3 className="font-black text-gray-900 dark:text-gray-100 mb-4">How the Competition Works</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { num: '1', title: 'Submit', desc: 'Write a 100-word pitch explaining your business idea and why it deserves funding.' },
            { num: '2', title: 'Vote', desc: 'The community claps for the most compelling pitches. One clap per IP address.' },
            { num: '3', title: 'Win', desc: 'The top-clapped pitch each week wins ₦50,000 in advertising visibility and business credits.' },
          ].map(step => (
            <div key={step.num} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-grantify-green text-white font-black text-sm flex items-center justify-center flex-shrink-0">{step.num}</div>
              <div>
                <div className="font-black text-gray-900 dark:text-gray-100 text-sm mb-0.5">{step.title}</div>
                <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
