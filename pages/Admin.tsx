import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/storage';
import { AdminUser, LoanApplication, Testimonial, QualifiedPerson, AdConfig, UserRole, RepaymentContent, LoanProvider } from '../types';
import { LogOut, Download, Trash2, Plus, UserPlus, Shield, Loader2, Save, Zap } from 'lucide-react';
import { formatNaira } from '../utils/currency';

// Default fallback avatar (green circle with question mark) for broken/missing images
const DEFAULT_AVATAR_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23006400"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="white"%3E%3F%3C/text%3E%3C/svg%3E';

export const Admin: React.FC = () => {
  // Admin session persisted via localStorage
  const [user, setUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('admin_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to restore session', e);
      return null;
    }
  });
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [activeTab, setActiveTab] = useState('applications');
  const [isLoading, setIsLoading] = useState(false);
  
  // Data State
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [qualified, setQualified] = useState<QualifiedPerson[]>([]);
  const [ads, setAds] = useState<AdConfig | null>(null);
  const [repayment, setRepayment] = useState<RepaymentContent | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loanProviders, setLoanProviders] = useState<LoanProvider[]>([]);

  // New Admin Form
  const [newAdmin, setNewAdmin] = useState({ name: '', username: '', password: '', role: UserRole.FLOOR_ADMIN });

  // Track unsaved changes
  const [hasUnsavedTestimonials, setHasUnsavedTestimonials] = useState(false);
  const [hasUnsavedQualified, setHasUnsavedQualified] = useState(false);
  const [hasUnsavedAds, setHasUnsavedAds] = useState(false);
  const [hasUnsavedRepayment, setHasUnsavedRepayment] = useState(false);
  const [hasUnsavedProviders, setHasUnsavedProviders] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) refreshData();
  }, [user]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [apps, tests, qual, adConfig, repay, adminList, providers] = await Promise.all([
        ApiService.getApplications(),
        ApiService.getTestimonials(),
        ApiService.getQualified(),
        ApiService.getAds(),
        ApiService.getRepaymentContent(),
        ApiService.getAdmins(),
        ApiService.getLoanProviders()
      ]);
      setApplications(apps);
      setTestimonials(tests);
      setQualified(qual);
      setAds(adConfig);
      setRepayment(repay);
      setAdmins(adminList);
      setLoanProviders(providers);
    } catch (e) {
      console.error("Failed to load admin data", e);
      const message =
        e instanceof Error && e.message
          ? e.message
          : 'An unexpected error occurred while loading admin data.';
      const retry = window.confirm(
        `Failed to load admin data.\n\nDetails: ${message}\n\nThis may indicate a network or database connection issue.\n\nWould you like to try loading the data again?`
      );
      if (retry) {
        // Reload the page to retry loading data
        window.location.reload();
      } else {
        window.alert(
          'Admin data could not be loaded. Some information may be incomplete until the connection is restored.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const admin = await ApiService.login(loginForm.username, loginForm.password);
      if (admin) {
        setUser(admin);
        setUser(admin);
        localStorage.setItem('admin_session', JSON.stringify(admin));
      } else {
        alert('Invalid credentials');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setUser(null);
    localStorage.removeItem('admin_session');
  };

  const exportApplicationsCSV = () => {
    const headers = ["ID", "Name", "Phone", "Email", "Amount", "Status", "Date"];
    const rows = applications.map(app => [app.id, app.fullName, app.phoneNumber, app.email || '', app.amount, app.status, app.dateApplied]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "grantify_applications.csv");
    document.body.appendChild(link);
    link.click();
  };

  const handleAdChange = (key: keyof AdConfig, val: string) => {
    if (!ads) return;
    const newAds = { ...ads, [key]: val };
    setAds(newAds);
    setHasUnsavedAds(true);
  };

  const handleSaveAds = async () => {
    if (!ads) return;
    setIsSaving(true);
    try {
      await ApiService.saveAds(ads);
      setHasUnsavedAds(false);
      alert('Ad settings saved successfully!');
    } catch (e) {
      console.error('Failed to save ads', e);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Loan Providers Logic ---
  const handleUpdateProviderLocal = (id: number, field: keyof LoanProvider, value: any) => {
    const newData = loanProviders.map(p => p.id === id ? { ...p, [field]: value } : p);
    setLoanProviders(newData);
    setHasUnsavedProviders(true);
  };

  const handleAddProvider = () => {
    const newProvider: LoanProvider = {
      id: Date.now(), // Temporary ID for client-side tracking
      name: 'New Provider',
      description: 'Describe the provider...',
      loanRange: 'NGN 1,000 - NGN 1,000,000',
      interestRange: '5% - 15% monthly',
      tenure: '1 - 6 months',
      website: 'https://...',
    };
    setLoanProviders([...loanProviders, newProvider]);
    setHasUnsavedProviders(true);
  };

  const handleDeleteProviderLocal = (id: number) => {
    if (!window.confirm("Are you sure you want to delete this provider?")) return;
    setLoanProviders(loanProviders.filter(p => p.id !== id));
    setHasUnsavedProviders(true);
  };

  const handleSaveProviders = async () => {
    setIsSaving(true);
    try {
      await ApiService.saveLoanProviders(loanProviders);
      setHasUnsavedProviders(false);
      alert('Providers saved successfully!');
      refreshData(); // Refresh to get proper IDs from DB
    } catch (e) {
      console.error('Failed to save providers', e);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Testimonial Logic ---
  const handleUpdateTestimonialLocal = (id: string, field: keyof Testimonial, value: any) => {
    const target = testimonials.find(t => t.id === id);
    if (!target) return;
    
    let updated = { ...target, [field]: value };
    
    // Auto-update avatar URL when name changes (if using UI Avatars placeholder)
    if (field === 'name' && target.image.includes('ui-avatars.com')) {
      updated.image = `https://ui-avatars.com/api/?name=${encodeURIComponent(value)}&background=006400&color=ffffff&size=150&bold=true`;
    }
    
    const newData = testimonials.map(t => t.id === id ? updated : t);
    
    setTestimonials(newData);
    setHasUnsavedTestimonials(true);
  };

  const handleSaveTestimonials = async () => {
    setIsSaving(true);
    try {
      await ApiService.saveTestimonials(testimonials);
      setHasUnsavedTestimonials(false);
      alert('Testimonials saved successfully!');
    } catch (e) {
      console.error('Failed to save testimonials', e);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTestimonial = async (id: string, field: keyof Testimonial, value: any) => {
    const target = testimonials.find(t => t.id === id);
    if (!target) return;
    
    const updated = { ...target, [field]: value };
    const newData = testimonials.map(t => t.id === id ? updated : t);
    
    setTestimonials(newData);
    await ApiService.updateTestimonial(updated);
  };

  const handleDeleteTestimonialLocal = (id: string) => {
    const confirm = window.confirm("Are you sure you want to delete this testimonial?");
    if (!confirm) return;
    
    const newData = testimonials.filter(t => t.id !== id);
    setTestimonials(newData);
    setHasUnsavedTestimonials(true);
  };

  const handleApproveTestimonialLocal = (id: string) => {
    const newData = testimonials.map(t => t.id === id ? { ...t, status: 'approved' as const } : t);
    setTestimonials(newData);
    setHasUnsavedTestimonials(true);
  };

  const handleDeleteTestimonial = async (id: string) => {
    const confirm = window.confirm("Are you sure you want to delete this testimonial?");
    if (!confirm) return;
    
    const newData = testimonials.filter(t => t.id !== id);
    setTestimonials(newData);
    await ApiService.saveTestimonials(newData);
  };
  
  // Helper to generate random reaction counts for new testimonials
  const generateRandomReactions = () => ({
    likes: Math.floor(Math.random() * 150) + 20,
    loves: Math.floor(Math.random() * 80) + 10,
    claps: Math.floor(Math.random() * 40) + 5
  });
  
  const handleAddTestimonialLocal = () => {
    const reactions = generateRandomReactions();
    const newT: Testimonial = {
      id: Date.now().toString(),
      name: 'New Testimonial',
      content: 'Enter content here...',
      amount: 100000,
      date: new Date().toISOString().split('T')[0],
      // Use initials-based avatar with brand green background
      image: 'https://ui-avatars.com/api/?name=New+Testimonial&background=006400&color=ffffff&size=150&bold=true',
      ...reactions
    };
    const newData = [newT, ...testimonials];
    setTestimonials(newData);
    setHasUnsavedTestimonials(true);
  };

  const handleAddTestimonial = async () => {
    const reactions = generateRandomReactions();
    const newT: Testimonial = {
      id: Date.now().toString(),
      name: 'New Testimonial',
      content: 'Enter content here...',
      amount: 100000,
      date: new Date().toISOString().split('T')[0],
      // Use initials-based avatar with brand green background
      image: 'https://ui-avatars.com/api/?name=New+Testimonial&background=006400&color=ffffff&size=150&bold=true',
      ...reactions
    };
    const newData = [newT, ...testimonials];
    setTestimonials(newData);
    await ApiService.saveTestimonials(newData);
  };

  // --- Qualified Person Logic ---
  const handleAddQualified = () => {
    const newPerson: QualifiedPerson = { 
        id: Date.now().toString(), 
        name: 'New Person', 
        amount: 0, 
        status: 'Pending', 
        notes: '' 
    };
    const newData = [newPerson, ...qualified];
    setQualified(newData);
    setHasUnsavedQualified(true);
  };

  const handleUpdateQualifiedLocal = (id: string, field: keyof QualifiedPerson, value: any) => {
    const newData = qualified.map(q => q.id === id ? { ...q, [field]: value } : q);
    setQualified(newData);
    setHasUnsavedQualified(true);
  };

  const handleDeleteQualifiedLocal = (id: string) => {
    const confirm = window.confirm("Delete this person?");
    if(confirm) {
        const n = qualified.filter(x => x.id !== id);
        setQualified(n);
        setHasUnsavedQualified(true);
    }
  };

  const handleSaveQualified = async () => {
    setIsSaving(true);
    try {
      await ApiService.saveQualified(qualified);
      setHasUnsavedQualified(false);
      alert('Qualified persons saved successfully!');
    } catch (e) {
      console.error('Failed to save qualified persons', e);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateQualified = async (id: string, field: keyof QualifiedPerson, value: any) => {
    const newData = qualified.map(q => q.id === id ? { ...q, [field]: value } : q);
    setQualified(newData);
    await ApiService.saveQualified(newData);
  };

  // --- Admin Management Logic ---
  const handleAddAdmin = async () => {
    if (!newAdmin.username || !newAdmin.password || !newAdmin.name) {
      alert("Please fill all fields");
      return;
    }
    const adminObj: AdminUser = {
      id: Date.now().toString(),
      name: newAdmin.name,
      username: newAdmin.username,
      passwordHash: newAdmin.password, // In prod, hash this!
      role: newAdmin.role
    };
    const newAdmins = [...admins, adminObj];
    setAdmins(newAdmins);
    await ApiService.saveAdmins(newAdmins);
    setNewAdmin({ name: '', username: '', password: '', role: UserRole.FLOOR_ADMIN });
  };

  const handleDeleteAdmin = async (id: string) => {
    if (id === user?.id) {
      alert("You cannot delete yourself.");
      return;
    }
    const confirm = window.confirm("Are you sure you want to remove this admin?");
    if (confirm) {
      const newAdmins = admins.filter(a => a.id !== id);
      setAdmins(newAdmins);
      await ApiService.saveAdmins(newAdmins);
    }
  };



  const handleRepaymentUpdateLocal = (newContent: RepaymentContent) => {
    setRepayment(newContent);
    setHasUnsavedRepayment(true);
  };

  const handleSaveRepayment = async () => {
    if (!repayment) return;
    setIsSaving(true);
    try {
      await ApiService.saveRepaymentContent(repayment);
      setHasUnsavedRepayment(false);
      alert('Repayment content saved successfully!');
    } catch (e) {
      console.error('Failed to save repayment content', e);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRepaymentUpdate = async (newContent: RepaymentContent) => {
    setRepayment(newContent);
    await ApiService.saveRepaymentContent(newContent);
  };

  // Styles
  const inputClass = "w-full p-2 border border-gray-600 rounded bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-grantify-gold outline-none";
  const inputClassSmall = "border border-gray-600 rounded bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-grantify-gold outline-none p-1";

  // Login Screen
  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded shadow-lg border-t-4 border-grantify-green animate-in fade-in slide-in-from-bottom-4">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Admin Portal</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="text" 
            placeholder="Username" 
            className={inputClass}
            value={loginForm.username}
            onChange={e => setLoginForm({...loginForm, username: e.target.value})}
          />
          <input 
            type="password" 
            placeholder="Password" 
            className={inputClass}
            value={loginForm.password}
            onChange={e => setLoginForm({...loginForm, password: e.target.value})}
          />
          <button 
            disabled={isLoggingIn}
            className="w-full bg-grantify-green text-white font-bold py-2 rounded hover:bg-green-800 flex justify-center items-center gap-2"
          >
            {isLoggingIn ? <Loader2 className="animate-spin" size={20} /> : "Login"}
          </button>
        </form>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="bg-white min-h-[600px] rounded shadow-lg overflow-hidden flex flex-col">
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Admin Dashboard</h2>
          <span className="text-xs text-gray-400">Logged in as: {user.name} ({user.role})</span>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 hover:text-red-400">
          <LogOut size={18} /> Logout
        </button>
      </div>

      <div className="flex flex-col md:flex-row h-full flex-grow">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 bg-gray-100 p-4 space-y-2 border-r">
           {[
             {id: 'applications', label: 'Applications'},
             {id: 'qualified', label: 'Qualified Persons'},
             {id: 'testimonials', label: 'Testimonials'},
             {id: 'ads', label: 'Ad Management'},
             {id: 'providers', label: 'Loan Providers'},
             {id: 'content', label: 'Page Content'}
           ].map(tab => (
             <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-2 rounded ${activeTab === tab.id ? 'bg-grantify-green text-white' : 'hover:bg-gray-200'}`}
             >
               {tab.label}
             </button>
           ))}

           {/* Super Admin Only Tab */}
           {user.role === UserRole.SUPER_ADMIN && (
             <button
               onClick={() => setActiveTab('admins')}
               className={`w-full text-left px-4 py-2 rounded mt-4 border-t border-gray-300 pt-4 flex items-center gap-2 ${activeTab === 'admins' ? 'bg-grantify-green text-white' : 'hover:bg-gray-200'}`}
             >
               <Shield size={16}/> Manage Admins
             </button>
           )}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto bg-white min-h-[500px]">
          {isLoading && (
             <div className="flex items-center justify-center h-full text-gray-500">
                <Loader2 className="animate-spin mr-2" /> Loading data...
             </div>
          )}

          {!isLoading && (
            <>
              {/* Applications Tab */}
              {activeTab === 'applications' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Loan Applications ({applications.length})</h3>
                    <button onClick={exportApplicationsCSV} className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                      <Download size={16} /> Export CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-2 text-left">Name</th>
                          <th className="p-2 text-left">Amount</th>
                          <th className="p-2 text-left">Phone</th>
                          <th className="p-2 text-left">Email</th>
                          <th className="p-2 text-left">Type</th>
                          <th className="p-2 text-left">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {applications.map(app => (
                          <tr key={app.id}>
                            <td className="p-2">{app.fullName}</td>
                            <td className="p-2">{formatNaira(app.amount)}</td>
                            <td className="p-2">{app.phoneNumber}</td>
                            <td className="p-2">{app.email || '-'}</td>
                            <td className="p-2">{app.type}</td>
                            <td className="p-2 text-gray-500">{app.dateApplied}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Qualified Persons Tab */}
              {activeTab === 'qualified' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Qualified List</h3>
                    <div className="flex gap-2">
                      <button onClick={handleAddQualified} className="flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                        <Plus size={16} /> Add New
                      </button>
                      <button 
                        onClick={handleSaveQualified} 
                        disabled={!hasUnsavedQualified || isSaving}
                        className={`flex items-center gap-2 px-3 py-1 rounded text-sm ${hasUnsavedQualified ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                      >
                        <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                  {hasUnsavedQualified && (
                    <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                      You have unsaved changes. Click "Save Changes" to sync with the database.
                    </div>
                  )}
                  <div className="space-y-2">
                    {qualified.map(q => (
                      <div key={q.id} className="flex flex-col md:flex-row gap-2 border p-2 rounded items-center bg-gray-50">
                          <input 
                            className={`${inputClassSmall} flex-grow`} 
                            value={q.name} 
                            onChange={(e) => handleUpdateQualifiedLocal(q.id, 'name', e.target.value)} 
                            placeholder="Name"
                          />
                          <input 
                            className={`${inputClassSmall} w-32`} 
                            type="number"
                            value={q.amount} 
                            onChange={(e) => handleUpdateQualifiedLocal(q.id, 'amount', parseInt(e.target.value))} 
                            placeholder="Amount"
                          />
                          <select 
                            className={inputClassSmall}
                            value={q.status}
                            onChange={(e) => handleUpdateQualifiedLocal(q.id, 'status', e.target.value)}
                            aria-label="Application Status"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Disbursed">Disbursed</option>
                          </select>
                          <input 
                            className={`${inputClassSmall} flex-grow`} 
                            value={q.notes} 
                            onChange={(e) => handleUpdateQualifiedLocal(q.id, 'notes', e.target.value)} 
                            placeholder="Public Note (Optional)"
                          />
                          <button onClick={() => handleDeleteQualifiedLocal(q.id)} className="text-red-500 p-2 hover:bg-red-100 rounded" title="Delete Person"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Testimonials Tab */}
              {activeTab === 'testimonials' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Manage Testimonials</h3>
                    <div className="flex gap-2">
                      <button onClick={handleAddTestimonialLocal} className="flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                        <Plus size={16} /> Add New
                      </button>
                      <button 
                        onClick={handleSaveTestimonials} 
                        disabled={!hasUnsavedTestimonials || isSaving}
                        className={`flex items-center gap-2 px-3 py-1 rounded text-sm ${hasUnsavedTestimonials ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                      >
                        <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                  {hasUnsavedTestimonials && (
                    <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                      You have unsaved changes. Click "Save Changes" to sync with the database.
                    </div>
                  )}
                  
                  {/* Pending Testimonials Section */}
                  {testimonials.filter(t => t.status === 'pending').length > 0 && (
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
                        <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                          {testimonials.filter(t => t.status === 'pending').length}
                        </span>
                        Pending User Submissions
                      </h4>
                      <div className="space-y-3">
                        {testimonials.filter(t => t.status === 'pending').map(t => (
                          <div key={t.id} className="bg-white p-3 rounded border border-yellow-300 flex flex-col md:flex-row md:items-center gap-3">
                            <div className="flex-grow">
                              <div className="font-bold text-sm">{t.name}</div>
                              <div className="text-xs text-gray-500">{formatNaira(t.amount)} • {t.date}</div>
                              <p className="text-sm text-gray-700 mt-1 line-clamp-2">{t.content}</p>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button 
                                onClick={() => handleApproveTestimonialLocal(t.id)}
                                className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleDeleteTestimonialLocal(t.id)}
                                className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid gap-6">
                    {testimonials.filter(t => !t.status || t.status === 'approved').map(t => (
                      <div key={t.id} className="border border-gray-300 p-4 rounded bg-gray-50 flex flex-col gap-3">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 block mb-1">Name</label>
                            <input 
                              className={inputClassSmall + " w-full"}
                              value={t.name}
                              onChange={(e) => handleUpdateTestimonialLocal(t.id, 'name', e.target.value)}
                              placeholder="Guest Name"
                              aria-label="Guest Name"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 block mb-1">Amount Received</label>
                            <input 
                              type="number"
                              className={inputClassSmall + " w-full"}
                              value={t.amount}
                              onChange={(e) => handleUpdateTestimonialLocal(t.id, 'amount', parseInt(e.target.value))}
                              placeholder="Amount Received"
                              aria-label="Amount Received"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 block mb-1">Date</label>
                            <input 
                              type="date"
                              className={inputClassSmall + " w-full"}
                              value={t.date}
                              onChange={(e) => handleUpdateTestimonialLocal(t.id, 'date', e.target.value)}
                              placeholder="Date"
                              aria-label="Date of Testimonial"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Testimonial Content</label>
                          <textarea
                            rows={2}
                            className={inputClassSmall + " w-full"}
                            value={t.content}
                            onChange={(e) => handleUpdateTestimonialLocal(t.id, 'content', e.target.value)}
                            placeholder="Testimonial Content"
                            aria-label="Testimonial Content"
                          />
                        </div>

                        <div className="flex gap-2 items-end">
                          <div className="flex-shrink-0">
                            <label className="text-xs text-gray-500 block mb-1">Avatar Preview</label>
                            <img 
                              src={t.image} 
                              alt={t.name}
                              className="w-12 h-12 rounded-full object-cover border border-gray-300"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = DEFAULT_AVATAR_FALLBACK;
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 block mb-1">Avatar Image URL</label>
                            <input 
                              type="url"
                              placeholder="https://example.com/photo.jpg"
                              className={inputClassSmall + " w-full"}
                              value={t.image}
                              onChange={(e) => handleUpdateTestimonialLocal(t.id, 'image', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                          <span className="text-xs text-gray-400">ID: {t.id} • Stats: {t.likes} likes, {t.loves} loves</span>
                          <button onClick={() => handleDeleteTestimonialLocal(t.id)} className="text-red-500 hover:bg-red-100 p-2 rounded flex items-center gap-1 text-sm">
                              <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ads Tab */}
              {activeTab === 'ads' && ads && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Advertisement Slots</h3>
                    <button 
                      onClick={handleSaveAds} 
                      disabled={!hasUnsavedAds || isSaving}
                      className={`flex items-center gap-2 px-3 py-1 rounded text-sm ${hasUnsavedAds ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    >
                      <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                  {hasUnsavedAds && (
                    <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                      You have unsaved changes. Click "Save Changes" to sync with the database.
                    </div>
                  )}
                  <div className="space-y-4">
                    {/* Ad Slots Group */}
                    <div className="space-y-4">
                      {['header', 'body', 'sidebar', 'footer', 'head'].map((key) => (
                        <div key={key}>
                          <label className="block text-sm font-bold uppercase text-gray-600 mb-1">{key} Code</label>
                          <textarea 
                            className="w-full border border-gray-600 p-2 rounded font-mono text-xs h-24 bg-gray-800 text-white focus:ring-2 focus:ring-grantify-gold outline-none"
                            value={ads[key as keyof AdConfig]}
                            onChange={(e) => handleAdChange(key as keyof AdConfig, e.target.value)}
                            placeholder={`Paste ${key} ad code here...`}
                          />
                        </div>
                      ))}
                    </div>

                    <hr className="my-8 border-gray-200" />
                    
                    {/* Promotional Buttons Group */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-6">
                      <h4 className="font-bold text-gray-700 flex items-center gap-2">
                        <Zap size={18} className="text-orange-500" /> Floating Promotional Buttons
                      </h4>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Promo 1 */}
                        <div className="space-y-3">
                          <label className="block text-xs font-bold uppercase text-orange-600">Primary Button (Left)</label>
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase">Button Label</label>
                            <input 
                              type="text"
                              className={inputClass}
                              value={ads.promo1Text}
                              onChange={(e) => handleAdChange('promo1Text', e.target.value)}
                              placeholder="e.g., Claim NGN 50k"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase">Destination URL</label>
                            <input 
                              type="text"
                              className={inputClass}
                              value={ads.promo1Link}
                              onChange={(e) => handleAdChange('promo1Link', e.target.value)}
                              placeholder="https://..."
                            />
                          </div>
                        </div>

                        {/* Promo 2 */}
                        <div className="space-y-3">
                          <label className="block text-xs font-bold uppercase text-blue-600">Secondary Button (Right)</label>
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase">Button Label</label>
                            <input 
                              type="text"
                              className={inputClass}
                              value={ads.promo2Text}
                              onChange={(e) => handleAdChange('promo2Text', e.target.value)}
                              placeholder="e.g., Fast-Track Now"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase">Destination URL</label>
                            <input 
                              type="text"
                              className={inputClass}
                              value={ads.promo2Link}
                              onChange={(e) => handleAdChange('promo2Link', e.target.value)}
                              placeholder="https://..."
                            />
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        Leave the Link field empty to hide the button. Text changes are applied instantly after saving.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Content Tab */}
              {activeTab === 'content' && repayment && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Repayment Page Content</h3>
                    <button 
                      onClick={handleSaveRepayment} 
                      disabled={!hasUnsavedRepayment || isSaving}
                      className={`flex items-center gap-2 px-3 py-1 rounded text-sm ${hasUnsavedRepayment ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    >
                      <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                  {hasUnsavedRepayment && (
                    <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                      You have unsaved changes. Click "Save Changes" to sync with the database.
                    </div>
                  )}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium">Intro Text</label>
                      <textarea 
                        className={inputClass}
                        value={repayment.introText}
                        onChange={(e) => handleRepaymentUpdateLocal({...repayment, introText: e.target.value})}
                        placeholder="Introductory Text"
                        aria-label="Introductory Text"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Standard Loan Note</label>
                      <input 
                        className={inputClass}
                        value={repayment.standardNote}
                        onChange={(e) => handleRepaymentUpdateLocal({...repayment, standardNote: e.target.value})}
                        placeholder="Standard Loan Note"
                        aria-label="Standard Loan Note"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Fast-Track Loan Note</label>
                      <input 
                        className={inputClass}
                        value={repayment.fastTrackNote}
                        onChange={(e) => handleRepaymentUpdateLocal({...repayment, fastTrackNote: e.target.value})}
                        placeholder="Fast-Track Loan Note"
                        aria-label="Fast-Track Loan Note"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Providers Tab */}
              {activeTab === 'providers' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Loan Providers ({loanProviders.length})</h3>
                    <div className="flex gap-2">
                      <button onClick={handleAddProvider} className="flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                        <Plus size={16} /> Add New Provider
                      </button>
                      <button 
                        onClick={handleSaveProviders} 
                        disabled={!hasUnsavedProviders || isSaving}
                        className={`flex items-center gap-2 px-3 py-1 rounded text-sm ${hasUnsavedProviders ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                      >
                        <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                  {hasUnsavedProviders && (
                    <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                      You have unsaved changes. Click "Save Changes" to sync with the database.
                    </div>
                  )}
                  <div className="space-y-6">
                    {loanProviders.map((p) => (
                      <div key={p.id || 'new'} className="border p-4 rounded bg-gray-50 space-y-3">
                        <div className="flex justify-between items-start">
                          <input 
                            className="text-lg font-bold bg-transparent border-none focus:ring-0 p-0 w-full"
                            value={p.name}
                            onChange={(e) => handleUpdateProviderLocal(p.id!, 'name', e.target.value)}
                            placeholder="Provider Name"
                            aria-label="Provider Name"
                          />
                          <button 
                            onClick={() => handleDeleteProviderLocal(p.id!)} 
                            className="text-red-500 hover:bg-red-100 p-1 rounded"
                            title="Delete Provider"
                            aria-label="Delete Provider"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase block mb-1">Description</label>
                            <textarea 
                              className={inputClassSmall + " w-full h-20"}
                              value={p.description}
                              onChange={(e) => handleUpdateProviderLocal(p.id!, 'description', e.target.value)}
                              placeholder="Describe the provider..."
                              aria-label="Provider Description"
                            />
                          </div>
                          <div className="space-y-2">
                            <div>
                              <label className="text-[10px] text-gray-500 uppercase block mb-1">Loan Range</label>
                              <input 
                                className={inputClassSmall + " w-full"}
                                value={p.loanRange}
                                onChange={(e) => handleUpdateProviderLocal(p.id!, 'loanRange', e.target.value)}
                                placeholder="NGN 1,000 - NGN 500,000"
                                aria-label="Loan Range"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 uppercase block mb-1">Interest Range</label>
                              <input 
                                className={inputClassSmall + " w-full"}
                                value={p.interestRange}
                                onChange={(e) => handleUpdateProviderLocal(p.id!, 'interestRange', e.target.value)}
                                placeholder="5% - 15% monthly"
                                aria-label="Interest Range"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase block mb-1">Tenure</label>
                            <input 
                              className={inputClassSmall + " w-full"}
                              value={p.tenure}
                              onChange={(e) => handleUpdateProviderLocal(p.id!, 'tenure', e.target.value)}
                              placeholder="1 - 6 months"
                              aria-label="Tenure"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase block mb-1">Website / Referral Link</label>
                            <input 
                              className={inputClassSmall + " w-full"}
                              value={p.website}
                              onChange={(e) => handleUpdateProviderLocal(p.id!, 'website', e.target.value)}
                              placeholder="https://..."
                              aria-label="Website Link"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Management Tab (Super Admin Only) */}
              {activeTab === 'admins' && user.role === UserRole.SUPER_ADMIN && (
                <div>
                    <h3 className="text-xl font-bold mb-6">Manage Administrators</h3>
                    
                    {/* Add New Admin */}
                    <div className="bg-gray-100 p-4 rounded mb-8 border">
                      <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><UserPlus size={18}/> Add New Admin</h4>
                      <div className="grid md:grid-cols-4 gap-3">
                          <input 
                            type="text" 
                            placeholder="Full Name" 
                            className={inputClassSmall}
                            value={newAdmin.name}
                            onChange={e => setNewAdmin({...newAdmin, name: e.target.value})}
                          />
                          <input 
                            type="text" 
                            placeholder="Username/Email" 
                            className={inputClassSmall}
                            value={newAdmin.username}
                            onChange={e => setNewAdmin({...newAdmin, username: e.target.value})}
                          />
                          <input 
                            type="text" 
                            placeholder="Password" 
                            className={inputClassSmall}
                            value={newAdmin.password}
                            onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                          />
                          <div className="flex gap-2">
                            <select 
                              className={inputClassSmall + " flex-grow"}
                              value={newAdmin.role}
                              onChange={e => setNewAdmin({...newAdmin, role: e.target.value as UserRole})}
                              aria-label="Admin Role"
                            >
                              <option value={UserRole.FLOOR_ADMIN}>Floor Admin</option>
                              <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                            </select>
                            <button onClick={handleAddAdmin} className="bg-grantify-green text-white px-4 rounded hover:bg-green-700 font-bold">
                              Add
                            </button>
                          </div>
                      </div>
                    </div>

                    {/* List Admins */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm text-left">
                        <thead className="bg-gray-200 text-gray-700 uppercase">
                          <tr>
                            <th className="p-3">Name</th>
                            <th className="p-3">Username</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y bg-white border">
                          {admins.map(admin => (
                            <tr key={admin.id}>
                              <td className="p-3 font-medium">{admin.name}</td>
                              <td className="p-3 font-mono text-xs">{admin.username}</td>
                              <td className="p-3">
                                <span className={`text-xs px-2 py-1 rounded-full ${admin.role === UserRole.SUPER_ADMIN ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                  {admin.role}
                                </span>
                              </td>
                              <td className="p-3">
                                {admin.id !== user.id && (
                                  <button 
                                    onClick={() => handleDeleteAdmin(admin.id)}
                                    className="text-red-500 hover:text-red-700"
                                    title="Remove Admin"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                                {admin.id === user.id && <span className="text-gray-400 text-xs italic">Current User</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};