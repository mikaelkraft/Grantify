import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/storage';
import { AdSlot } from '../components/AdSlot';
import { TestimonialCard } from '../components/TestimonialCard';
import { LoanType, ApplicationStatus, LoanApplication, Testimonial, QualifiedPerson, AdConfig } from '../types';
import { Calculator, CheckCircle, AlertCircle, ArrowRight, Share2, Copy, Info, Loader2 } from 'lucide-react';

export const Home: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    country: 'Nigeria',
    amount: '',
    purpose: '',
    referralCode: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [loanType, setLoanType] = useState<LoanType>(LoanType.STANDARD);
  
  // Data State
  const [ads, setAds] = useState<AdConfig | null>(null);
  const [allTestimonials, setAllTestimonials] = useState<Testimonial[]>([]);
  const [qualifiedPersons, setQualifiedPersons] = useState<QualifiedPerson[]>([]);
  const [referralData] = useState(ApiService.getMyReferralData());
  const [testimonialLimit, setTestimonialLimit] = useState(3);
  
  // Initial Data Fetch
  useEffect(() => {
    const loadData = async () => {
      try {
        const [fetchedAds, fetchedTestimonials, fetchedQualified] = await Promise.all([
          ApiService.getAds(),
          ApiService.getTestimonials(),
          ApiService.getQualified()
        ]);
        setAds(fetchedAds);
        setAllTestimonials(fetchedTestimonials);
        setQualifiedPersons(fetchedQualified.slice(0, 10)); // Top 10
      } catch (e) {
        console.error("Failed to load home data", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const visibleTestimonials = allTestimonials.slice(0, testimonialLimit);

  const calculateRepayment = (amount: number) => {
    // 5% flat rate
    const interest = amount * 0.05;
    return amount + interest;
  };

  const getLoanTerms = (amt: number) => {
    if (amt >= 50000 && amt <= 500000) return LoanType.STANDARD;
    if (amt >= 1000000 && amt <= 5000000) return LoanType.FAST_TRACK;
    return null; // Invalid
  };

  const handleAmountChange = (val: string) => {
    const num = parseInt(val) || 0;
    const type = getLoanTerms(num);
    if (type) setLoanType(type);
    setFormData({ ...formData, amount: val });
  };

  const handleLoadMoreTestimonials = () => {
    setTestimonialLimit(prev => Math.min(prev + 3, 10));
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/?ref=${referralData.code}`;
    navigator.clipboard.writeText(link);
    alert('Referral link copied to clipboard!');
  };

  const scrollToApply = () => {
    const section = document.getElementById('apply');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const formatCompactNumber = (num: number) => {
    if (num >= 1000000) {
      return '₦' + (num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1) + 'M';
    }
    if (num >= 1000) {
      return '₦' + (num / 1000).toFixed(0) + 'k';
    }
    return '₦' + num.toLocaleString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const amount = parseInt(formData.amount);
    
    // Validation
    const phoneRegex = /^(0|(\+234))[0-9]{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('Please enter a valid Nigerian phone number (e.g., 08012345678).');
      return;
    }

    if (!amount || isNaN(amount)) {
      setError('Invalid amount.');
      return;
    }

    const type = getLoanTerms(amount);
    if (!type) {
      setError('Amount must be between ₦50,000 - ₦500,000 (Standard) or ₦1M - ₦5M (Fast-Track).');
      return;
    }

    const duration = type === LoanType.STANDARD ? 3 : 6;
    
    const newApp: LoanApplication = {
      id: Date.now().toString(),
      fullName: formData.fullName,
      phoneNumber: formData.phone,
      email: formData.email,
      country: formData.country,
      amount: amount,
      purpose: formData.purpose,
      type: type,
      repaymentAmount: calculateRepayment(amount),
      durationMonths: duration,
      status: ApplicationStatus.PENDING,
      dateApplied: new Date().toISOString().split('T')[0],
      referralCode: formData.referralCode
    };

    setIsSubmitting(true);
    try {
      await ApiService.addApplication(newApp);
      setSubmitted(true);
    } catch (e) {
      setError('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg text-center my-10 animate-in fade-in zoom-in duration-300">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Application Submitted!</h2>
        <p className="text-gray-600 mb-6">
          Thank you for applying to Grantify. Your application for 
          <span className="font-bold text-grantify-green"> ₦{parseInt(formData.amount).toLocaleString()}</span> has been received.
        </p>
        <div className="bg-green-50 p-4 rounded text-left mb-6 border border-green-100">
          <h3 className="font-bold text-grantify-green mb-2">Your Repayment Plan:</h3>
          <p>Total to repay: <span className="font-bold">₦{calculateRepayment(parseInt(formData.amount)).toLocaleString()}</span></p>
          <p>Duration: <span className="font-bold">{loanType === LoanType.STANDARD ? '3 Months' : '6 Months'}</span></p>
          {loanType === LoanType.FAST_TRACK && (
             <p className="text-xs text-orange-600 mt-2 font-bold bg-orange-50 p-1 rounded border border-orange-100">
               <Info size={12} className="inline mr-1"/>
               NOTE: Fast-track loans attract a ₦20,000 processing fee.
             </p>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-6 italic">
          <Info size={14} className="inline mr-1"/>
          Please note: If your application is selected, you will be required to provide your NIN for identity verification.
        </p>
        <button 
          onClick={() => { setSubmitted(false); setFormData({...formData, amount: ''}); }}
          className="bg-grantify-green text-white px-6 py-2 rounded hover:bg-green-800"
        >
          Submit Another Application
        </button>
      </div>
    );
  }

  // Dark Input Style Class
  const inputClass = "w-full p-2 border border-gray-600 rounded bg-gray-800 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-grantify-gold outline-none";

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-grantify-green">
        <Loader2 className="animate-spin w-12 h-12 mb-4" />
        <p>Loading Grantify...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      
      {/* Hero */}
      <section className="bg-grantify-green text-white rounded-2xl p-8 md:p-12 text-center shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-5xl font-bold font-heading mb-4 text-grantify-gold">
            Empowering Families & <br/>Small Businesses
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8 text-green-100">
            Transparent loans and grants designed for the Nigerian community. No hidden fees. Just growth.
          </p>
          <button 
            onClick={scrollToApply}
            className="bg-grantify-gold text-grantify-green font-bold py-3 px-8 rounded-full shadow hover:bg-yellow-400 transition transform hover:-translate-y-1 inline-block cursor-pointer"
          >
            Get Started Now
          </button>
        </div>
      </section>

      {/* Loan Form & Sidebar */}
      <section id="apply" className="grid md:grid-cols-5 gap-8">
        
        <div className="md:col-span-3 space-y-6">
          
          {/* Loan Application Form */}
          <div className="bg-white p-6 md:p-8 rounded-xl shadow-md border-t-4 border-grantify-green">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="text-grantify-green" />
              <h2 className="text-2xl font-bold font-heading text-gray-800">Loan Application</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select 
                    className={inputClass}
                    value={formData.country}
                    onChange={e => setFormData({...formData, country: e.target.value})}
                  >
                    <option value="Nigeria">Nigeria</option>
                    <option value="Ghana" disabled>Ghana (Coming Soon)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    placeholder="080..." 
                    className={inputClass}
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  className={inputClass}
                  value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address <span className="text-gray-400 font-normal">(Optional)</span></label>
                <input 
                  type="email" 
                  placeholder="name@example.com"
                  className={inputClass}
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loan Amount (₦)
                  <span className="text-xs text-gray-500 ml-2 font-normal">(Min 50k, Max 5M)</span>
                </label>
                <input 
                  type="number" 
                  className={inputClass}
                  value={formData.amount}
                  onChange={e => handleAmountChange(e.target.value)}
                  required
                />
              </div>

              {/* Live Repayment Preview */}
              {formData.amount && (
                <div className="bg-gray-50 p-3 rounded text-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-600">Type:</span>
                      <span className={`font-bold ${loanType === LoanType.FAST_TRACK ? 'text-orange-600' : 'text-blue-600'}`}>
                        {loanType}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Repayment after {loanType === LoanType.STANDARD ? '3' : '6'} months:</span>
                      <span className="font-bold text-grantify-green">
                        ₦{calculateRepayment(parseInt(formData.amount) || 0).toLocaleString()}
                      </span>
                    </div>
                    {loanType === LoanType.FAST_TRACK && (
                       <div className="mt-2 text-xs text-orange-700 bg-orange-100 p-2 rounded border border-orange-200">
                         <strong>Notice:</strong> A ₦20,000 processing fee applies for Fast-Track loans.
                       </div>
                    )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose of Loan</label>
                <textarea 
                  rows={3}
                  className={inputClass}
                  value={formData.purpose}
                  onChange={e => setFormData({...formData, purpose: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referral Code <span className="text-gray-400 font-normal">(Optional)</span></label>
                <input 
                  type="text"
                  placeholder="e.g. GRANT-XY12"
                  className={inputClass}
                  value={formData.referralCode}
                  onChange={e => setFormData({...formData, referralCode: e.target.value})}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 mb-2">
                 <span className="font-bold text-gray-700">Notice:</span> If selected, you will be required to provide your National Identification Number (NIN) for verification purposes.
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-grantify-green text-white font-bold py-3 rounded hover:bg-green-800 transition shadow-lg flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Processing...
                  </>
                ) : (
                  "Submit Application"
                )}
              </button>
            </form>
          </div>

          {/* Referral Banner */}
          <div className="bg-green-900 rounded-xl p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-center gap-4 border border-green-800">
             <div>
               <h3 className="font-bold text-lg flex items-center gap-2"><Share2 size={20} className="text-grantify-gold"/> Refer & Earn Bonus Points</h3>
               <p className="text-xs text-green-200">Earn bonus points for every successful referral to increase your loan approval chances.</p>
             </div>
             <div className="flex items-center gap-2 bg-black/20 p-2 rounded border border-white/10">
               <code className="font-mono text-grantify-gold font-bold tracking-wider">{referralData.code}</code>
               <button onClick={copyReferralLink} className="p-1 hover:text-yellow-300 transition" title="Copy Link">
                 <Copy size={16} />
               </button>
             </div>
             <div className="text-center">
                <span className="block text-2xl font-bold text-grantify-gold">{referralData.points}</span>
                <span className="text-[10px] uppercase tracking-wide opacity-75">Points</span>
             </div>
          </div>

        </div>

        {/* Sidebar / Info */}
        <div className="md:col-span-2 space-y-6">
           {/* Qualified Persons List */}
           <div className="bg-white rounded-xl shadow p-6">
             <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Recently Selected</h3>
             <ul className="space-y-3">
               {qualifiedPersons.map(p => (
                 <li key={p.id} className="flex justify-between items-start text-sm">
                   <div>
                     <span className="font-semibold block">{p.name}</span>
                     <span className="text-xs text-green-600">{p.status}</span>
                   </div>
                   <span className="text-gray-500 font-mono">{formatCompactNumber(p.amount)}</span>
                 </li>
               ))}
             </ul>
             <div className="mt-4 bg-yellow-50 p-3 text-xs text-yellow-800 rounded border border-yellow-200">
               These individuals have been selected and will be contacted shortly.
             </div>
           </div>

           {/* In-body Ad */}
           {ads && <AdSlot htmlContent={ads.body} />}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-green-50 rounded-xl p-8">
        <h2 className="text-2xl font-bold font-heading text-center text-grantify-green mb-8">Success Stories</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {visibleTestimonials.map(t => (
            <TestimonialCard key={t.id} data={t} />
          ))}
        </div>
        
        {/* Load More Button */}
        {testimonialLimit < Math.min(allTestimonials.length, 10) && (
           <div className="text-center mt-6">
             <button 
               onClick={handleLoadMoreTestimonials}
               className="text-grantify-green font-semibold flex items-center gap-2 mx-auto hover:bg-green-100 px-4 py-2 rounded transition"
             >
               View More Stories <ArrowRight size={16} />
             </button>
           </div>
        )}
      </section>

    </div>
  );
};