import React, { useState } from 'react';
import { Send, Mail, Phone, MapPin, CheckCircle } from 'lucide-react';
import { ApiService } from '../services/storage';
import { AdSlot } from '../components/AdSlot';
import { AdConfig } from '../types';

export const Contact: React.FC = () => {
  const [ads, setAds] = React.useState<AdConfig | null>(null);

  React.useEffect(() => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const subject = `Contact Form: ${formData.subject}`;
    const body = `Dear Grantify Team,

${formData.message}

---
Contact Details:
Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}

Sent from Grantify Contact Form`;

    // Construct mailto link
    window.location.href = `mailto:grantifiedme@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSubmitted(true);
  };

  // Consistent dark input style
  const inputClass = "w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-grantify-gold outline-none";

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg text-center my-10">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Message Ready!</h2>
        <p className="text-gray-600 mb-6">
          Your email client should have opened with your message. If it didn't, please send your inquiry directly to <strong>grantifyme@gmail.com</strong>
        </p>
        <button 
          onClick={() => setSubmitted(false)}
          className="bg-grantify-green text-white px-6 py-2 rounded hover:bg-green-800"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-sm">
      <h1 className="text-3xl font-bold font-heading text-grantify-green mb-6">Contact Us</h1>
      
      <p className="text-lg text-gray-700 mb-8 max-w-3xl">
        Have questions about our loan services or need assistance? We're here to help! Fill out the form below and our team will get back to you as soon as possible.
      </p>

      {/* Header Ad Slot */}
      {ads?.header && (
        <div className="my-8 flex justify-center">
          <AdSlot htmlContent={ads.header} label="Sponsor" />
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8 mb-10">
        <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border border-green-100">
          <div className="bg-grantify-green text-white p-3 rounded-full">
            <Mail size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Email</h3>
            <p className="text-sm text-gray-600">grantifiedme@gmail.com</p>
          </div>
        </div>
        
        <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border border-green-100">
          <div className="bg-grantify-green text-white p-3 rounded-full">
            <Phone size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Phone</h3>
            <p className="text-sm text-gray-600">Available via WhatsApp</p>
          </div>
        </div>
        
        <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border border-green-100">
          <div className="bg-grantify-green text-white p-3 rounded-full">
            <MapPin size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Location</h3>
            <p className="text-sm text-gray-600">Lagos, Nigeria</p>
          </div>
        </div>
      </div>

      {/* Pre-Form Ad Slot */}
      {ads?.body && (
        <div className="my-8 flex justify-center">
          <AdSlot htmlContent={ads.body} label="Sponsor" />
        </div>
      )}

      <div className="max-w-2xl mx-auto">
         {/* Ad slot within contact area removed to keep it cleaner */}

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Send size={20} className="text-grantify-green" />
            Send us a Message
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input 
                  type="text" 
                  placeholder="080..." 
                  className={inputClass}
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
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
                  <option value="Complaint">Complaint</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
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
              className="w-full bg-grantify-green text-white font-bold py-3 rounded-lg hover:bg-green-800 flex items-center justify-center gap-2 shadow-lg transition"
            >
              <Send size={18} /> Send Message
            </button>

            <p className="text-xs text-gray-500 text-center mt-2">
              * Clicking send will open your email client to complete the message.
            </p>
          </form>
        </div>
      </div>
      
      {/* Footer Ad Slot */}
      {ads?.footer && (
        <div className="mt-12 flex justify-center bg-gray-50 p-4 rounded-xl">
          <AdSlot htmlContent={ads.footer} label="Sponsor" />
        </div>
      )}

    </div>
  );
};
