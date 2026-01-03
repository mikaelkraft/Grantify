import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ApiService } from '../services/storage';
import { Send, Zap, Loader2 } from 'lucide-react';
import { AdverticaBanner } from '../components/AdverticaBanner';
import { AdverticaResponsiveBanner } from '../components/AdverticaResponsiveBanner';
import { RepaymentContent } from '../types';
import { formatNaira } from '../utils/currency';

export const Repayment: React.FC = () => {
  const location = useLocation();
  const [content, setContent] = useState<RepaymentContent | null>(null);
  const [error, setError] = useState('');
  const [ftForm, setFtForm] = useState({
    name: '',
    phone: '',
    email: '',
    amount: ''
  });

  useEffect(() => {
    const loadContent = async () => {
      try {
        const data = await ApiService.getRepaymentContent();
        setContent(data);
        setError('');
      } catch (e) {
        console.error("Failed to load repayment content", e);
        setError('Failed to load content. Please check your connection and try again.');
      }
    };
    loadContent();
  }, []);

  // Handle scrolling to anchor from hash
  useEffect(() => {
    if (location.hash && content) {
      const element = document.querySelector(location.hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location.hash, content]);

  const generateTableData = (start: number, end: number, step: number, months: number) => {
    const rows = [];
    for(let amt = start; amt <= end; amt += step) {
      rows.push({
        principal: amt,
        repayment: amt * 1.05,
        duration: months
      })
    }
    return rows;
  };

  const standardLoans = generateTableData(50000, 500000, 50000, 3);
  const fastTrackLoans = generateTableData(1000000, 5000000, 1000000, 6);

  const handleFastTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const subject = `Fast Track Loan Request - ${ftForm.name}`;
    const body = `Dear Admin,

I would like to apply for a Fast Track Loan.

Name: ${ftForm.name}
Phone: ${ftForm.phone}
Email: ${ftForm.email}
Requested Amount: ${formatNaira(parseInt(ftForm.amount))}

I understand that this request attracts a processing fee of NGN 20,000 and I am ready to proceed.

Regards,
${ftForm.name}`;

    // Construct mailto link
    window.location.href = `mailto:grantifyme@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Consistent dark input style
  const inputClass = "w-full p-2 border border-gray-600 rounded bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-grantify-gold outline-none";

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-800 mb-2">Connection Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-grantify-green text-white px-6 py-2 rounded hover:bg-green-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="animate-spin text-grantify-green" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-white p-4 md:p-8 rounded-lg shadow-sm">
      <h1 className="text-3xl font-bold font-heading text-grantify-green mb-6">Repayment Plan</h1>
      
      <p className="text-lg text-gray-700 mb-8 max-w-3xl">
        {content.introText}
      </p>

      {/* Advertica Banner Slot 1 */}
      <div className="my-8 flex justify-center">
        <AdverticaBanner />
      </div>

      <div className="mb-12">
        <h2 className="text-xl font-bold text-gray-800 mb-2 border-l-4 border-blue-500 pl-3">Standard Loans</h2>
        <p className="text-gray-500 text-sm mb-4">{content.standardNote}</p>
        
        {/* Advertica Responsive Banner (Top of Table) */}
        <AdverticaResponsiveBanner placement="repayment_standard_top" />

        <div className="overflow-x-auto">
          {/* ... table content ... */}
        </div>

        {/* Advertica Banner (Bottom of Table) */}
        <div className="mt-4 flex justify-center">
           <AdverticaBanner />
        </div>
      </div>

      {/* Mid-Page Responsive Impact */}
      <AdverticaResponsiveBanner placement="repayment_mid_impact" />

      <div className="mb-12">
        <h2 className="text-xl font-bold text-gray-800 mb-2 border-l-4 border-orange-500 pl-3">Fast-Track Loans</h2>
        <p className="text-gray-500 text-sm mb-4">{content.fastTrackNote}</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-100 uppercase text-gray-600 font-bold">
              <tr>
                <th className="px-6 py-3">Loan Amount</th>
                <th className="px-6 py-3">Repayment (+5%)</th>
                <th className="px-6 py-3">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {fastTrackLoans.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium">{formatNaira(row.principal)}</td>
                  <td className="px-6 py-3 text-grantify-green font-bold">{formatNaira(row.repayment)}</td>
                  <td className="px-6 py-3">{row.duration} Months</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advertica Responsive Banner (Post Fast-Track Table) */}
      <AdverticaResponsiveBanner placement="repayment_fast_track_bottom" />

      {/* Fast Track Application Box */}
      <div id="fast-track" className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-6 shadow-sm scroll-mt-8">
        <div className="flex items-start gap-4">
          <div className="bg-orange-500 text-white p-3 rounded-full hidden md:block">
            <Zap size={24} fill="currentColor" />
          </div>
          <div className="flex-grow">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Request Fast-Track Processing</h2>
            <p className="text-sm text-gray-700 mb-4">
              Need funds urgently? You can request a manual Fast-Track review. 
              <br/>
              <span className="font-bold text-red-600">Note: This service attracts a flat processing fee of NGN 20,000.</span>
            </p>

            {/* In-Form Advertica Banner */}
            <div className="mb-6 flex justify-center bg-white/50 p-2 rounded-lg backdrop-blur-sm">
               <AdverticaBanner />
            </div>

            <form onSubmit={handleFastTrackSubmit} className="grid md:grid-cols-2 gap-4">
               <input 
                 type="text" 
                 placeholder="Your Full Name" 
                 required
                 className={inputClass}
                 value={ftForm.name}
                 onChange={e => setFtForm({...ftForm, name: e.target.value})}
               />
               <input 
                 type="text" 
                 placeholder="Phone Number" 
                 required
                 className={inputClass}
                 value={ftForm.phone}
                 onChange={e => setFtForm({...ftForm, phone: e.target.value})}
               />
               <input 
                 type="email" 
                 placeholder="Email Address" 
                 required
                 className={inputClass}
                 value={ftForm.email}
                 onChange={e => setFtForm({...ftForm, email: e.target.value})}
               />
               <input 
                 type="number" 
                 placeholder="Amount (NGN)" 
                 required
                 className={inputClass}
                 value={ftForm.amount}
                 onChange={e => setFtForm({...ftForm, amount: e.target.value})}
               />
               <button type="submit" className="md:col-span-2 bg-orange-600 text-white font-bold py-2 rounded hover:bg-orange-700 flex items-center justify-center gap-2 shadow-lg">
                 <Send size={16} /> Send Fast-Track Request
               </button>
            </form>
            <p className="text-xs text-gray-500 mt-2">
              * Clicking send will open your email client to complete the request.
            </p>
          </div>
        </div>
      </div>


      {/* Advertica Banner Slot 2 */}
      <div className="mt-12 flex justify-center bg-gray-50 p-4 rounded-xl">
        <AdverticaBanner />
      </div>

    </div>
  );
};