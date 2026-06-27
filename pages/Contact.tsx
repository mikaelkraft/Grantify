import React, { useState } from 'react';
import { Send, Mail, Phone, MapPin, CheckCircle } from 'lucide-react';
import { ApiService } from '../services/storage';
import { AdSlot } from '../components/AdSlot';
import { AdConfig } from '../types';

export const Contact: React.FC = () => {
  const [ads, setAds] = React.useState<AdConfig | null>(null);

  React.useEffect(() => {
    document.title = 'Contact Us - Reach Out to the Grantify Team';
    ApiService.getAds().then(setAds).catch(console.error);
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const focusContactForm = () => {
    window.setTimeout(() => {
      document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const prefillSubject = (subject: string) => {
    setFormData(prev => ({ ...prev, subject }));
    focusContactForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await ApiService.submitContactMessage({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        subject: formData.subject,
        message: formData.message
      });
      setSubmitted(true);
    } catch (e) {
      // Fallback: open a prefilled email draft so the message still reaches the team.
      try {
        const subject = `[Grantify Contact] ${formData.subject || 'Message'}`;
        const body = [
          `Name: ${formData.name}`,
          `Email: ${formData.email}`,
          formData.phone ? `Phone: ${formData.phone}` : null,
          '',
          formData.message
        ].filter(Boolean).join('\n');

        const mailto = `mailto:grantifiedme@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;

        try {
          await navigator.clipboard?.writeText(body);
        } catch {
          // ignore
        }
        alert('We could not submit the form automatically. Your email app will open with a prefilled message (and we copied the text to your clipboard).');
      } catch {
        alert('Failed to send message. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Consistent dark input style
  const inputClass = "w-full p-3 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-grantify-gold outline-none";

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg text-center my-10 border border-gray-100 dark:border-gray-800">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Message Sent!</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Thanks — we’ve received your message and will get back to you as soon as possible. If you need to follow up, email <strong>grantifiedme@gmail.com</strong>.
        </p>
        <button 
          onClick={() => {
            setSubmitted(false);
            setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
          }}
          className="bg-grantify-green text-white px-6 py-2 rounded hover:bg-green-800"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
      <h1 className="text-3xl font-bold font-heading text-grantify-green mb-6">Contact Us</h1>
      
      <p className="text-lg text-gray-700 dark:text-gray-200 mb-8 max-w-3xl">
        Have questions about funding options, providers, or your application? We're here to help. Fill out the form below and our team will get back to you as soon as possible.
      </p>

      <div className="mb-8 rounded-3xl border border-gray-100 dark:border-gray-800 bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 text-white p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-grantify-gold/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-grantify-gold mb-3">Business Opportunities</p>
            <h2 className="text-2xl md:text-3xl font-black leading-tight mb-3">Ask for a media kit, featured listing, or lead package.</h2>
            <p className="text-sm md:text-base text-white/80 leading-relaxed">
              We work with lenders, fintech brands, service providers, and sponsors who want qualified traffic and clear placement options.
            </p>
          </div>
        </div>
        <div className="relative z-10 grid gap-3 md:grid-cols-3 mt-6">
          {[
            { title: 'Featured Listing', action: () => prefillSubject('Featured Listing'), copy: 'Priority placement in the provider directory.' },
            { title: 'Sponsored Article', action: () => prefillSubject('Sponsored Content'), copy: 'Clearly labeled editorial sponsorship in the blog.' },
            { title: 'Lead Generation', action: () => prefillSubject('Partnership'), copy: 'Qualified enquiries from users ready to compare offers.' },
          ].map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={item.action}
              className="text-left rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm hover:bg-white/10 transition-all"
            >
              <div className="text-sm font-black uppercase tracking-widest text-grantify-gold mb-2">{item.title}</div>
              <p className="text-sm text-white/75 leading-relaxed">{item.copy}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Header Ad Slot */}
      {ads?.header && (
        <div className="my-8 flex justify-center">
          <AdSlot htmlContent={ads.header} label="Sponsor" />
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8 mb-10">
        <div className="flex items-start gap-4 p-4 bg-green-50 dark:bg-gray-950 rounded-lg border border-green-100 dark:border-gray-800">
          <div className="bg-grantify-green text-white p-3 rounded-full">
            <Mail size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 dark:text-gray-100">Email</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">grantifiedme@gmail.com</p>
          </div>
        </div>
        
        <div className="flex items-start gap-4 p-4 bg-green-50 dark:bg-gray-950 rounded-lg border border-green-100 dark:border-gray-800">
          <div className="bg-grantify-green text-white p-3 rounded-full">
            <Phone size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 dark:text-gray-100">Phone</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Available via WhatsApp</p>
          </div>
        </div>
        
        <div className="flex items-start gap-4 p-4 bg-green-50 dark:bg-gray-950 rounded-lg border border-green-100 dark:border-gray-800">
          <div className="bg-grantify-green text-white p-3 rounded-full">
            <MapPin size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 dark:text-gray-100">Location</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Lagos, Nigeria</p>
          </div>
        </div>
      </div>

      {/* Pre-Form Ad Slot */}
      {ads?.body && (
        <div className="my-8 flex justify-center">
          <AdSlot htmlContent={ads.body} label="Sponsor" />
        </div>
      )}

      <div id="contact-form" className="max-w-2xl mx-auto">
         {/* Ad slot within contact area removed to keep it cleaner */}

        <div className="bg-green-50 dark:bg-gray-950 border border-green-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Send size={20} className="text-grantify-green" />
            Send us a Message
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                <input 
                  type="text" 
                  placeholder="Your full name" 
                  required
                  className={inputClass}
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address *</label>
                <input 
                  type="email" 
                  placeholder="name@example.com" 
                  required
                  className={inputClass}
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                <input 
                  type="text" 
                  placeholder="080..." 
                  className={inputClass}
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject *</label>
                <select 
                  required
                  className={inputClass}
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                  aria-label="Message Subject"
                >
                  <option value="">Select a subject</option>
                  <option value="Loan Inquiry">Loan Inquiry</option>
                  <option value="Application Status">Application Status</option>
                  <option value="Repayment Question">Repayment Question</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Featured Listing">Featured Listing</option>
                  <option value="Sponsored Content">Sponsored Content</option>
                  <option value="Media Kit Request">Media Kit Request</option>
                  <option value="Complaint">Complaint</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message *</label>
              <textarea 
                rows={5}
                placeholder="How can we help you?"
                required
                className={inputClass}
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-grantify-green text-white font-bold py-3 rounded-lg hover:bg-green-800 flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Send size={18} /> {isSubmitting ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
      
      {/* Footer Ad Slot */}
      {ads?.footer && (
        <div className="mt-12 flex justify-center bg-gray-50 dark:bg-gray-950 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
          <AdSlot htmlContent={ads.footer} label="Sponsor" />
        </div>
      )}

    </div>
  );
};
