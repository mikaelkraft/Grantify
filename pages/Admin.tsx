import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/storage';
import { AdminUser, LoanApplication, Testimonial, QualifiedPerson, AdConfig, UserRole, RepaymentContent } from '../types';
import { LogOut, Download, Trash2, Edit, Plus, UserPlus, Shield, Loader2, Save } from 'lucide-react';

export const Admin: React.FC = () => {
  const [user, setUser] = useState<AdminUser | null>(null);
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

  // New Admin Form
  const [newAdmin, setNewAdmin] = useState({ name: '', username: '', password: '', role: UserRole.FLOOR_ADMIN });

  useEffect(() => {
    if (user) refreshData();
  }, [user]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [apps, tests, qual, adConfig, repay, adminList] = await Promise.all([
        ApiService.getApplications(),
        ApiService.getTestimonials(),
        ApiService.getQualified(),
        ApiService.getAds(),
        ApiService.getRepaymentContent(),
        ApiService.getAdmins()
      ]);
      setApplications(apps);
      setTestimonials(tests);
      setQualified(qual);
      setAds(adConfig);
      setRepayment(repay);
      setAdmins(adminList);
    } catch (e) {
      console.error("Failed to load admin data", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const admin = await ApiService.login(loginForm.username, loginForm.password);
      if (admin) setUser(admin);
      else alert('Invalid credentials');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => setUser(null);

  const exportApplicationsCSV = () => {
    const headers = ["ID", "Name", "Phone", "Amount", "Status", "Date"];
    const rows = applications.map(app => [app.id, app.fullName, app.phoneNumber, app.amount, app.status, app.dateApplied]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "grantify_applications.csv");
    document.body.appendChild(link);
    link.click();
  };

  const handleAdChange = async (key: keyof AdConfig, val: string) => {
    if (!ads) return;
    const newAds = { ...ads, [key]: val };
    setAds(newAds);
    await ApiService.saveAds(newAds);
  };

  // --- Testimonial Logic ---
  const handleUpdateTestimonial = async (id: string, field: keyof Testimonial, value: any) => {
    const target = testimonials.find(t => t.id === id);
    if (!target) return;
    
    const updated = { ...target, [field]: value };
    const newData = testimonials.map(t => t.id === id ? updated : t);
    
    setTestimonials(newData);
    await ApiService.updateTestimonial(updated);
  };

  const handleDeleteTestimonial = async (id: string) => {
    const confirm = window.confirm("Are you sure you want to delete this testimonial?");
    if (!confirm) return;
    
    const newData = testimonials.filter(t => t.id !== id);
    setTestimonials(newData);
    await ApiService.saveTestimonials(newData);
  };
  
  const handleAddTestimonial = async () => {
    const newT: Testimonial = {
      id: Date.now().toString(),
      name: 'New Testimonial',
      content: 'Enter content here...',
      amount: 100000,
      date: new Date().toISOString().split('T')[0],
      image: 'https://picsum.photos/100/100',
      likes: 0,
      loves: 0,
      claps: 0
    };
    const newData = [newT, ...testimonials];
    setTestimonials(newData);
    await ApiService.saveTestimonials(newData);
  };

  // --- Qualified Person Logic ---
  const handleAddQualified = async () => {
    const newPerson: QualifiedPerson = { 
        id: Date.now().toString(), 
        name: 'New Person', 
        amount: 0, 
        status: 'Pending', 
        notes: '' 
    };
    const newData = [newPerson, ...qualified];
    setQualified(newData);
    await ApiService.saveQualified(newData);
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
                          <th className="p-2 text-left">Type</th>
                          <th className="p-2 text-left">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {applications.map(app => (
                          <tr key={app.id}>
                            <td className="p-2">{app.fullName}</td>
                            <td className="p-2">₦{app.amount.toLocaleString()}</td>
                            <td className="p-2">{app.phoneNumber}</td>
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
                    <button onClick={handleAddQualified} className="flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                      <Plus size={16} /> Add New
                    </button>
                  </div>
                  <div className="space-y-2">
                    {qualified.map(q => (
                      <div key={q.id} className="flex flex-col md:flex-row gap-2 border p-2 rounded items-center bg-gray-50">
                          <input 
                            className={`${inputClassSmall} flex-grow`} 
                            value={q.name} 
                            onChange={(e) => handleUpdateQualified(q.id, 'name', e.target.value)} 
                            placeholder="Name"
                          />
                          <input 
                            className={`${inputClassSmall} w-32`} 
                            type="number"
                            value={q.amount} 
                            onChange={(e) => handleUpdateQualified(q.id, 'amount', parseInt(e.target.value))} 
                            placeholder="Amount"
                          />
                          <select 
                            className={inputClassSmall}
                            value={q.status}
                            onChange={(e) => handleUpdateQualified(q.id, 'status', e.target.value)}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Disbursed">Disbursed</option>
                          </select>
                          <input 
                            className={`${inputClassSmall} flex-grow`} 
                            value={q.notes} 
                            onChange={(e) => handleUpdateQualified(q.id, 'notes', e.target.value)} 
                            placeholder="Public Note (Optional)"
                          />
                          <button onClick={async () => {
                            const confirm = window.confirm("Delete this person?");
                            if(confirm) {
                                const n = qualified.filter(x => x.id !== q.id);
                                setQualified(n);
                                await ApiService.saveQualified(n);
                            }
                          }} className="text-red-500 p-2 hover:bg-red-100 rounded"><Trash2 size={16}/></button>
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
                    <button onClick={handleAddTestimonial} className="flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                      <Plus size={16} /> Add New
                    </button>
                  </div>
                  <div className="grid gap-6">
                    {testimonials.map(t => (
                      <div key={t.id} className="border border-gray-300 p-4 rounded bg-gray-50 flex flex-col gap-3">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 block mb-1">Name</label>
                            <input 
                              className={inputClassSmall + " w-full"}
                              value={t.name}
                              onChange={(e) => handleUpdateTestimonial(t.id, 'name', e.target.value)}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 block mb-1">Amount Received</label>
                            <input 
                              type="number"
                              className={inputClassSmall + " w-full"}
                              value={t.amount}
                              onChange={(e) => handleUpdateTestimonial(t.id, 'amount', parseInt(e.target.value))}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 block mb-1">Date</label>
                            <input 
                              type="date"
                              className={inputClassSmall + " w-full"}
                              value={t.date}
                              onChange={(e) => handleUpdateTestimonial(t.id, 'date', e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Testimonial Content</label>
                          <textarea
                            rows={2}
                            className={inputClassSmall + " w-full"}
                            value={t.content}
                            onChange={(e) => handleUpdateTestimonial(t.id, 'content', e.target.value)}
                          />
                        </div>

                        <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                          <span className="text-xs text-gray-400">ID: {t.id} • Stats: {t.likes} likes, {t.loves} loves</span>
                          <button onClick={() => handleDeleteTestimonial(t.id)} className="text-red-500 hover:bg-red-100 p-2 rounded flex items-center gap-1 text-sm">
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
                  <h3 className="text-xl font-bold mb-4">Advertisement Slots</h3>
                  <div className="space-y-4">
                    {Object.keys(ads).map((key) => (
                      <div key={key}>
                        <label className="block text-sm font-bold uppercase text-gray-600 mb-1">{key} Code</label>
                        <textarea 
                          className="w-full border border-gray-600 p-2 rounded font-mono text-xs h-24 bg-gray-800 text-white focus:ring-2 focus:ring-grantify-gold outline-none"
                          value={ads[key as keyof AdConfig]}
                          onChange={(e) => handleAdChange(key as keyof AdConfig, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Tab */}
              {activeTab === 'content' && repayment && (
                <div>
                    <h3 className="text-xl font-bold mb-4">Repayment Page Content</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium">Intro Text</label>
                        <textarea 
                          className={inputClass}
                          value={repayment.introText}
                          onChange={(e) => handleRepaymentUpdate({...repayment, introText: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium">Standard Loan Note</label>
                        <input 
                          className={inputClass}
                          value={repayment.standardNote}
                          onChange={(e) => handleRepaymentUpdate({...repayment, standardNote: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium">Fast-Track Loan Note</label>
                        <input 
                          className={inputClass}
                          value={repayment.fastTrackNote}
                          onChange={(e) => handleRepaymentUpdate({...repayment, fastTrackNote: e.target.value})}
                        />
                      </div>
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