import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ApiService } from '../services/storage';
import { AdSlot } from '../components/AdSlot';
import { AdverticaBanner } from '../components/AdverticaBanner';
import { AdverticaResponsiveBanner } from '../components/AdverticaResponsiveBanner';
import { TestimonialCard } from '../components/TestimonialCard';
import { LoanType, ApplicationStatus, LoanApplication, Testimonial, QualifiedPerson, AdConfig } from '../types';
import { Calculator, CheckCircle, AlertCircle, ArrowRight, Share2, Copy, Info, Loader2, MessageSquarePlus, Send, Zap, Landmark, ExternalLink } from 'lucide-react';
import { formatNaira, formatNairaCompact } from '../utils/currency';

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
  
  // Testimonial submission form state
  const [testimonialForm, setTestimonialForm] = useState({
    name: '',
    amount: '',
    content: '',
    imageUrl: ''
  });
  const [testimonialSubmitted, setTestimonialSubmitted] = useState(false);
  const [isSubmittingTestimonial, setIsSubmittingTestimonial] = useState(false);
  
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
        setError(''); // Clear any previous errors
      } catch (e) {
        console.error("Failed to load home data", e);
        setError('Failed to load data. Please check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter to only show approved testimonials (or those without status, which are legacy approved)
  const approvedTestimonials = allTestimonials.filter(t => !t.status || t.status === 'approved');
  const visibleTestimonials = approvedTestimonials.slice(0, testimonialLimit);

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

  const handleTestimonialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingTestimonial(true);
    
    // Generate a unique ID using timestamp + random string
    const uniqueId = `pending_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Use provided image URL if available, otherwise generate initials-based avatar
    const avatarUrl = testimonialForm.imageUrl.trim() 
      ? testimonialForm.imageUrl.trim()
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonialForm.name)}&background=006400&color=ffffff&size=150&bold=true`;
    
    // Generate random initial reaction counts
    const randomReactions = {
      likes: Math.floor(Math.random() * 150) + 20,
      loves: Math.floor(Math.random() * 80) + 10,
      claps: Math.floor(Math.random() * 40) + 5
    };
    
    const newTestimonial: Testimonial = {
      id: uniqueId,
      name: testimonialForm.name,
      // Use provided image URL or UI Avatars with brand green background for pending testimonials
      image: avatarUrl,
      amount: Number(testimonialForm.amount) || 0,
      content: testimonialForm.content,
      ...randomReactions,
      date: new Date().toISOString().split('T')[0],
      status: 'pending'
    };

    try {
      // Get current testimonials and add the new pending one
      const currentTestimonials = await ApiService.getTestimonials();
      await ApiService.saveTestimonials([...currentTestimonials, newTestimonial]);
      setTestimonialSubmitted(true);
      setTestimonialForm({ name: '', amount: '', content: '', imageUrl: '' });
    } catch (e) {
      console.error("Failed to submit testimonial", e);
    } finally {
      setIsSubmittingTestimonial(false);
    }
  };

  const copyReferralLink = () => {
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const link = `${baseUrl}#/?ref=${encodeURIComponent(referralData.code)}`;
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
    return formatNairaCompact(num);
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
      setError(`Amount must be between NGN 50,000 - NGN 500,000 (Standard) or NGN 1M - NGN 5M (Fast-Track).`);
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
          <span className="font-bold text-grantify-green"> {formatNaira(parseInt(formData.amount))}</span> has been received.
        </p>
        <div className="bg-green-50 p-4 rounded text-left mb-6 border border-green-100">
          <h3 className="font-bold text-grantify-green mb-2">Your Repayment Plan:</h3>
          <p>Total to repay: <span className="font-bold">{formatNaira(calculateRepayment(parseInt(formData.amount)))}</span></p>
          <p>Duration: <span className="font-bold">{loanType === LoanType.STANDARD ? '3 Months' : '6 Months'}</span></p>
          {loanType === LoanType.FAST_TRACK && (
             <p className="text-xs text-orange-600 mt-2 font-bold bg-orange-50 p-1 rounded border border-orange-100">
               <Info size={12} className="inline mr-1"/>
               NOTE: Fast-track loans attract a NGN 20,000 processing fee.
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

  if (error && !ads) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-center p-8">
        <AlertCircle className="w-16 h-16 text-red-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Connection Error</h2>
        <p className="text-gray-600 mb-6 max-w-md">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-grantify-green text-white px-6 py-2 rounded hover:bg-green-800"
        >
          Retry
        </button>
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={scrollToApply}
              className="bg-grantify-gold text-grantify-green font-bold py-3 px-8 rounded-full shadow hover:bg-yellow-400 transition transform hover:-translate-y-1 inline-block cursor-pointer"
            >
              Get Started Now
            </button>
            <Link 
              to="/repayment#fast-track"
              className="bg-orange-500 text-white font-bold py-3 px-8 rounded-full shadow hover:bg-orange-600 transition transform hover:-translate-y-1 inline-flex items-center gap-2"
            >
              <Zap size={18} fill="currentColor" /> Fast-Track Loan (NGN 1M - NGN 5M)
            </Link>
          </div>
          <p className="mt-4 text-sm text-green-200 opacity-80">
            <Zap size={14} className="inline mr-1" />
            Need larger capital quickly? Fast-Track loans offer NGN 1M - NGN 5M with priority processing.
          </p>
        </div>
      </section>

      {/* Responsive Banner (High Impact) */}
      <AdverticaResponsiveBanner placement="home_hero_bottom" />

      {/* Advertica Banner Slot 1 */}
      <div className="flex justify-center -my-4">
        <AdverticaBanner />
      </div>

      {/* Stats Section */}
      <section className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
         <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 border-r border-gray-100 last:border-0">
               <div className="text-2xl md:text-3xl font-bold text-grantify-green">50k+</div>
               <div className="text-xs text-gray-500 uppercase tracking-wider">Active Users</div>
            </div>
            <div className="text-center p-4 border-r border-gray-100 last:border-0">
               <div className="text-2xl md:text-3xl font-bold text-grantify-green">N1.2B+</div>
               <div className="text-xs text-gray-500 uppercase tracking-wider">Disbursed</div>
            </div>
            <div className="text-center p-4 border-r border-gray-100 last:border-0">
               <div className="text-2xl md:text-3xl font-bold text-grantify-green">98%</div>
               <div className="text-xs text-gray-500 uppercase tracking-wider">Satisfaction</div>
            </div>
            <div className="text-center p-4">
               <div className="text-2xl md:text-3xl font-bold text-grantify-green">24/7</div>
               <div className="text-xs text-gray-500 uppercase tracking-wider">Support</div>
            </div>
         </div>
      </section>

      {/* Advertica Banner Slot 2 */}
      <div className="flex justify-center">
        <AdverticaBanner />
      </div>
      <section id="apply" className="grid md:grid-cols-5 gap-8">
        
        <div className="md:col-span-3 space-y-6">
          
          {/* Advertica Responsive Banner (Pre-Form) */}
          <AdverticaResponsiveBanner placement="home_pre_form" />

          {/* Loan Application Form */}
          <div className="bg-white p-6 md:p-8 rounded-xl shadow-md border-t-4 border-grantify-green">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="text-grantify-green" />
              <h2 className="text-2xl font-bold font-heading text-gray-800">Loan Application</h2>
            </div>
            
            {/* Advertica Banner Inside Form Header */}
            <div className="mb-6 flex justify-center">
               <AdverticaBanner />
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
                  Loan Amount (NGN)
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
                        {formatNaira(calculateRepayment(parseInt(formData.amount) || 0))}
                      </span>
                    </div>
                    {loanType === LoanType.FAST_TRACK && (
                       <div className="mt-2 text-xs text-orange-700 bg-orange-100 p-2 rounded border border-orange-200">
                         <strong>Notice:</strong> A NGN 20,000 processing fee applies for Fast-Track loans.
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
               <strong>📋 Note:</strong> This list is updated regularly. Check back frequently in case you missed a notification – you might be next!
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
        {testimonialLimit < Math.min(approvedTestimonials.length, 10) && (
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

      {/* Share Your Story Form */}
      <section className="bg-white rounded-xl p-8 shadow-md border-t-4 border-grantify-gold">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <MessageSquarePlus className="text-grantify-gold" size={28} />
            <h2 className="text-2xl font-bold font-heading text-gray-800">Share Your Success Story</h2>
          </div>
          
          {testimonialSubmitted ? (
            <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Thank You!</h3>
              <p className="text-gray-600 mb-4">
                Your story has been submitted and is pending approval. Once approved by our team, it will appear in the Success Stories section.
              </p>
              <button 
                onClick={() => setTestimonialSubmitted(false)}
                className="text-grantify-green font-semibold hover:underline"
              >
                Submit Another Story
              </button>
            </div>
          ) : (
            <>
              <p className="text-gray-600 mb-6">
                Have you benefited from Grantify? Share your experience to inspire others! Your story will be reviewed by our team before being published.
              </p>
              
              <form onSubmit={handleTestimonialSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g., John Doe"
                      className={inputClass}
                      value={testimonialForm.name}
                      onChange={e => setTestimonialForm({...testimonialForm, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount Received (NGN) *</label>
                    <input 
                      type="number" 
                      placeholder="e.g., 200000"
                      className={inputClass}
                      value={testimonialForm.amount}
                      onChange={e => setTestimonialForm({...testimonialForm, amount: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Story *</label>
                  <textarea 
                    rows={4}
                    placeholder="Tell us how Grantify helped you..."
                    className={inputClass}
                    value={testimonialForm.content}
                    onChange={e => setTestimonialForm({...testimonialForm, content: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profile Photo URL <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input 
                    type="url" 
                    placeholder="https://example.com/your-photo.jpg"
                    className={inputClass}
                    value={testimonialForm.imageUrl}
                    onChange={e => setTestimonialForm({...testimonialForm, imageUrl: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave blank to use an auto-generated avatar based on your initials.</p>
                </div>
                
                <div className="text-xs text-gray-500 bg-yellow-50 p-3 rounded border border-yellow-200">
                  <Info size={14} className="inline mr-1 text-yellow-600" />
                  Your submission will be reviewed by our team. Once approved, your story will appear in our Success Stories section.
                </div>
                
                <button 
                  type="submit" 
                  disabled={isSubmittingTestimonial}
                  className="w-full bg-grantify-gold text-grantify-green font-bold py-3 rounded hover:bg-yellow-400 transition shadow-lg flex items-center justify-center gap-2"
                >
                  {isSubmittingTestimonial ? (
                    <>
                      <Loader2 className="animate-spin" size={18} /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={18} /> Submit Your Story
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      {/* Advertica Responsive Banner (Mid-Page) */}
      <AdverticaResponsiveBanner placement="home_mid" />

      {/* Loan Providers Awareness Section */}
      <section className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl p-8 text-white shadow-xl">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white/10 p-4 rounded-full">
              <Landmark size={40} className="text-blue-200" />
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-heading mb-4">
            Need Quick Cash? Explore CBN-Approved Lenders
          </h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Looking for alternative loan options? We've compiled a list of legitimate, CBN-approved loan providers in Nigeria. 
            Compare interest rates, loan amounts, and terms to make the best financial decision for your needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              to="/loan-providers"
              className="bg-white text-blue-900 font-bold py-3 px-8 rounded-full shadow hover:bg-blue-50 transition transform hover:-translate-y-1 inline-flex items-center gap-2"
            >
              <ExternalLink size={18} /> View Loan Providers
            </Link>
          </div>

          {/* Advertica Banner Slot 3 (Home Page Bottom) */}
          <div className="mt-8 flex justify-center bg-white/10 p-4 rounded-xl backdrop-blur-sm">
            <AdverticaBanner />
          </div>
          
          {/* Final Bottom Responsive Impact */}
          <div className="mt-4">
             <AdverticaResponsiveBanner placement="home_bottom_final" />
          </div>

          <p className="mt-6 text-xs text-blue-200 opacity-80">
            <Info size={12} className="inline mr-1" />
            Grantify does not offer loans directly. We help you find legitimate options for informational purposes.
          </p>
        </div>
      </section>

    </div>
  );
};