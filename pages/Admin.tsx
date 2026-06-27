import {
  Shield,
  LogOut,
  User,
  Plus,
  Save,
  MessageSquare,
  Link as LinkIcon,
  Mail,
  Download,
  Trash2,
  UserPlus,
  Loader2,
  Zap,
  BookOpen,
  Type,
  Smile,
  Flag,
  X,
  Edit,
  Calendar,
  Check,
  FileText,
  DollarSign,
  ExternalLink,
  Eye,
} from 'lucide-react';
import React, { useEffect, useRef, useState, useTransition } from 'react';
import { ApiService } from '../services/storage';
import { AdminUser, LoanApplication, Testimonial, AdConfig, UserRole, RepaymentContent, LoanProvider, LoanProviderSubmission, BlogPost, ProviderReview, ContactMessage, ContentFlag, WhatsappConfig } from '../types';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
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

  const [profileForm, setProfileForm] = useState({
    name: '',
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  const [activeTab, setActiveTab] = useState('applications');
  const [isLoading, setIsLoading] = useState(false);
  
  // Data State
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [ads, setAds] = useState<AdConfig | null>(null);
  const [repayment, setRepayment] = useState<RepaymentContent | null>(null);
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsappConfig | null>(null);
  const [autoblogEnabled, setAutoblogEnabled] = useState<boolean>(false);
  const [autoblogUpdatedAt, setAutoblogUpdatedAt] = useState<string | null>(null);
  const [autoblogLastRun, setAutoblogLastRun] = useState<any>(null);
  const [autoblogLastSuccessRun, setAutoblogLastSuccessRun] = useState<any>(null);
  const [autoblogLastErrorRun, setAutoblogLastErrorRun] = useState<any>(null);
  const [isSavingAutoblog, setIsSavingAutoblog] = useState(false);
  const [isRunningDailyCron, setIsRunningDailyCron] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loanProviders, setLoanProviders] = useState<LoanProvider[]>([]);
  const [loanProviderSubmissions, setLoanProviderSubmissions] = useState<LoanProviderSubmission[]>([]);
  const [allReviews, setAllReviews] = useState<ProviderReview[]>([]);
  const [includeHiddenReviews, setIncludeHiddenReviews] = useState(false);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [selectedBlogPostIds, setSelectedBlogPostIds] = useState<Set<string>>(new Set());
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState({
    category: '',
    author: '',
    authorRole: '',
  });

  const categoryOptions = React.useMemo(() => {
    const base = [
      'Funding','Grants','Loans','Technology','Finance','Agriculture','Energy','Manufacturing','Health','Education','Creative Economy','Women & Youth','Policy','Strategy'
    ];
    const seen = new Set<string>(base.map(s => s.trim()));
    const extras: string[] = [];
    for (const p of blogPosts) {
      const c = String(p.category || '').trim();
      if (!c) continue;
      if (!seen.has(c)) {
        seen.add(c);
        extras.push(c);
      }
    }
    // Keep base first, then extras alphabetically
    extras.sort((a,b) => a.localeCompare(b));
    return base.concat(extras);
  }, [blogPosts]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);

  // Smart Writer helpers
  const [smartWriteInstructions, setSmartWriteInstructions] = useState('');
  const [flagsInbox, setFlagsInbox] = useState<ContentFlag[]>([]);
  const [flagEntities, setFlagEntities] = useState<Record<string, any>>({});

  // New Blog Post Form
  const [newPost, setNewPost] = useState<{
    id?: string;
    title: string;
    content: string;
    author: string;
    authorRole: string;
    category: string;
    image: string;
    tags: string[];
    sourceName: string;
    sourceUrl: string;
    views?: number;
    likes?: number;
    loves?: number;
    claps?: number;
    createdAt?: string;
  }>({ 
    title: '', 
    content: '', 
    author: user?.username || user?.name || '', 
    authorRole: user?.role === UserRole.SUPER_ADMIN ? 'Chief Strategist' : 'Editor', 
    category: 'Grants', 
    image: '',
    tags: [],
    sourceName: '',
    sourceUrl: '',
    views: undefined,
    likes: undefined,
    loves: undefined,
    claps: undefined,
    createdAt: undefined
  });

  const [isEditingPost, setIsEditingPost] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [autoLinkUrls, setAutoLinkUrls] = useState(true);
  const [oneDriveStatus, setOneDriveStatus] = useState<{ enabled: boolean; provider: string; connected: boolean; needsReconnect?: boolean; error?: string } | null>(null);
  const oneDriveStatusRef = useRef<typeof oneDriveStatus>(null);

  // Sponsored State
  const [sponsoredPricing, setSponsoredPricing] = useState<any[]>([]);
  const [sponsoredListingsAdmin, setSponsoredListingsAdmin] = useState<any[]>([]);
  const [sponsorTestimonialsAdmin, setSponsorTestimonialsAdmin] = useState<any[]>([]);
  const [isLoadingSponsored, setIsLoadingSponsored] = useState(false);
  const [isSavingSponsored, setIsSavingSponsored] = useState(false);
  const [newTestimonial, setNewTestimonial] = useState({ author: '', quote: '', providerId: '' });
  const [editingListing, setEditingListing] = useState<any | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({
    startAt: '',
    endAt: '',
    invoiceNumber: '',
    offlinePaymentMethod: '',
    invoiceIssuedAt: '',
    invoiceDueDate: '',
    adminNote: '',
    billingInfo: ''
  });

  // Applications Editing State
  const [editingApplication, setEditingApplication] = useState<LoanApplication | null>(null);
  const [appForm, setAppForm] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    country: '',
    amount: '',
    purpose: '',
    businessType: '',
    matchedNetwork: '',
    type: '',
    repaymentAmount: '',
    durationMonths: '',
    status: '',
    dateApplied: '',
    referralCode: ''
  });

  const [isUploadingFeaturedImage, setIsUploadingFeaturedImage] = useState(false);
  const [featuredImageLocalPreview, setFeaturedImageLocalPreview] = useState<string>('');

  const [isHydratingSelectedPost, setIsHydratingSelectedPost] = useState(false);
  const [, startTransition] = useTransition();

  const formatCronSource = (run: any) => (run?.is_vercel_cron ? 'vercel' : 'manual');

  useEffect(() => {
    oneDriveStatusRef.current = oneDriveStatus;
  }, [oneDriveStatus]);

  useEffect(() => {
    if (!user) return;
    setProfileForm({
      name: user.name || '',
      username: user.username || '',
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    });
  }, [user?.id]);

  // Load tab from URL query params on mount
  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search || '');
      const requested = qs.get('tab');
      if (requested) setActiveTab(requested);
    } catch {}
  }, [user?.id]);

  // Sync tab state with URL query parameter
  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search || '');
      if (qs.get('tab') !== activeTab) {
        qs.set('tab', activeTab);
        const newUrl = `${window.location.pathname}?${qs.toString()}`;
        window.history.replaceState(null, '', newUrl);
      }
    } catch {}
  }, [activeTab]);

  useEffect(() => {
    let canceled = false;
    let intervalId: number | null = null;

    const fetchStatus = async () => {
      if (!user) return;
      if (activeTab !== 'blog') return;
      try {
        const status = await ApiService.getDriveStatus();
        if (!canceled) setOneDriveStatus(status);
      } catch {
        if (!canceled) setOneDriveStatus(null);
      }
    };

    // loadSponsored helper removed from here to become component-level

    const onFocus = () => {
      fetchStatus();
    };

    if (user && activeTab === 'blog') {
      window.addEventListener('focus', onFocus);
      fetchStatus();

      // While disconnected, poll so the UI flips to Connected
      intervalId = window.setInterval(() => {
        const s = oneDriveStatusRef.current;
        if (!s) return;
        if (s.enabled && s.provider === 'gdrive' && !s.connected) {
          fetchStatus();
        }
      }, 8000);
    }

    return () => {
      canceled = true;
      if (intervalId) window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [activeTab, user?.id]);

  // Load sponsored data when this tab is active or refreshed
  const loadSponsored = React.useCallback(async () => {
    if (!user) return;
    setIsLoadingSponsored(true);
    try {
      const [pricing, listings, meta] = await Promise.all([
        ApiService.getSponsoredPricing(),
        ApiService.getAllSponsoredListingsAdmin(),
        ApiService.getSponsorMeta().catch(() => null)
      ]);
      setSponsoredPricing(pricing || []);
      setSponsoredListingsAdmin(listings || []);
      setSponsorTestimonialsAdmin(meta?.testimonials || []);
    } catch (err) {
      console.warn('Failed to load sponsored data', err);
    } finally {
      setIsLoadingSponsored(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'sponsored') {
      loadSponsored();
    }
  }, [activeTab, loadSponsored]);

  const handleUpdateSlots = async (tierId: number, maxSlots: number | null) => {
    try {
      setIsSavingSponsored(true);
      await ApiService.adminUpdateTierSlots(tierId, maxSlots);
      alert("Tier slots updated successfully!");
      loadSponsored();
    } catch (err: any) {
      alert(err?.message || "Failed to update slots");
    } finally {
      setIsSavingSponsored(false);
    }
  };

  const handleMarkPaid = async (id: number) => {
    if (!confirm("Mark this sponsorship as paid? This will activate the slots and trigger schedule/billing verification.")) return;
    try {
      setIsSavingSponsored(true);
      await ApiService.adminMarkSponsoredPaid(id);
      alert("Sponsorship marked as paid!");
      loadSponsored();
    } catch (err: any) {
      alert(err?.message || "Failed to mark as paid");
    } finally {
      setIsSavingSponsored(false);
    }
  };

  const handlePublishNow = async (id: number) => {
    if (!confirm("Are you sure you want to publish this listing immediately? This will set start date to now and end date based on duration.")) return;
    try {
      setIsSavingSponsored(true);
      await ApiService.adminPublishListingNow(id);
      alert("Listing published successfully!");
      loadSponsored();
    } catch (err: any) {
      alert(err?.message || "Failed to publish listing");
    } finally {
      setIsSavingSponsored(false);
    }
  };

  const handleSendInvoice = async (listing: any) => {
    const email = prompt("Enter email address to send invoice to:", listing.payer_email || "");
    if (email === null) return;
    try {
      setIsSavingSponsored(true);
      await ApiService.sendSponsoredInvoice(listing.id, email || undefined);
      alert("Invoice email sent successfully!");
      loadSponsored();
    } catch (err: any) {
      alert(err?.message || "Failed to send invoice email");
    } finally {
      setIsSavingSponsored(false);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      setIsSavingSponsored(true);
      await ApiService.adminDownloadSponsoredCSV();
    } catch (err: any) {
      alert(err?.message || "Failed to export CSV");
    } finally {
      setIsSavingSponsored(false);
    }
  };

  const startEditListing = (listing: any) => {
    const formatDate = (dateStr: string | null | undefined) => {
      if (!dateStr) return '';
      try {
        return new Date(dateStr).toISOString().substring(0, 10);
      } catch {
        return '';
      }
    };
    setEditingListing(listing);
    setInvoiceForm({
      startAt: formatDate(listing.start_at),
      endAt: formatDate(listing.end_at),
      invoiceNumber: listing.invoice_number || '',
      offlinePaymentMethod: listing.offline_payment_method || '',
      invoiceIssuedAt: formatDate(listing.invoice_issued_at),
      invoiceDueDate: formatDate(listing.invoice_due_date),
      adminNote: listing.admin_note || '',
      billingInfo: typeof listing.billing_info === 'object' ? JSON.stringify(listing.billing_info, null, 2) : (listing.billing_info || '')
    });
  };

  const handleSaveListingEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;
    try {
      setIsSavingSponsored(true);
      let parsedBilling = null;
      if (invoiceForm.billingInfo.trim()) {
        try {
          parsedBilling = JSON.parse(invoiceForm.billingInfo);
        } catch {
          parsedBilling = invoiceForm.billingInfo; // fallback to plain string
        }
      }
      
      // Call both endpoints to update schedule and invoice
      await ApiService.adminSchedulePublish(
        editingListing.id, 
        invoiceForm.startAt || null, 
        invoiceForm.endAt || null, 
        invoiceForm.adminNote
      );
      
      await ApiService.updateSponsoredInvoice(editingListing.id, {
        invoiceNumber: invoiceForm.invoiceNumber,
        billingInfo: parsedBilling,
        offlinePaymentMethod: invoiceForm.offlinePaymentMethod,
        invoiceIssuedAt: invoiceForm.invoiceIssuedAt || undefined,
        invoiceDueDate: invoiceForm.invoiceDueDate || undefined,
        adminNote: invoiceForm.adminNote
      });
      
      alert("Listing schedule and billing details updated successfully!");
      setEditingListing(null);
      loadSponsored();
    } catch (err: any) {
      alert(err?.message || "Failed to save listing edits");
    } finally {
      setIsSavingSponsored(false);
    }
  };

  const handleAddSponsorTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestimonial.author || !newTestimonial.quote) {
      alert("Please fill in author and quote.");
      return;
    }
    try {
      setIsSavingSponsored(true);
      const pId = newTestimonial.providerId ? Number(newTestimonial.providerId) : null;
      await ApiService.addSponsorTestimonial(newTestimonial.author, newTestimonial.quote, pId);
      alert("Testimonial added successfully!");
      setNewTestimonial({ author: '', quote: '', providerId: '' });
      loadSponsored();
    } catch (err: any) {
      alert(err?.message || "Failed to add testimonial");
    } finally {
      setIsSavingSponsored(false);
    }
  };

  const handleDeleteSponsorTestimonial = async (id: number) => {
    if (!confirm("Are you sure you want to delete this testimonial?")) return;
    try {
      setIsSavingSponsored(true);
      await ApiService.deleteSponsorTestimonial(id);
      alert("Testimonial deleted successfully!");
      loadSponsored();
    } catch (err: any) {
      alert(err?.message || "Failed to delete testimonial");
    } finally {
      setIsSavingSponsored(false);
    }
  };

  const startEditApplication = (app: LoanApplication) => {
    setEditingApplication(app);
    setAppForm({
      fullName: app.fullName || '',
      phoneNumber: app.phoneNumber || '',
      email: app.email || '',
      country: app.country || '',
      amount: String(app.amount || ''),
      purpose: app.purpose || '',
      businessType: app.businessType || '',
      matchedNetwork: app.matchedNetwork || '',
      type: app.type || '',
      repaymentAmount: String(app.repaymentAmount || ''),
      durationMonths: String(app.durationMonths || ''),
      status: app.status || '',
      dateApplied: app.dateApplied || '',
      referralCode: app.referralCode || ''
    });
  };

  const handleSaveApplicationEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApplication) return;
    try {
      setIsSaving(true);
      const updated: LoanApplication = {
        ...editingApplication,
        fullName: appForm.fullName,
        phoneNumber: appForm.phoneNumber,
        email: appForm.email,
        country: appForm.country,
        amount: Number(appForm.amount),
        purpose: appForm.purpose,
        businessType: appForm.businessType,
        matchedNetwork: appForm.matchedNetwork,
        type: appForm.type as any,
        repaymentAmount: appForm.repaymentAmount ? Number(appForm.repaymentAmount) : undefined,
        durationMonths: appForm.durationMonths ? Number(appForm.durationMonths) : undefined,
        status: appForm.status as any,
        dateApplied: appForm.dateApplied,
        referralCode: appForm.referralCode || undefined
      };
      await ApiService.updateApplication(updated);
      alert("Application updated successfully!");
      setEditingApplication(null);
      refreshData();
    } catch (err: any) {
      alert(err?.message || "Failed to update application");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (!confirm("Are you sure you want to delete this application? This action cannot be undone.")) return;
    try {
      setIsLoading(true);
      await ApiService.deleteApplication(id);
      alert("Application deleted successfully!");
      refreshData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete application");
    } finally {
      setIsLoading(false);
    }
  };

  const linkifyHtml = (html: string): string => {
    if (!html || typeof html !== 'string') return html;
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);

      const urlRegex = /\bhttps?:\/\/[^\s<]+[^\s<\.)\]\}]/gi;
      const wwwRegex = /\bwww\.[^\s<]+[^\s<\.)\]\}]/gi;

      const textNodes: Text[] = [];
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const parent = node.parentElement;
        if (!parent) continue;
        const tag = parent.tagName;
        if (tag === 'A' || tag === 'SCRIPT' || tag === 'STYLE') continue;
        textNodes.push(node);
      }

      for (const node of textNodes) {
        const text = node.nodeValue || '';
        if (!text) continue;
        if (!urlRegex.test(text) && !wwwRegex.test(text)) continue;
        urlRegex.lastIndex = 0;
        wwwRegex.lastIndex = 0;

        const parts: Array<{ kind: 'text' | 'link'; value: string }> = [];
        let idx = 0;
        const combinedRegex = new RegExp(`${urlRegex.source}|${wwwRegex.source}`, 'gi');
        let match: RegExpExecArray | null;
        while ((match = combinedRegex.exec(text))) {
          const start = match.index;
          const raw = match[0];
          if (start > idx) parts.push({ kind: 'text', value: text.slice(idx, start) });
          parts.push({ kind: 'link', value: raw });
          idx = start + raw.length;
        }
        if (idx < text.length) parts.push({ kind: 'text', value: text.slice(idx) });

        if (parts.length <= 1) continue;

        const frag = doc.createDocumentFragment();
        for (const part of parts) {
          if (part.kind === 'text') {
            frag.appendChild(doc.createTextNode(part.value));
          } else {
            const href = part.value.startsWith('http') ? part.value : `https://${part.value}`;
            const a = doc.createElement('a');
            a.setAttribute('href', href);
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
            a.textContent = part.value;
            frag.appendChild(a);
          }
        }

        node.parentNode?.replaceChild(frag, node);
      }

      return doc.body.innerHTML;
    } catch {
      return html;
    }
  };

    // Client-side sanitizer to mirror backend: remove Sources/Related reads
    // blocks and strip anecdotal first-person sentences from paragraphs.
    const sanitizeEditorHtml = (html: string): string => {
      if (!html || typeof html !== 'string') return html;
      try {
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // Remove <h3>Sources</h3> + following <ul>
        const h3s = Array.from(doc.querySelectorAll('h3'));
        for (const h of h3s) {
          const txt = (h.textContent || '').trim().toLowerCase();
          if (txt === 'sources' || txt.startsWith('related')) {
            const next = h.nextElementSibling;
            if (next && (next.tagName === 'UL' || next.tagName === 'P')) next.remove();
            h.remove();
          }
        }

        // Remove inline "Also read" strong anchors
        const strongs = Array.from(doc.querySelectorAll('strong'));
        for (const s of strongs) {
          if ((s.textContent || '').toLowerCase().includes('also read')) {
            s.remove();
          }
        }

        const paras = Array.from(doc.querySelectorAll('p'));
        for (const p of paras) {
          const text = p.textContent || '';
          const sentences = String(text).split(/(?<=[.!?])\s+/);
          const filtered = sentences.filter((sent) => {
            const s = String(sent || '').trim();
            const low = s.toLowerCase();
            if (/^as\s+(i|we|she|he|they|you)\b/i.test(s)) return false;
            if (/\b(i\s+(was|met|visited|spent|joined|accompanied)\b|we\s+(visited|met|were|spent)\b)/i.test(s)) return false;
            if (/\b(today i|yesterday i|this morning i|this afternoon i|i was with|i met with|we met with|we were with|i spent the day|i visited)\b/i.test(low)) return false;
            if (/^as\s+[A-Za-z]+/i.test(s)) return false;
            return true;
          });
          let out = filtered.join(' ');
          // Limit repeated 'Nigeria' mentions
          const country = 'Nigeria';
          const parts = out.split(new RegExp(`(${country})`, 'gi'));
          if (parts.length > 3) {
            let seen = 0;
            out = parts.map(p => {
              if (p.toLowerCase() === country.toLowerCase()) {
                seen += 1;
                return seen === 1 ? p : 'the country';
              }
              return p;
            }).join('');
          }
          p.textContent = out;
        }

        return doc.body.innerHTML;
      } catch {
        return html;
      }
    };

  const quillRef = React.useRef<any>(null);
  const inlineImageInputRef = React.useRef<HTMLInputElement | null>(null);

  const normalizeEmbedUrl = (raw: string): string => {
    const url = String(raw || '').trim();
    if (!url) return '';

    try {
      const u = new URL(url.startsWith('http') ? url : `https://${url}`);

      // YouTube
      if (u.hostname.includes('youtube.com')) {
        const id = u.searchParams.get('v');
        return id ? `https://www.youtube.com/embed/${id}` : url;
      }
      if (u.hostname === 'youtu.be') {
        const id = u.pathname.split('/').filter(Boolean)[0];
        return id ? `https://www.youtube.com/embed/${id}` : url;
      }

      // Vimeo
      if (u.hostname.includes('vimeo.com')) {
        const id = u.pathname.split('/').filter(Boolean)[0];
        if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
      }

      // Spotify
      if (u.hostname.includes('open.spotify.com')) {
        // Convert /track/... => /embed/track/...
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length >= 2 && parts[0] !== 'embed') {
          return `https://open.spotify.com/embed/${parts[0]}/${parts[1]}`;
        }
        return u.toString();
      }

      return u.toString();
    } catch {
      return url;
    }
  };

  const insertQuillEmbed = (type: 'image' | 'video', value: string) => {
    const editor = quillRef.current?.getEditor?.();
    if (!editor || !value) return;
    const range = editor.getSelection?.(true);
    const index = typeof range?.index === 'number' ? range.index : editor.getLength?.() || 0;
    editor.insertEmbed(index, type, value, 'user');
    editor.setSelection?.(index + 1, 0);
  };

  const insertQuillText = (text: string) => {
    const editor = quillRef.current?.getEditor?.();
    if (!editor || !text) return;
    const range = editor.getSelection?.(true);
    const index = typeof range?.index === 'number' ? range.index : editor.getLength?.() || 0;
    editor.insertText(index, text, 'user');
    editor.setSelection?.(index + text.length, 0);
  };

  const handleToolbarImage = () => {
    inlineImageInputRef.current?.click();
  };

  const handleToolbarVideo = () => {
    const raw = window.prompt('Paste a YouTube/Vimeo/Spotify embed or share link:');
    const url = normalizeEmbedUrl(raw || '');
    if (!url) return;
    insertQuillEmbed('video', url);
  };

  const handleInlineImagePicked: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!supportedTypes.has(file.type)) {
      alert("Unsupported image type. Please use JPG, PNG, WEBP, or GIF. (HEIC/HEIF from iPhone galleries won't display.)");
      return;
    }

    try {
      const url = await ApiService.uploadImage(file, { folder: 'blog-images' });
      insertQuillEmbed('image', url);
      return;
    } catch (err: any) {
      const connectUrl = String(err?.connectUrl || '').trim();
      const msg = String(err?.message || '').toLowerCase();

      if (connectUrl) {
        let opened: Window | null = null;
        try { opened = window.open(connectUrl, '_blank', 'noopener,noreferrer'); } catch {}
        if (!opened) {
          window.location.href = connectUrl;
        } else {
          alert('Cloud storage is not connected yet. A consent page was opened; complete it, then retry the upload.');
        }
        return;
      }

      if (msg.includes('uploads are disabled') || msg.includes('not configured') || msg.includes('not connected')) {
        alert(String(err?.message || 'Image uploads are not configured.'));
        return;
      }

      console.warn('Offsite inline image upload failed', err);
      alert(String(err?.message || 'Failed to upload image. Please try again.'));
      return;
    }
  };

  const quillModules = {
    toolbar: {
      container: [
        [{ header: [2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'link'],
        ['image', 'video'],
        ['clean']
      ],
      handlers: {
        image: handleToolbarImage,
        video: handleToolbarVideo
      }
    }
  };

  const quillFormats = [
    'header',
    'bold',
    'italic',
    'underline',
    'color',
    'background',
    'list',
    'bullet',
    'blockquote',
    'link',
    'image',
    'video'
  ];

  // Update author if user name changes
  useEffect(() => {
    const seededAuthor = user?.username || user?.name;
    if (seededAuthor && !newPost.author) {
      setNewPost(prev => ({ ...prev, author: seededAuthor }));
    }
  }, [user]);

  // New Admin Form
  const [newAdmin, setNewAdmin] = useState({ name: '', username: '', password: '', role: UserRole.FLOOR_ADMIN });

  // Track unsaved changes
  const [hasUnsavedTestimonials, setHasUnsavedTestimonials] = useState(false);
  const [hasUnsavedAds, setHasUnsavedAds] = useState(false);
  const [hasUnsavedRepayment, setHasUnsavedRepayment] = useState(false);
  const [hasUnsavedWhatsapp, setHasUnsavedWhatsapp] = useState(false);
  const [hasUnsavedProviders, setHasUnsavedProviders] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [postSaveNotice, setPostSaveNotice] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (user) refreshData();
  }, [user, includeHiddenReviews]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [apps, tests, adConfig, repay, adminList, providers, submissions, reviews, posts, contact, flagsData, autoblogCfg, whatsappCfg] = await Promise.all([
        ApiService.getApplications(),
        ApiService.getTestimonials(),
        ApiService.getAds(),
        ApiService.getRepaymentContent(),
        ApiService.getAdmins(),
        ApiService.getLoanProviders(),
        ApiService.getLoanProviderSubmissions('pending'),
        ApiService.getProviderReviews(undefined, { includeHidden: includeHiddenReviews }),
        ApiService.getBlogPosts(undefined, { includeDrafts: true }),
        ApiService.getContactMessages(120),
        ApiService.getFlags('open'),
        ApiService.getAutoblogConfig(),
        ApiService.getWhatsappConfig()
      ]);
      setApplications(apps);
      setTestimonials(tests);
      setAds(adConfig);
      setRepayment(repay);
      setWhatsappConfig(whatsappCfg);
      setAdmins(adminList);
      setLoanProviders(providers);
      setLoanProviderSubmissions(submissions);
      setAllReviews(reviews);
      setBlogPosts(posts);
      setContactMessages(contact);
      setFlagsInbox(flagsData?.flags || []);
      setFlagEntities(flagsData?.entities || {});
      setAutoblogEnabled(Boolean(autoblogCfg?.enabled));
      setAutoblogUpdatedAt(autoblogCfg?.updatedAt ? String(autoblogCfg.updatedAt) : null);
      setAutoblogLastRun(autoblogCfg?.lastRun ?? null);
      setAutoblogLastSuccessRun(autoblogCfg?.lastSuccessRun ?? null);
      setAutoblogLastErrorRun(autoblogCfg?.lastErrorRun ?? null);
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

  const handleToggleAutoblog = async () => {
    const next = !autoblogEnabled;
    const ok = window.confirm(next
      ? 'Enable autoblogging? This allows the daily cron to publish when AUTOBLOG_ENABLED is true.'
      : 'Disable autoblogging? The daily cron will skip publishing.');
    if (!ok) return;

    setIsSavingAutoblog(true);
    try {
      const res = await ApiService.setAutoblogEnabled(next);
      setAutoblogEnabled(Boolean(res?.enabled));
      setAutoblogUpdatedAt(new Date().toISOString());
    } catch (e: any) {
      alert(e?.message || 'Failed to update autoblog setting');
    } finally {
      setIsSavingAutoblog(false);
    }
  };

  const handleRunDailyCron = async (force: boolean) => {
    const ok = window.confirm(force
      ? 'Run the daily autoblog now (FORCE)? This will publish even if a daily post already exists today.'
      : 'Run the daily autoblog now? This may skip if today\'s daily post already exists.'
    );
    if (!ok) return;

    setIsRunningDailyCron(true);
    try {
      const res = await ApiService.triggerDailyBlogCron({ force });
      if (res?.skipped) {
        alert(res?.reason ? `Skipped: ${res.reason}` : 'Skipped');
      } else if (res?.id) {
        alert(`Posted. ID: ${res.id}${res?.title ? `\nTitle: ${res.title}` : ''}`);
      } else {
        alert('Triggered.');
      }
      void refreshData();
    } catch (e: any) {
      alert(e?.message || 'Failed to run daily cron');
    } finally {
      setIsRunningDailyCron(false);
    }
  };

  const handleDeleteContactMessage = async (id: string) => {
    const ok = window.confirm('Delete this contact message? This cannot be undone.');
    if (!ok) return;
    try {
      await ApiService.deleteContactMessage(String(id));
      setContactMessages(prev => prev.filter(m => String(m.id) !== String(id)));
    } catch (e: any) {
      alert(e?.message || 'Failed to delete contact message');
    }
  };

  const refreshFlagsInbox = async () => {
    setIsLoading(true);
    try {
      const flagsData = await ApiService.getFlags('open');
      setFlagsInbox(flagsData?.flags || []);
      setFlagEntities(flagsData?.entities || {});
    } catch {
      alert('Failed to refresh moderation inbox');
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
    localStorage.removeItem('admin_session');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const wantsPasswordChange = Boolean(profileForm.newPassword || profileForm.confirmNewPassword);
    if (wantsPasswordChange) {
      if (!profileForm.currentPassword) {
        alert('Enter your current password to change your password.');
        return;
      }
      if (!profileForm.newPassword) {
        alert('Enter a new password.');
        return;
      }
      if (profileForm.newPassword !== profileForm.confirmNewPassword) {
        alert('New passwords do not match.');
        return;
      }
      if (profileForm.newPassword.length < 6) {
        alert('New password must be at least 6 characters.');
        return;
      }
    }

    setIsSavingProfile(true);
    try {
      const updated = await ApiService.updateMyProfile({
        name: profileForm.name,
        username: profileForm.username,
        currentPassword: wantsPasswordChange ? profileForm.currentPassword : undefined,
        newPassword: wantsPasswordChange ? profileForm.newPassword : undefined,
      });

      setUser(updated);
      localStorage.setItem('admin_session', JSON.stringify(updated));
      setAdmins(prev => prev.map(a => (a.id === updated.id ? { ...a, ...updated } : a)));

      setProfileForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      }));

      alert('Profile updated.');
    } catch (e: any) {
      alert(e?.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
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
      interestRange: '5% - 20% monthly',
      tenure: '1 - 6 months',
      website: 'https://...',
      playStoreUrl: '',
      tag: '',
      rating: 4.5,
      requirements: 'NIN, BVN',
      isRecommended: false
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

  const handleApproveProviderSubmission = async (s: LoanProviderSubmission) => {
    const nextProvider: LoanProvider = {
      id: Date.now(),
      name: s.name,
      description: s.description,
      loanRange: s.loanRange || '',
      interestRange: s.interestRange || '',
      tenure: s.tenure || '',
      website: s.website || '',
      logo: s.logo || '',
      playStoreUrl: s.playStoreUrl || '',
      tag: s.tag || '',
      rating: typeof s.rating === 'number' ? s.rating : 0,
      requirements: s.requirements || '',
      isRecommended: false
    };

    setLoanProviders(prev => [...prev, nextProvider]);
    setHasUnsavedProviders(true);

    try {
      await ApiService.updateLoanProviderSubmissionStatus(s.id, 'approved');
      setLoanProviderSubmissions(prev => prev.filter(x => x.id !== s.id));
    } catch (e) {
      alert('Approved locally, but failed to update submission status. Try again.');
    }
  };

  const handleRejectProviderSubmission = async (id: string) => {
    if (!window.confirm('Reject this submission?')) return;
    try {
      await ApiService.updateLoanProviderSubmissionStatus(id, 'rejected');
      setLoanProviderSubmissions(prev => prev.filter(x => x.id !== id));
    } catch {
      alert('Failed to reject submission');
    }
  };


  // --- Ad Management Logic ---

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

  const handleWhatsappUpdateLocal = (newConfig: WhatsappConfig) => {
    setWhatsappConfig(newConfig);
    setHasUnsavedWhatsapp(true);
  };

  const handleSaveWhatsapp = async () => {
    if (!whatsappConfig) return;
    setIsSaving(true);
    try {
      await ApiService.saveWhatsappConfig(whatsappConfig);
      setHasUnsavedWhatsapp(false);
      alert('WhatsApp button configuration saved successfully!');
    } catch (e) {
      console.error('Failed to save WhatsApp config', e);
      alert('Failed to save WhatsApp config. Please check database connectivity.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await ApiService.deleteProviderReview(id);
      setAllReviews(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      alert('Failed to delete review');
    }
  };

  const handleDeleteBlogPost = async (id: string) => {
    if (!window.confirm('Delete this blog post?')) return;
    try {
      await ApiService.deleteBlogPost(id);
      setBlogPosts(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      alert('Failed to delete post');
    }
  };

  const isAutodraftPost = (post: BlogPost) => {
    const isSourceUrlAutodraft = String(post.sourceUrl || '').toLowerCase() === 'autodraft';
    const isTagAutodraft = Array.isArray(post.tags) && post.tags.map(String).some(t => t.toLowerCase() === 'autodraft');
    return isSourceUrlAutodraft || isTagAutodraft;
  };

  const handleBulkApproveBlogPosts = async () => {
    const ids = Array.from(selectedBlogPostIds);
    if (ids.length === 0) return;
    const ok = window.confirm(`Approve and publish ${ids.length} post(s)? This removes the autodraft tag.`);
    if (!ok) return;

    setIsSavingPost(true);
    try {
      for (const id of ids) {
        const post = blogPosts.find(p => String(p.id) === String(id));
        if (!post) continue;
        const nextTags = (Array.isArray(post.tags) ? post.tags.filter(t => String(t).toLowerCase() !== 'autodraft') : []);
        await ApiService.submitBlogAction({
          action: 'update',
          id: String(post.id),
          title: post.title,
          content: post.content,
          author: post.author,
          authorRole: post.authorRole,
          category: post.category,
          image: post.image || '',
          tags: nextTags,
          sourceName: post.sourceName || '',
          sourceUrl: String(post.sourceUrl || '').toLowerCase() === 'autodraft' ? '' : (post.sourceUrl || ''),
          views: post.views,
          likes: post.likes,
          loves: post.loves,
          claps: post.claps,
          createdAt: post.createdAt
        });
      }

      setSelectedBlogPostIds(new Set());
      await refreshData();
      alert('Selected posts approved and published.');
    } catch (e: any) {
      alert(e?.message || 'Failed to approve selected posts');
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleBulkDeleteBlogPosts = async () => {
    const ids = Array.from(selectedBlogPostIds);
    if (ids.length === 0) return;
    const ok = window.confirm(`Are you sure you want to delete ${ids.length} selected post(s)?`);
    if (!ok) return;

    setIsSavingPost(true);
    try {
      for (const id of ids) {
        await ApiService.deleteBlogPost(id);
      }
      setSelectedBlogPostIds(new Set());
      await refreshData();
      alert('Selected posts deleted.');
    } catch (e: any) {
      alert(e?.message || 'Failed to delete selected posts');
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleBulkEditBlogPosts = async (e: React.FormEvent) => {
    e.preventDefault();
    const ids = Array.from(selectedBlogPostIds);
    if (ids.length === 0) return;

    setIsSavingPost(true);
    try {
      for (const id of ids) {
        const post = blogPosts.find(p => String(p.id) === String(id));
        if (!post) continue;
        
        await ApiService.submitBlogAction({
          action: 'update',
          id: String(post.id),
          title: post.title,
          content: post.content,
          author: bulkEditForm.author.trim() ? bulkEditForm.author.trim() : post.author,
          authorRole: bulkEditForm.authorRole.trim() ? bulkEditForm.authorRole.trim() : post.authorRole,
          category: bulkEditForm.category ? bulkEditForm.category : post.category,
          image: post.image || '',
          tags: post.tags,
          sourceName: post.sourceName || '',
          sourceUrl: post.sourceUrl || '',
          views: post.views,
          likes: post.likes,
          loves: post.loves,
          claps: post.claps,
          createdAt: post.createdAt
        });
      }
      setSelectedBlogPostIds(new Set());
      setShowBulkEditModal(false);
      await refreshData();
      alert('Selected posts updated.');
    } catch (e: any) {
      alert(e?.message || 'Failed to bulk edit selected posts');
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleApproveSinglePost = async (post: BlogPost) => {
    if (!window.confirm(`Approve and publish "${post.title}"? This will remove the "autodraft" tag.`)) return;
    setIsSavingPost(true);
    try {
      const nextTags = (Array.isArray(post.tags) ? post.tags.filter(t => String(t).toLowerCase() !== 'autodraft') : []);
      await ApiService.submitBlogAction({
        action: 'update',
        id: String(post.id),
        title: post.title,
        content: post.content,
        author: post.author,
        authorRole: post.authorRole,
        category: post.category,
        image: post.image || '',
        tags: nextTags,
        sourceName: post.sourceName || '',
        sourceUrl: String(post.sourceUrl || '').toLowerCase() === 'autodraft' ? '' : (post.sourceUrl || ''),
        views: post.views,
        likes: post.likes,
        loves: post.loves,
        claps: post.claps,
        createdAt: post.createdAt
      });
      await refreshData();
      alert('Post approved and published.');
    } catch (e: any) {
      alert(e?.message || 'Failed to approve post');
    } finally {
      setIsSavingPost(false);
    }
  };

  const [pendingEditPostId, setPendingEditPostId] = useState<string | null>(null);
  const [featuredImageUploadKey, setFeaturedImageUploadKey] = useState(0);
  const [featuredImagePreviewNonce, setFeaturedImagePreviewNonce] = useState(0);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = (params.get('tab') || '').trim();
      const editPostId = (params.get('editPostId') || '').trim();

      const allowedTabs = new Set([
        'applications',
        'testimonials',
        'ads',
        'providers',
        'sponsored',
        'contact',
        'content',
        'reviews',
        'blog',
        'moderation',
        'admins'
      ]);

      if (tab && allowedTabs.has(tab)) setActiveTab(tab);
      if (editPostId) {
        setActiveTab('blog');
        setPendingEditPostId(editPostId);
      }
    } catch {
      // no-op
    }
  }, []);

  const handleFeaturedImageUpload = async (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!supportedTypes.has(file.type)) {
      alert("Unsupported image type. Please use JPG, PNG, WEBP, or GIF. (HEIC/HEIF from iPhone galleries won't display.)");
      return;
    }

    const localPreviewUrl = (() => {
      try {
        return URL.createObjectURL(file);
      } catch {
        return '';
      }
    })();

    if (localPreviewUrl) {
      setFeaturedImageLocalPreview((prev) => {
        try { if (prev) URL.revokeObjectURL(prev); } catch {}
        return localPreviewUrl;
      });
      setFeaturedImagePreviewNonce((n) => n + 1);
    }

    setIsUploadingFeaturedImage(true);

    try {
      const url = await ApiService.uploadImage(file, { folder: 'blog-images' });
      setNewPost(prev => ({ ...prev, image: url }));
      setFeaturedImageLocalPreview((prev) => {
        try { if (prev) URL.revokeObjectURL(prev); } catch {}
        return '';
      });
      // Ensure the preview refreshes even on aggressive mobile caches.
      setFeaturedImagePreviewNonce((n) => n + 1);
      // Reset file input so selecting the same file again re-triggers onChange.
      setFeaturedImageUploadKey((k) => k + 1);
      return;
    } catch (err: any) {
      const connectUrl = String(err?.connectUrl || '').trim();
      const msg = String(err?.message || '').toLowerCase();

      if (connectUrl) {
        let opened: Window | null = null;
        try { opened = window.open(connectUrl, '_blank', 'noopener,noreferrer'); } catch {}
        if (!opened) {
          window.location.href = connectUrl;
        } else {
          alert('Cloud storage is not connected yet. A consent page was opened; complete it, then retry the upload.');
        }
        return;
      }

      if (msg.includes('uploads are disabled') || msg.includes('not configured') || msg.includes('not connected')) {
        alert(String(err?.message || 'Image uploads are not configured.'));
        return;
      }

      console.warn('Offsite featured image upload failed', err);
      alert(String(err?.message || 'Failed to upload image. Please try again.'));
      // Keep the current URL unchanged. Avoid base64 fallback because it produces huge data: URLs
      // that are unreliable on mobile and can break saving/rendering.
      // Keep the local preview if the post previously had no image, so the user still sees what they picked.
      if (String(newPost.image || '').trim()) {
        setFeaturedImageLocalPreview((prev) => {
          try { if (prev) URL.revokeObjectURL(prev); } catch {}
          return '';
        });
      }
      setFeaturedImageUploadKey((k) => k + 1);
      return;
    } finally {
      setIsUploadingFeaturedImage(false);
    }
  };

  const handleAddBlogPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPost(true);
    setPostSaveNotice(null);
    try {
      let content = autoLinkUrls ? linkifyHtml(newPost.content) : newPost.content;
      // sanitize AI output / pasted HTML before submit (defense in depth)
      content = sanitizeEditorHtml(content);

      const payload = {
        ...newPost,
        image: (newPost.image || '').trim(),
        content
      };

      if (isEditingPost && newPost.id) {
        const updated = await ApiService.submitBlogAction({ ...payload, id: String(newPost.id), action: 'update' });
        setBlogPosts(prev => prev.map(p => {
          if (String(p.id) !== String(newPost.id)) return p;
          return {
            ...p,
            title: payload.title,
            content: payload.content,
            author: payload.author,
            authorRole: payload.authorRole,
            category: payload.category,
            image: payload.image,
            tags: payload.tags || [],
            sourceName: payload.sourceName || '',
            sourceUrl: payload.sourceUrl || '',
            views: typeof payload.views === 'number' ? payload.views : p.views,
            likes: typeof payload.likes === 'number' ? payload.likes : p.likes,
            loves: typeof payload.loves === 'number' ? payload.loves : p.loves,
            claps: typeof payload.claps === 'number' ? payload.claps : p.claps,
            createdAt: payload.createdAt || p.createdAt
          };
        }));
        if (updated?.success === true || updated?.success === undefined) {
          setPostSaveNotice({ kind: 'success', message: 'Publication updated.' });
        }
      } else {
        const created = await ApiService.submitBlogAction({ ...payload, action: 'create' });
        if (created?.id) {
          const nowIso = new Date().toISOString();
          setBlogPosts(prev => ([
            {
              id: String(created.id),
              title: payload.title,
              content: payload.content,
              author: payload.author,
              authorRole: payload.authorRole,
              category: payload.category,
              image: payload.image,
              tags: payload.tags || [],
              sourceName: payload.sourceName || '',
              sourceUrl: payload.sourceUrl || '',
              likes: typeof payload.likes === 'number' ? payload.likes : 0,
              loves: typeof payload.loves === 'number' ? payload.loves : 0,
              claps: typeof payload.claps === 'number' ? payload.claps : 0,
              views: typeof payload.views === 'number' ? payload.views : 0,
              commentsCount: 0,
              createdAt: payload.createdAt || nowIso,
              updatedAt: payload.createdAt || nowIso
            },
            ...prev
          ]));
          setPostSaveNotice({ kind: 'success', message: 'Publication published to Community Blog.' });
        } else {
          throw new Error('Publish succeeded but no id was returned.');
        }
      }
      
      setNewPost({ 
        title: '', 
        content: '', 
        author: user?.username || user?.name || '', 
        authorRole: user?.role === UserRole.SUPER_ADMIN ? 'Chief Strategist' : 'Editor', 
        category: 'Grants', 
        image: '',
        tags: [],
        sourceName: '',
        sourceUrl: '',
        views: undefined,
        likes: undefined,
        loves: undefined,
        claps: undefined,
        createdAt: undefined
      });
      setIsEditingPost(false);
      // Refresh in the background to keep server-truth fields (commentsCount, updatedAt, etc.) in sync.
      void refreshData();
    } catch (e) {
      const message = e instanceof Error && e.message ? e.message : 'Failed to save post';
      setPostSaveNotice({ kind: 'error', message });
    } finally {
      setIsSavingPost(false);
    }
  };

  useEffect(() => {
    if (!pendingEditPostId) return;
    const found = blogPosts.find(p => String(p.id) === String(pendingEditPostId));
    if (!found) return;
    setActiveTab('blog');
    handleEditBlogPost(found);
    setPendingEditPostId(null);
  }, [pendingEditPostId, blogPosts]);

  const handleEditBlogPost = (post: BlogPost) => {
    // On some mobile Chrome builds, deferred/staged hydration can occasionally
    // result in ReactQuill never receiving the final HTML (appearing "blank").
    // Prefer setting content synchronously for reliability.
    setIsHydratingSelectedPost(true);
    setIsEditingPost(true);

    setNewPost({
      id: post.id,
      title: post.title,
      content: post.content || '',
      author: post.author,
      authorRole: post.authorRole,
      category: post.category,
      image: post.image || '',
      tags: post.tags || [],
      sourceName: post.sourceName || '',
      sourceUrl: post.sourceUrl || '',
      views: post.views,
      likes: post.likes,
      loves: post.loves,
      claps: post.claps,
      createdAt: post.createdAt
    });

    document.getElementById('new-post-form')?.scrollIntoView({ behavior: 'smooth' });
    window.setTimeout(() => setIsHydratingSelectedPost(false), 0);
  };

  const handleAiSmartWrite = async () => {
    if (!newPost.title) {
      alert("Please enter a title first so the AI knows what to write about.");
      return;
    }
    setIsGeneratingAi(true);
    try {
      // In a real app, this calls /api/ai
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: [
            `Title: ${String(newPost.title || '').trim()}`,
            `Category: ${String(newPost.category || '').trim()}`,
            smartWriteInstructions.trim() ? `Writing instructions: ${smartWriteInstructions.trim()}` : '',
            'Write in a direct, practical tone. It may cover any sector (technology, healthcare, agriculture, education, energy, manufacturing, creative economy) when relevant. Do not include raw URLs. Do not write a conclusion section.'
          ].filter(Boolean).join('\n'),
          type: 'blog',
          useSearch: true
        })
      });
      const data = await res.json();
      if (data.content) {
        setNewPost(prev => {
          const next = { ...prev, content: data.content } as any;

          // Auto-fill source fields from the freshest source item.
          const first = Array.isArray(data?.sources) ? data.sources[0] : null;
          const srcTitle = first && typeof first.title === 'string' ? first.title.trim() : '';
          const srcLink = first && typeof first.link === 'string' ? first.link.trim() : '';
          if (srcTitle && !String(next.sourceName || '').trim()) next.sourceName = srcTitle.slice(0, 120);
          if (srcLink && !String(next.sourceUrl || '').trim()) next.sourceUrl = srcLink;

          // Lightweight auto-tags if empty.
          const existing = Array.isArray(next.tags) ? next.tags : [];
          const normalized = new Set(existing.map((t: any) => String(t || '').trim()).filter(Boolean));
          if (normalized.size === 0) {
            const base = `${next.category || ''}, ${next.title || ''}`
              .split(/[,\n]/g)
              .map((t: string) => t.trim())
              .filter(Boolean);
            base.slice(0, 6).forEach((t) => normalized.add(t));

            // Add a couple common topical tags if they appear in the title.
            const tl = String(next.title || '').toLowerCase();
            if (/(grant|fund|funding)/.test(tl)) normalized.add('Funding');
            if (/(loan|credit)/.test(tl)) normalized.add('Loans');
            if (/(cbn|boi|government)/.test(tl)) normalized.add('Policy');
            if (/(strategy|growth|scale)/.test(tl)) normalized.add('Strategy');
            if (/(agric|farm)/.test(tl)) normalized.add('Agribusiness');
            if (/(tech|digital|startup)/.test(tl)) normalized.add('Technology');
          }
          next.tags = Array.from(normalized).slice(0, 10);

          return next;
        });
      }
    } catch (e) {
      console.error("AI Generation failed", e);
      alert("AI Generation failed. Check console for details.");
    } finally {
      setIsGeneratingAi(false);
    }
  };
    const inputClass = "w-full p-2 border border-gray-200 dark:border-gray-800 rounded bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-grantify-gold outline-none";
    const inputClassSmall = "border border-gray-200 dark:border-gray-800 rounded bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-grantify-gold outline-none p-1";

  // Login Screen
  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white dark:bg-gray-900 p-8 rounded shadow-lg border-t-4 border-grantify-green animate-in fade-in slide-in-from-bottom-4 border border-gray-100 dark:border-gray-800">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">Admin Portal</h2>
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
            aria-label={isLoggingIn ? "Logging in..." : "Login"}
          >
            {isLoggingIn ? <Loader2 className="animate-spin" size={20} /> : "Login"}
          </button>
        </form>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="bg-white dark:bg-gray-900 min-h-[600px] rounded shadow-lg overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800">
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Admin Dashboard</h2>
          <span className="text-xs text-gray-400">Logged in as: {user.username || user.name} ({user.role})</span>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 hover:text-red-400">
          <LogOut size={18} /> Logout
        </button>
      </div>

      <div className="flex flex-col md:flex-row h-full flex-grow">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 bg-gray-100 dark:bg-gray-950 p-4 space-y-2 border-r border-gray-200 dark:border-gray-800">
           <button
             type="button"
             onClick={() => {
               setActiveTab('admins');
               window.setTimeout(() => document.getElementById('my-profile')?.scrollIntoView({ behavior: 'smooth' }), 0);
             }}
             className={`w-full flex items-center gap-2 p-3 rounded transition ${activeTab === 'admins' ? 'bg-grantify-green text-white shadow-md' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
             title="Edit your profile"
           >
             <User size={18} /> My Profile
           </button>

           {user.role === UserRole.SUPER_ADMIN && (
             <button
               type="button"
               onClick={() => {
                 setActiveTab('admins');
                 window.setTimeout(() => document.getElementById('manage-admins')?.scrollIntoView({ behavior: 'smooth' }), 0);
               }}
               className={`w-full flex items-center gap-2 p-3 rounded transition ${activeTab === 'admins' ? 'bg-grantify-green text-white shadow-md' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
               title="Manage administrator accounts"
             >
               <Shield size={18} /> Manage Admins
             </button>
           )}

            {[
             {id: 'applications', label: 'Applications'},
             {id: 'testimonials', label: 'Testimonials'},
             {id: 'ads', label: 'Ad Management'},
             {id: 'providers', label: 'Loan Providers'},
             {id: 'sponsored', label: 'Sponsored Listings'},
             {id: 'content', label: 'Page Content'}
           ].map(tab => (
             <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-2 rounded transition ${activeTab === tab.id ? 'bg-grantify-green text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
             >
               {tab.label}
             </button>
           ))}

          {/* Sponsored Listings content loaded when selected */}

           {/* Explicit buttons for reviews and blog with icons */}
           <button 
             onClick={() => setActiveTab('reviews')}
             className={`w-full flex items-center gap-2 p-3 rounded transition ${activeTab === 'reviews' ? 'bg-grantify-green text-white shadow-md' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
           >
             <MessageSquare size={18} /> Provider Reviews
           </button>

           <button 
             onClick={() => setActiveTab('contact')}
             className={`w-full flex items-center gap-2 p-3 rounded transition ${activeTab === 'contact' ? 'bg-grantify-green text-white shadow-md' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
           >
             <Mail size={18} /> Contact Messages
           </button>

           <button 
             onClick={() => setActiveTab('blog')}
             className={`w-full flex items-center gap-2 p-3 rounded transition ${activeTab === 'blog' ? 'bg-grantify-green text-white shadow-md' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
           >
             <BookOpen size={18} /> Community Blog
           </button>

           <button 
             onClick={() => setActiveTab('moderation')}
             className={`w-full flex items-center gap-2 p-3 rounded transition ${activeTab === 'moderation' ? 'bg-grantify-green text-white shadow-md' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
           >
             <Flag size={18} /> Moderation
           </button>

           {/* Super Admin Only Tab */}
           <button
             onClick={() => setActiveTab('admins')}
             className={`w-full text-left px-4 py-2 rounded mt-4 border-t border-gray-300 dark:border-gray-800 pt-4 flex items-center gap-2 transition ${activeTab === 'admins' ? 'bg-grantify-green text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
           >
             <Shield size={16}/> {user.role === UserRole.SUPER_ADMIN ? 'Admins & Profile' : 'My Profile'}
           </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto overflow-x-hidden bg-white dark:bg-gray-900 min-h-[500px] text-gray-900 dark:text-gray-100">
          {isLoading && (
             <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-300">
                <Loader2 className="animate-spin mr-2" /> Loading data...
             </div>
          )}

          {!isLoading && (
            <>
              {/* Contact Messages Tab */}
              {activeTab === 'contact' && (
                <div>
                  <div className="flex items-end justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-xl font-bold">Contact Messages ({contactMessages.length})</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-300">Messages submitted from the public Contact page.</p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          setIsLoading(true);
                          const msgs = await ApiService.getContactMessages(120);
                          setContactMessages(msgs);
                        } catch {
                          alert('Failed to refresh contact messages');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="bg-gray-900 dark:bg-gray-950 text-white px-3 py-2 rounded text-xs font-bold hover:bg-gray-800"
                      title="Refresh"
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="bg-white dark:bg-gray-950 rounded border border-gray-200 dark:border-gray-800 overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                      <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                        <tr>
                          <th className="p-3 text-left">Date</th>
                          <th className="p-3 text-left">From</th>
                          <th className="p-3 text-left">Subject</th>
                          <th className="p-3 text-left">Message</th>
                          <th className="p-3 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {contactMessages.length === 0 ? (
                          <tr>
                            <td className="p-4 text-gray-500" colSpan={5}>No messages yet.</td>
                          </tr>
                        ) : (
                          contactMessages.map((m) => (
                            <tr key={m.id}>
                              <td className="p-3 text-xs text-gray-500 dark:text-gray-300 whitespace-nowrap">
                                {new Date(m.createdAt).toLocaleString()}
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-gray-900 dark:text-gray-100">{m.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-300">{m.email}</div>
                                {m.phone && <div className="text-xs text-gray-400">{m.phone}</div>}
                              </td>
                              <td className="p-3 text-xs font-bold text-gray-800 dark:text-gray-100">{m.subject}</td>
                              <td className="p-3 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{m.message}</td>
                              <td className="p-3 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteContactMessage(String(m.id))}
                                  className="text-red-600 hover:bg-red-100 dark:hover:bg-red-950/30 p-2 rounded"
                                  title="Delete message"
                                  aria-label="Delete message"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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
                      <thead className="bg-gray-50 dark:bg-gray-950">
                        <tr>
                          <th className="p-3 text-left text-xs uppercase text-gray-400 dark:text-gray-500">Name</th>
                          <th className="p-3 text-left text-xs uppercase text-gray-400 dark:text-gray-500">Amount</th>
                          <th className="p-3 text-left text-xs uppercase text-gray-400 dark:text-gray-500">Business/Purpose</th>
                          <th className="p-3 text-left text-xs uppercase text-gray-400 dark:text-gray-500">Matched Body</th>
                          <th className="p-3 text-left text-xs uppercase text-gray-400 dark:text-gray-500">Type & Date</th>
                          <th className="p-3 text-left text-xs uppercase text-gray-400 dark:text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {applications.map(app => (
                          <tr key={app.id}>
                            <td className="p-3">
                              <span className="font-bold block">{app.fullName}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{app.phoneNumber}</span>
                            </td>
                            <td className="p-3 font-mono">{formatNaira(app.amount)}</td>
                            <td className="p-3">
                              <span className="text-xs font-bold text-gray-800 uppercase block">{app.businessType || 'N/A'}</span>
                              <p className="text-[10px] text-gray-400 line-clamp-1">{app.purpose}</p>
                            </td>
                            <td className="p-3">
                              <span className="text-xs bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 font-black px-2 py-0.5 rounded uppercase">
                                {app.matchedNetwork || 'General'}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="text-xs font-bold uppercase">{app.type}</span>
                              <span className="text-[10px] block text-gray-500">{app.dateApplied}</span>
                            </td>
                            <td className="p-3 text-xs space-y-1">
                              <div className="flex flex-wrap gap-1">
                                <button
                                  type="button"
                                  onClick={() => startEditApplication(app)}
                                  className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-[10px] font-bold px-2 py-1 rounded border border-gray-200 dark:border-gray-700"
                                >
                                  <Edit size={10} /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteApplication(app.id)}
                                  className="flex items-center gap-1 bg-red-100 hover:bg-red-200 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-400 text-[10px] font-bold px-2 py-1 rounded border border-red-200 dark:border-red-900/40"
                                >
                                  <Trash2 size={10} /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Editing Application Modal */}
                  {editingApplication && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto text-gray-900 dark:text-gray-100">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <h3 className="text-lg font-bold">Edit Application #{editingApplication.id}</h3>
                            <p className="text-xs text-gray-500">Update status, amount, type, or user information</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingApplication(null)}
                            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Close modal"
                            aria-label="Close modal"
                          >
                            <X size={20} />
                          </button>
                        </div>

                        <form onSubmit={handleSaveApplicationEdits} className="p-6 space-y-6">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1" htmlFor="appForm-fullName">Full Name</label>
                              <input
                                id="appForm-fullName"
                                type="text"
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                                value={appForm.fullName}
                                onChange={(e) => setAppForm(prev => ({ ...prev, fullName: e.target.value }))}
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1" htmlFor="appForm-phoneNumber">Phone Number</label>
                              <input
                                id="appForm-phoneNumber"
                                type="text"
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                                value={appForm.phoneNumber}
                                onChange={(e) => setAppForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                required
                              />
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1" htmlFor="appForm-email">Email</label>
                              <input
                                id="appForm-email"
                                type="email"
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                                value={appForm.email}
                                onChange={(e) => setAppForm(prev => ({ ...prev, email: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1" htmlFor="appForm-country">Country</label>
                              <input
                                id="appForm-country"
                                type="text"
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                                value={appForm.country}
                                onChange={(e) => setAppForm(prev => ({ ...prev, country: e.target.value }))}
                                required
                              />
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1" htmlFor="appForm-amount">Amount</label>
                              <input
                                id="appForm-amount"
                                type="number"
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                                value={appForm.amount}
                                onChange={(e) => setAppForm(prev => ({ ...prev, amount: e.target.value }))}
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1" htmlFor="appForm-businessType">Business Type</label>
                              <input
                                id="appForm-businessType"
                                type="text"
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                                value={appForm.businessType}
                                onChange={(e) => setAppForm(prev => ({ ...prev, businessType: e.target.value }))}
                              />
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1" htmlFor="appForm-repaymentAmount">Repayment Amount (Optional)</label>
                              <input
                                id="appForm-repaymentAmount"
                                type="number"
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                                value={appForm.repaymentAmount}
                                onChange={(e) => setAppForm(prev => ({ ...prev, repaymentAmount: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1" htmlFor="appForm-durationMonths">Duration (Months - Optional)</label>
                              <input
                                id="appForm-durationMonths"
                                type="number"
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                                value={appForm.durationMonths}
                                onChange={(e) => setAppForm(prev => ({ ...prev, durationMonths: e.target.value }))}
                              />
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1" htmlFor="appForm-matchedNetwork">Matched Network / Body</label>
                              <input
                                id="appForm-matchedNetwork"
                                type="text"
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                                value={appForm.matchedNetwork}
                                onChange={(e) => setAppForm(prev => ({ ...prev, matchedNetwork: e.target.value }))}
                                placeholder="General"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1" htmlFor="appForm-referralCode">Referral Code</label>
                              <input
                                id="appForm-referralCode"
                                type="text"
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                                value={appForm.referralCode}
                                onChange={(e) => setAppForm(prev => ({ ...prev, referralCode: e.target.value }))}
                              />
                            </div>
                          </div>

                          <div className="grid md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1" htmlFor="appForm-status">Status</label>
                              <select
                                id="appForm-status"
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                                value={appForm.status}
                                onChange={(e) => setAppForm(prev => ({ ...prev, status: e.target.value }))}
                                required
                              >
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                                <option value="Processing">Processing</option>
                                <option value="Grant Matched">Grant Matched</option>
                                <option value="Verified">Verified</option>
                                <option value="Disbursed">Disbursed</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1" htmlFor="appForm-type">Application Type</label>
                              <select
                                id="appForm-type"
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                                value={appForm.type}
                                onChange={(e) => setAppForm(prev => ({ ...prev, type: e.target.value }))}
                                required
                              >
                                <option value="Standard">Standard</option>
                                <option value="Fast-Track">Fast-Track</option>
                                <option value="Grant Recommendation">Grant Recommendation</option>
                                <option value="Business Loan">Business Loan</option>
                                <option value="Fast-Track Verification">Fast-Track Verification</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1" htmlFor="appForm-dateApplied">Date Applied</label>
                              <input
                                id="appForm-dateApplied"
                                type="date"
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                                value={appForm.dateApplied}
                                onChange={(e) => setAppForm(prev => ({ ...prev, dateApplied: e.target.value }))}
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1" htmlFor="appForm-purpose">Purpose</label>
                            <textarea
                              id="appForm-purpose"
                              className="w-full min-h-[80px] rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                              value={appForm.purpose}
                              onChange={(e) => setAppForm(prev => ({ ...prev, purpose: e.target.value }))}
                              required
                            />
                          </div>

                          <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                            <button
                              type="button"
                              onClick={() => setEditingApplication(null)}
                              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSaving}
                              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition flex items-center gap-2"
                            >
                              {isSaving ? <Loader2 className="animate-spin" size={16} /> : 'Save Changes'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
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
                      className={`flex items-center gap-2 px-4 py-2 rounded font-bold shadow-sm transition-all ${hasUnsavedAds ? 'bg-grantify-green text-white hover:bg-green-800' : 'bg-gray-300 text-gray-400 cursor-not-allowed'}`}
                    >
                      <Save size={18} /> {isSaving ? 'Saving...' : 'Save Changes'}
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
                            className="w-full border border-gray-300 p-3 rounded font-mono text-xs h-32 bg-white text-gray-900 focus:ring-2 focus:ring-grantify-green outline-none shadow-inner"
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
                      
                      <div className="flex justify-end pt-2">
                        <button 
                          onClick={handleSaveAds} 
                          disabled={!hasUnsavedAds || isSaving}
                          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold shadow-md transition-all ${hasUnsavedAds ? 'bg-grantify-green text-white hover:bg-green-800' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                        >
                          <Save size={18} /> {isSaving ? 'Saving...' : 'Save All Ad Settings'}
                        </button>
                      </div>

                      <p className="text-[10px] text-gray-400">
                        Leave the Link field empty to hide the button. Text changes are applied instantly after saving.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Content Tab */}
              {activeTab === 'content' && repayment && whatsappConfig && (
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

                  {/* WhatsApp Floating Button Settings */}
                  <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold">Floating WhatsApp Button Configuration</h3>
                      <button 
                        onClick={handleSaveWhatsapp} 
                        disabled={!hasUnsavedWhatsapp || isSaving}
                        className={`flex items-center gap-2 px-3 py-1 rounded text-sm ${hasUnsavedWhatsapp ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                      >
                        <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                    {hasUnsavedWhatsapp && (
                      <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                        You have unsaved changes. Click "Save Changes" to sync with the database.
                      </div>
                    )}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <input
                          type="checkbox"
                          id="whatsapp-enabled"
                          checked={whatsappConfig.isEnabled}
                          onChange={(e) => handleWhatsappUpdateLocal({...whatsappConfig, isEnabled: e.target.checked})}
                          className="w-4 h-4 text-grantify-green border-gray-300 rounded focus:ring-grantify-green"
                        />
                        <label htmlFor="whatsapp-enabled" className="text-sm font-medium select-none">
                          Enable Floating WhatsApp Button
                        </label>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium">WhatsApp Phone Number</label>
                        <input 
                          type="text"
                          className={inputClass}
                          value={whatsappConfig.phoneNumber}
                          onChange={(e) => handleWhatsappUpdateLocal({...whatsappConfig, phoneNumber: e.target.value})}
                          placeholder="Phone Number (e.g. 2348123456789)"
                          aria-label="WhatsApp Phone Number"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                          Use international format without leading + or 00 (e.g. 2348123456789 for Nigeria).
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium">Button Label Text</label>
                        <input 
                          type="text"
                          className={inputClass}
                          value={whatsappConfig.buttonLabel}
                          onChange={(e) => handleWhatsappUpdateLocal({...whatsappConfig, buttonLabel: e.target.value})}
                          placeholder="Button Label (e.g. Chat with an Expert)"
                          aria-label="Button Label Text"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium">Pre-filled Message Template</label>
                        <textarea 
                          className={inputClass}
                          value={whatsappConfig.preFilledText}
                          onChange={(e) => handleWhatsappUpdateLocal({...whatsappConfig, preFilledText: e.target.value})}
                          placeholder="Pre-filled text message"
                          aria-label="Pre-filled Message Template"
                          rows={3}
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                          This is the message that will automatically appear in the user's chat input box when they click the button.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-lg font-black">Autoblog</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                          This toggle controls whether the daily cron is allowed to publish.
                          The environment gate `AUTOBLOG_ENABLED=true` must also be set.
                        </p>
                        {autoblogUpdatedAt && (
                          <p className="text-[10px] text-gray-400 mt-1">Last changed: {new Date(autoblogUpdatedAt).toLocaleString()}</p>
                        )}
                        {autoblogLastRun && (
                          <p className="text-[10px] text-gray-400 mt-1">
                            Last cron: {autoblogLastRun.created_at ? new Date(autoblogLastRun.created_at).toLocaleString() : 'unknown'}
                            {autoblogLastRun.status ? ` — ${String(autoblogLastRun.status)}` : ''}
                            {` — ${formatCronSource(autoblogLastRun)}`}
                            {autoblogLastRun.reason ? ` (${String(autoblogLastRun.reason)})` : ''}
                          </p>
                        )}
                        {autoblogLastSuccessRun && (
                          <p className="text-[10px] text-gray-400 mt-1">
                            Last success: {autoblogLastSuccessRun.created_at ? new Date(autoblogLastSuccessRun.created_at).toLocaleString() : 'unknown'}
                            {` — ${formatCronSource(autoblogLastSuccessRun)}`}
                            {autoblogLastSuccessRun.detail ? ` — ${String(autoblogLastSuccessRun.detail)}` : ''}
                          </p>
                        )}
                        {autoblogLastErrorRun && (
                          <p className="text-[10px] text-gray-400 mt-1">
                            Last error: {autoblogLastErrorRun.created_at ? new Date(autoblogLastErrorRun.created_at).toLocaleString() : 'unknown'}
                            {` — ${formatCronSource(autoblogLastErrorRun)}`}
                            {autoblogLastErrorRun.detail ? ` — ${String(autoblogLastErrorRun.detail).slice(0, 180)}` : ''}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={handleToggleAutoblog}
                          disabled={isSavingAutoblog}
                          className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-black uppercase border transition ${autoblogEnabled
                            ? 'bg-grantify-green text-white border-green-700 hover:bg-green-800'
                            : 'bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-900'
                          } ${isSavingAutoblog ? 'opacity-60 cursor-not-allowed' : ''}`}
                          aria-label={autoblogEnabled ? 'Disable autoblog' : 'Enable autoblog'}
                          title={autoblogEnabled ? 'Disable autoblog' : 'Enable autoblog'}
                        >
                          {isSavingAutoblog ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                          {autoblogEnabled ? 'Enabled' : 'Disabled'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRunDailyCron(true)}
                          disabled={isRunningDailyCron}
                          className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-black uppercase border transition ${isRunningDailyCron
                            ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-700'
                            : 'bg-gray-900 dark:bg-gray-950 text-white border-gray-900 dark:border-gray-700 hover:bg-gray-800'}
                          `}
                          aria-label="Run daily autoblog now (force)"
                          title="Run daily autoblog now (force)"
                        >
                          {isRunningDailyCron ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                          Run Now (Force)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sponsored Listings Tab */}
              {activeTab === 'sponsored' && (
                <div className="space-y-8">
                  {/* Pricing Tiers Management */}
                  <div className="bg-gray-50 dark:bg-gray-950 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <Zap size={18} className="text-grantify-gold" /> Sponsored Pricing Tiers & Max Slots
                    </h3>
                    <p className="text-xs text-gray-500 mb-6">
                      Configure capacity constraints for sponsored slots. Setting max slots to blank/empty allows unlimited listings.
                    </p>
                    <div className="grid md:grid-cols-3 gap-4">
                      {sponsoredPricing.map(tier => {
                        return (
                          <div key={tier.id} className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
                            <div>
                              <div className="font-bold text-gray-900 dark:text-gray-100">{tier.tierName}</div>
                              <div className="text-lg font-black mt-1 text-gray-900 dark:text-gray-100">{(tier.priceCents / 100).toLocaleString(undefined, { style: 'currency', currency: 'NGN' })}</div>
                              <p className="text-xs text-gray-500 mt-1">{tier.description}</p>
                              <div className="text-xs text-gray-400 mt-1">Duration: {tier.durationDays} Days</div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Max Slots Capacity</label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  placeholder="Unlimited"
                                  className="w-full rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                                  defaultValue={tier.maxSlots !== null ? tier.maxSlots : ''}
                                  id={`slots-input-${tier.id}`}
                                  aria-label="Max Slots capacity"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const val = (document.getElementById(`slots-input-${tier.id}`) as HTMLInputElement)?.value;
                                    const slots = val.trim() === '' ? null : Number(val);
                                    handleUpdateSlots(tier.id, slots);
                                  }}
                                  className="bg-gray-900 text-white dark:bg-gray-800 hover:bg-grantify-green px-2 py-1 rounded text-xs transition"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active & Pending Sponsored Listings */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Sponsored Listings Requests ({sponsoredListingsAdmin.length})</h3>
                        <p className="text-xs text-gray-500">Manage campaign schedules, invoice records, payment states, and manual approvals.</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadCSV}
                          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-xs px-3 py-2 rounded-lg transition"
                        >
                          <Download size={14} /> Export CSV
                        </button>
                        <button
                          type="button"
                          onClick={loadSponsored}
                          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs px-3 py-2 rounded-lg transition text-gray-800 dark:text-gray-100"
                        >
                          Refresh Data
                        </button>
                      </div>
                    </div>

                    {isLoadingSponsored ? (
                      <div className="flex items-center justify-center py-12 text-gray-400">
                        <Loader2 className="animate-spin mr-2" /> Loading listings...
                      </div>
                    ) : sponsoredListingsAdmin.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 border border-dashed border-gray-100 dark:border-gray-800 rounded-xl">
                        No sponsored bookings found.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border-collapse">
                          <thead className="bg-gray-50 dark:bg-gray-950">
                            <tr>
                              <th className="p-3 text-left font-bold text-gray-700 dark:text-gray-200">ID / Info</th>
                              <th className="p-3 text-left font-bold text-gray-700 dark:text-gray-200">Provider & Website</th>
                              <th className="p-3 text-left font-bold text-gray-700 dark:text-gray-200">Tier / Price</th>
                              <th className="p-3 text-left font-bold text-gray-700 dark:text-gray-200">Payer Details</th>
                              <th className="p-3 text-left font-bold text-gray-700 dark:text-gray-200">Performance</th>
                              <th className="p-3 text-left font-bold text-gray-700 dark:text-gray-200">Status & Schedule</th>
                              <th className="p-3 text-left font-bold text-gray-700 dark:text-gray-200">Invoicing</th>
                              <th className="p-3 text-left font-bold text-gray-700 dark:text-gray-200">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {sponsoredListingsAdmin.map((listing: any) => {
                              const isPaid = listing.payment_status === 'paid';
                              const isActive = listing.start_at && listing.end_at && new Date(listing.start_at) <= new Date() && new Date(listing.end_at) >= new Date();
                              
                              return (
                                <tr key={listing.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-950/40">
                                  <td className="p-3 font-mono text-xs text-gray-800 dark:text-gray-200">
                                    #{listing.id}
                                    <div className="text-[10px] text-gray-400 mt-1">
                                      Created:<br/>{new Date(listing.created_at).toLocaleDateString()}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-gray-900 dark:text-gray-100">{listing.provider_name || `ID: ${listing.provider_id}`}</span>
                                      {!listing.provider_id && (
                                        <span className="inline-block bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900">Custom</span>
                                      )}
                                    </div>
                                    {listing.provider_website && (
                                      <a href={listing.provider_website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-0.5 mt-1 hover:underline">
                                        Website <ExternalLink size={10} />
                                      </a>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <span className="inline-block bg-grantify-gold/10 text-grantify-gold text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-grantify-gold/25">
                                      {listing.tier_name || 'Tier'}
                                    </span>
                                    <div className="font-bold mt-1 text-xs text-gray-900 dark:text-gray-100">
                                      {(listing.amount_cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'NGN' })}
                                    </div>
                                    <div className="text-[10px] text-gray-400">{listing.duration_days} days</div>
                                  </td>
                                  <td className="p-3 text-xs leading-relaxed text-gray-800 dark:text-gray-200">
                                    <div><strong>{listing.payer_name}</strong></div>
                                    <div className="text-gray-500">{listing.payer_email}</div>
                                    {listing.payer_company && <div className="text-[10px] text-gray-400">Co: {listing.payer_company}</div>}
                                    {listing.campaign_note && (
                                      <div className="mt-1 text-[10px] bg-gray-50 dark:bg-gray-950 p-1.5 rounded text-gray-600 dark:text-gray-400 max-w-xs break-words">
                                        Note: {listing.campaign_note}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 text-xs leading-relaxed text-gray-800 dark:text-gray-200">
                                    <div>Clicks: <span className="font-bold text-gray-950 dark:text-gray-50">{listing.clicks || 0}</span></div>
                                    <div>Leads: <span className="font-bold text-gray-950 dark:text-gray-50">{listing.conversions || 0}</span></div>
                                    <div className="text-[10px] text-gray-400">CTR: {listing.clicks ? ((listing.conversions || 0) / listing.clicks * 100).toFixed(1) + '%' : '0.0%'}</div>
                                  </td>
                                  <td className="p-3 text-xs text-gray-800 dark:text-gray-200">
                                    <div className="mb-1.5">
                                      {isPaid ? (
                                        <span className="bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 text-[10px] font-bold px-2 py-0.5 rounded border border-green-200 dark:border-green-900">Paid ({listing.payment_provider})</span>
                                      ) : (
                                        <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-200 dark:border-yellow-900">Pending Paid</span>
                                      )}
                                      
                                      {isPaid && (
                                        <div className="mt-1">
                                          {isActive ? (
                                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">Active Listing</span>
                                          ) : (
                                            <span className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded">Scheduled / Expired</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-gray-500 leading-tight space-y-0.5">
                                      <div>Start: {listing.start_at ? new Date(listing.start_at).toLocaleDateString() : 'Not Set'}</div>
                                      <div>End: {listing.end_at ? new Date(listing.end_at).toLocaleDateString() : 'Not Set'}</div>
                                    </div>
                                    {listing.admin_note && <div className="text-[10px] text-red-600 mt-1">Admin note: {listing.admin_note}</div>}
                                  </td>
                                  <td className="p-3 text-xs text-gray-800 dark:text-gray-200">
                                    {listing.invoice_number ? (
                                      <div className="space-y-1">
                                        <div className="font-bold">Inv: #{listing.invoice_number}</div>
                                        {listing.offline_payment_method && <div className="text-[10px] text-gray-400">Via: {listing.offline_payment_method}</div>}
                                        {listing.invoice_due_date && (
                                          <div className="text-[10px] text-gray-400">
                                            Due: {new Date(listing.invoice_due_date).toLocaleDateString()}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 italic">No Invoice generated</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-xs space-y-1.5">
                                    <div className="flex flex-wrap gap-1">
                                      {!isPaid && (
                                        <button
                                          type="button"
                                          onClick={() => handleMarkPaid(listing.id)}
                                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm"
                                        >
                                          <Check size={10} /> Mark Paid
                                        </button>
                                      )}
                                      
                                      {isPaid && !listing.start_at && (
                                        <button
                                          type="button"
                                          onClick={() => handlePublishNow(listing.id)}
                                          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm"
                                        >
                                          <Zap size={10} /> Publish Now
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => startEditListing(listing)}
                                        className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-[10px] font-bold px-2 py-1 rounded border border-gray-200 dark:border-gray-700"
                                      >
                                        <Edit size={10} /> Edit Schedule & Invoice
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleSendInvoice(listing)}
                                        className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-[10px] font-bold px-2 py-1 rounded border border-gray-200 dark:border-gray-700"
                                      >
                                        <FileText size={10} /> Send Invoice Email
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Testimonials Management */}
                  <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-6">
                    {/* Add Testimonial */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <Plus size={18} className="text-grantify-green" /> Add Sponsor Testimonial
                      </h3>
                      <form onSubmit={handleAddSponsorTestimonial} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Author Name / Role</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Kola Adegoke, CEO of OPay Nigeria"
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                            value={newTestimonial.author}
                            onChange={(e) => setNewTestimonial(prev => ({ ...prev, author: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Provider Link (Optional)</label>
                          <select
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                            value={newTestimonial.providerId}
                            onChange={(e) => setNewTestimonial(prev => ({ ...prev, providerId: e.target.value }))}
                            title="Sponsor provider link"
                          >
                            <option value="">No provider linkage</option>
                            {loanProviders.map(provider => (
                              <option key={provider.id} value={provider.id}>{provider.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Quote / Content</label>
                          <textarea
                            required
                            placeholder="What did they say about advertising with Grantify?"
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100 min-h-[100px]"
                            value={newTestimonial.quote}
                            onChange={(e) => setNewTestimonial(prev => ({ ...prev, quote: e.target.value }))}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isSavingSponsored}
                          className="w-full bg-grantify-green text-white font-black py-3 rounded-xl hover:bg-green-700 transition flex items-center justify-center gap-2"
                        >
                          {isSavingSponsored ? <Loader2 className="animate-spin" size={16} /> : <><Check size={16} /> Add Testimonial</>}
                        </button>
                      </form>
                    </div>

                    {/* Testimonials List */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <MessageSquare size={18} className="text-grantify-gold" /> Active Testimonials ({sponsorTestimonialsAdmin.length})
                      </h3>
                      <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                        {sponsorTestimonialsAdmin.length === 0 ? (
                          <div className="text-center py-12 text-gray-500 italic">No testimonials added yet.</div>
                        ) : (
                          sponsorTestimonialsAdmin.map(t => {
                            const linkProvider = loanProviders.find(p => p.id === t.providerId || p.id === t.provider_id);
                            return (
                              <div key={t.id} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4 relative group">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSponsorTestimonial(t.id)}
                                  className="absolute top-4 right-4 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition animate-fade-in"
                                  title="Delete Testimonial"
                                >
                                  <Trash2 size={16} />
                                </button>
                                <div className="font-bold text-sm text-gray-900 dark:text-gray-100">{t.author || t.name}</div>
                                {linkProvider && (
                                  <div className="text-[10px] text-grantify-gold font-bold mt-0.5">Linked: {linkProvider.name}</div>
                                )}
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed italic">
                                  "{t.quote || t.content}"
                                </p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Editing Listing Schedule & Invoice Modal */}
                  {editingListing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto text-gray-900 dark:text-gray-100">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <h3 className="text-lg font-bold">Edit Sponsorship #{editingListing.id}</h3>
                            <p className="text-xs text-gray-500">{editingListing.provider_name || 'Provider placement details'}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingListing(null)}
                            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Close modal"
                            aria-label="Close modal"
                          >
                            <X size={20} />
                          </button>
                        </div>

                        <form onSubmit={handleSaveListingEdits} className="p-6 space-y-6">
                          {/* Dates Schedule */}
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Campaign Start Date</label>
                              <input
                                type="date"
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                                value={invoiceForm.startAt}
                                onChange={(e) => setInvoiceForm(prev => ({ ...prev, startAt: e.target.value }))}
                                title="Campaign Start Date"
                                placeholder="YYYY-MM-DD"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Campaign End Date</label>
                              <input
                                type="date"
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                                value={invoiceForm.endAt}
                                onChange={(e) => setInvoiceForm(prev => ({ ...prev, endAt: e.target.value }))}
                                title="Campaign End Date"
                                placeholder="YYYY-MM-DD"
                              />
                            </div>
                          </div>

                          {/* Invoice Numbers & Payment Method */}
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Invoice Number</label>
                              <input
                                type="text"
                                placeholder="e.g. INV-2026-001"
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                                value={invoiceForm.invoiceNumber}
                                onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Offline Payment Method (if applicable)</label>
                              <input
                                type="text"
                                placeholder="e.g. Bank Transfer, Cheque, OPay Direct"
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                                value={invoiceForm.offlinePaymentMethod}
                                onChange={(e) => setInvoiceForm(prev => ({ ...prev, offlinePaymentMethod: e.target.value }))}
                              />
                            </div>
                          </div>

                          {/* Invoice Dates */}
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Invoice Issued At</label>
                              <input
                                type="date"
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                                value={invoiceForm.invoiceIssuedAt}
                                onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoiceIssuedAt: e.target.value }))}
                                title="Invoice Issued At Date"
                                placeholder="YYYY-MM-DD"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Invoice Due Date</label>
                              <input
                                type="date"
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm text-gray-900 dark:text-gray-100"
                                value={invoiceForm.invoiceDueDate}
                                onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoiceDueDate: e.target.value }))}
                                title="Invoice Due Date"
                                placeholder="YYYY-MM-DD"
                              />
                            </div>
                          </div>

                          {/* Billing Info JSON or text */}
                          <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Billing Address & Info (JSON format recommended)</label>
                            <textarea
                              placeholder='e.g. {"companyName": "OPay Ltd", "address": "Lagos, Nigeria"}'
                              className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm font-mono min-h-[100px] text-gray-900 dark:text-gray-100"
                              value={invoiceForm.billingInfo}
                              onChange={(e) => setInvoiceForm(prev => ({ ...prev, billingInfo: e.target.value }))}
                            />
                          </div>

                          {/* Admin note */}
                          <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Admin Note / internal remarks</label>
                            <textarea
                              placeholder="Notes visible only to admin team"
                              className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm min-h-[80px] text-gray-900 dark:text-gray-100"
                              value={invoiceForm.adminNote}
                              onChange={(e) => setInvoiceForm(prev => ({ ...prev, adminNote: e.target.value }))}
                            />
                          </div>

                          {/* Actions */}
                          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <button
                              type="button"
                              onClick={() => setEditingListing(null)}
                              className="px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-750 dark:text-gray-200 font-bold hover:bg-gray-50 dark:hover:bg-gray-950 transition"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSavingSponsored}
                              className="px-5 py-3 rounded-xl bg-grantify-green text-white font-black hover:bg-green-700 transition flex items-center gap-2"
                            >
                              {isSavingSponsored ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Save Changes</>}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
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

                  {loanProviderSubmissions.length > 0 && (
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
                        <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                          {loanProviderSubmissions.length}
                        </span>
                        Pending User Submissions
                      </h4>

                      <div className="space-y-3">
                        {loanProviderSubmissions.map((s) => (
                          <div key={s.id} className="bg-white dark:bg-gray-950 p-3 rounded border border-yellow-300 dark:border-yellow-900 flex flex-col gap-3">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                              <div className="flex-grow">
                                <div className="font-black text-sm text-gray-900 dark:text-gray-100">{s.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-300 break-all">{s.website}</div>
                                <div className="text-[10px] text-gray-400 dark:text-gray-400 mt-1">
                                  {new Date(s.createdAt).toLocaleString()}
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  onClick={() => handleApproveProviderSubmission(s)}
                                  className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                                  title="Add to providers list (then Save Changes)"
                                >
                                  Approve & Add
                                </button>
                                <button
                                  onClick={() => handleRejectProviderSubmission(s.id)}
                                  className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-3 text-xs">
                              <div>
                                <div className="text-[10px] uppercase text-gray-400">Loan Range</div>
                                <div className="font-bold text-gray-700 dark:text-gray-200">{s.loanRange || '—'}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase text-gray-400">Interest</div>
                                <div className="font-bold text-gray-700 dark:text-gray-200">{s.interestRange || '—'}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase text-gray-400">Tenure</div>
                                <div className="font-bold text-gray-700 dark:text-gray-200">{s.tenure || '—'}</div>
                              </div>
                            </div>

                            <div className="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{s.description}</div>
                            {(s.requirements || s.playStoreUrl || s.tag || s.logo) && (
                              <div className="text-[11px] text-gray-600 dark:text-gray-300 space-y-1">
                                {s.requirements && <div><span className="font-bold">Requirements:</span> {s.requirements}</div>}
                                {s.playStoreUrl && <div className="break-all"><span className="font-bold">Play Store:</span> {s.playStoreUrl}</div>}
                                {s.tag && <div><span className="font-bold">Tag:</span> {s.tag}</div>}
                                {s.logo && <div className="break-all"><span className="font-bold">Logo:</span> {s.logo}</div>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
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

                        <div className="mt-4">
                             <label className="text-[10px] text-gray-500 uppercase block mb-1">Logo URL (Optional)</label>
                             <input 
                               className={inputClassSmall + " w-full"}
                               value={p.logo || ''}
                               onChange={(e) => handleUpdateProviderLocal(p.id!, 'logo', e.target.value)}
                               placeholder="https://example.com/logo.png"
                               aria-label="Logo URL"
                             />
                        </div>

                        {/* New Fields */}
                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase block mb-1">Tag (e.g. "Fastest")</label>
                            <input 
                              className={inputClassSmall + " w-full"}
                              value={p.tag || ''}
                              onChange={(e) => handleUpdateProviderLocal(p.id!, 'tag', e.target.value)}
                              placeholder="Fastest"
                              aria-label="Tag"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase block mb-1">Rating (1-5)</label>
                            <input 
                              type="number"
                              step="0.1"
                              min="1"
                              max="5"
                              className={inputClassSmall + " w-full"}
                              value={p.rating || 0}
                              onChange={(e) => handleUpdateProviderLocal(p.id!, 'rating', parseFloat(e.target.value))}
                              placeholder="4.5"
                              aria-label="Rating"
                            />
                          </div>
                          <div className="flex items-center gap-2 pt-4">
                            <input 
                              type="checkbox"
                              id={`rec-${p.id}`}
                              className="w-4 h-4 text-grantify-green focus:ring-grantify-green"
                              checked={p.isRecommended || false}
                              onChange={(e) => handleUpdateProviderLocal(p.id!, 'isRecommended', e.target.checked)}
                            />
                            <label htmlFor={`rec-${p.id}`} className="text-xs font-bold text-gray-600 uppercase">Recommended Provider</label>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase block mb-1">Requirements (NIN, ID...)</label>
                            <input 
                              className={inputClassSmall + " w-full"}
                              value={p.requirements || ''}
                              onChange={(e) => handleUpdateProviderLocal(p.id!, 'requirements', e.target.value)}
                              placeholder="NIN, BVN, Valid ID"
                              aria-label="Requirements"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase block mb-1">Play Store URL</label>
                            <input 
                              className={inputClassSmall + " w-full"}
                              value={p.playStoreUrl || ''}
                              onChange={(e) => handleUpdateProviderLocal(p.id!, 'playStoreUrl', e.target.value)}
                              placeholder="https://play.google.com/..."
                              aria-label="Play Store URL"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Provider Reviews Tab */}
              {activeTab === 'reviews' && (
                <div>
                   <div className="flex items-end justify-between gap-4 mb-4">
                     <h3 className="text-xl font-bold">Provider Reviews & Comments ({allReviews.length})</h3>
                     <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-200 select-none">
                       <input
                         type="checkbox"
                         className="w-4 h-4"
                         checked={includeHiddenReviews}
                         onChange={(e) => setIncludeHiddenReviews(e.target.checked)}
                       />
                       Show hidden
                     </label>
                   </div>
                   <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-950">
                        <tr>
                          <th className="p-2 text-left text-gray-700 dark:text-gray-200">Provider</th>
                          <th className="p-2 text-left text-gray-700 dark:text-gray-200">User</th>
                          <th className="p-2 text-left text-gray-700 dark:text-gray-200">Rating</th>
                          <th className="p-2 text-left text-gray-700 dark:text-gray-200">Content</th>
                          <th className="p-2 text-left text-gray-700 dark:text-gray-200">Date</th>
                          <th className="p-2 text-left text-gray-700 dark:text-gray-200">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
                        {allReviews.map(review => {
                          const provider = loanProviders.find(p => p.id === review.providerId);
                          return (
                            <tr key={review.id} className={review.parentId ? 'bg-gray-50/50 dark:bg-gray-950' : ''}>
                              <td className="p-2 font-bold">{provider?.name || 'Unknown'}</td>
                              <td className="p-2">
                                {review.name}
                                {review.parentId && <span className="ml-2 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-200 text-[10px] px-1 rounded border border-blue-200 dark:border-blue-900">Reply</span>}
                                {review.isHidden && <span className="ml-2 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-200 text-[10px] px-1 rounded border border-red-200 dark:border-red-900">Hidden</span>}
                              </td>
                              <td className="p-2">{review.rating > 0 ? `${review.rating} ⭐` : '-'}</td>
                              <td className="p-2 max-w-xs truncate" title={review.content}>{review.content}</td>
                              <td className="p-2 text-gray-500 dark:text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</td>
                              <td className="p-2">
                                <button 
                                  onClick={() => handleDeleteReview(review.id)} 
                                  className="text-red-500 hover:text-red-700"
                                  title="Delete Review"
                                  aria-label="Delete Review"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Moderation Inbox Tab */}
              {activeTab === 'moderation' && (
                <div>
                  <div className="flex items-end justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-xl font-bold">Moderation Inbox ({flagsInbox.length})</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-300">User reports from comments and reviews (registration-free).</p>
                    </div>
                    <button
                      onClick={refreshFlagsInbox}
                      className="bg-gray-900 dark:bg-gray-950 text-white px-3 py-2 rounded text-xs font-bold hover:bg-gray-800"
                      title="Refresh"
                    >
                      Refresh
                    </button>
                  </div>

                  {flagsInbox.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-300">No open reports.</div>
                  ) : (
                    <div className="bg-white dark:bg-gray-950 rounded border border-gray-200 dark:border-gray-800 overflow-x-auto">
                      <table className="w-full text-sm min-w-[900px]">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                          <tr>
                            <th className="p-2 text-left text-gray-700 dark:text-gray-200">Type</th>
                            <th className="p-2 text-left text-gray-700 dark:text-gray-200">Context</th>
                            <th className="p-2 text-left text-gray-700 dark:text-gray-200">Reason</th>
                            <th className="p-2 text-left text-gray-700 dark:text-gray-200">Snippet</th>
                            <th className="p-2 text-left text-gray-700 dark:text-gray-200">Date</th>
                            <th className="p-2 text-left text-gray-700 dark:text-gray-200">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {flagsInbox.map(f => {
                            const entityKey = `${f.entityType}:${f.entityId}`;
                            const entity = flagEntities?.[entityKey];
                            const context = f.entityType === 'blog_comment'
                              ? (entity?.postTitle ? `Blog: ${entity.postTitle}` : (entity?.postId ? `Blog post: ${entity.postId}` : 'Blog comment'))
                              : (entity?.providerName ? `Provider: ${entity.providerName}` : (entity?.providerId ? `Provider: ${entity.providerId}` : 'Provider review'));
                            const snippet = String(entity?.content || '').slice(0, 140);

                            return (
                              <tr key={f.id}>
                                <td className="p-2 font-bold">
                                  {f.entityType === 'blog_comment' ? 'Blog comment' : 'Provider review'}
                                </td>
                                <td className="p-2 text-gray-700 dark:text-gray-200">{context}</td>
                                <td className="p-2 text-gray-700 dark:text-gray-200">{f.reason}</td>
                                <td className="p-2 max-w-[420px] truncate" title={String(entity?.content || '') || ''}>
                                  {snippet || '—'}
                                </td>
                                <td className="p-2 text-gray-500 dark:text-gray-400">{new Date(f.createdAt).toLocaleString()}</td>
                                <td className="p-2">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          await ApiService.setHidden({ entityType: f.entityType, entityId: f.entityId, hidden: true });
                                          await ApiService.resolveFlag(f.id);
                                          await refreshFlagsInbox();
                                        } catch {
                                          alert('Failed to hide and resolve');
                                        }
                                      }}
                                      className="px-2 py-1 rounded text-xs font-bold bg-red-600 text-white hover:bg-red-700"
                                      title="Hide content and resolve flag"
                                    >
                                      Hide
                                    </button>

                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          await ApiService.setHidden({ entityType: f.entityType, entityId: f.entityId, hidden: false });
                                          await refreshFlagsInbox();
                                        } catch {
                                          alert('Failed to unhide');
                                        }
                                      }}
                                      className="px-2 py-1 rounded text-xs font-bold bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-700"
                                      title="Unhide content"
                                    >
                                      Unhide
                                    </button>

                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          await ApiService.resolveFlag(f.id);
                                          await refreshFlagsInbox();
                                        } catch {
                                          alert('Failed to resolve');
                                        }
                                      }}
                                      className="px-2 py-1 rounded text-xs font-bold bg-grantify-green text-white hover:bg-green-800"
                                      title="Resolve flag without hiding"
                                    >
                                      Resolve
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {/* Blog Management Tab */}
              {activeTab === 'blog' && (
                <div className="max-w-6xl mx-auto">
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold">Community Blog Posts</h3>
                      <button 
                        onClick={() => {
                          const form = document.getElementById('new-post-form');
                          form?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="bg-grantify-green text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2"
                      >
                        <Plus size={16} /> New Post
                      </button>
                   </div>

                    {/* Add New/Edit Post Form */}
                    <div id="new-post-form" className={`p-6 rounded-xl border mb-8 transition-all ${isEditingPost ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 shadow-md' : 'bg-gray-100 dark:bg-gray-950 border-gray-200 dark:border-gray-800'}`}>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold flex items-center gap-2 text-gray-700 dark:text-gray-100">
                          {isEditingPost ? <Zap className="text-blue-600 animate-pulse" size={18} /> : null}
                          {isEditingPost ? 'Editing Article' : 'Add New Article'}
                        </h4>
                        {isEditingPost && (
                          <button 
                            onClick={() => {
                              setIsEditingPost(false);
                              setNewPost({ 
                                title: '', content: '', author: user?.username || user?.name || '', 
                                authorRole: user?.role === UserRole.SUPER_ADMIN ? 'Chief Strategist' : 'Editor', 
                                category: 'Grants', image: '', tags: [], sourceName: '', sourceUrl: '' 
                              });
                            }}
                            className="text-xs text-blue-600 font-bold hover:underline"
                          >
                            Cancel Edit
                          </button>
                        )}
                      </div>

                      {postSaveNotice && (
                        postSaveNotice.kind === 'error' ? (
                          <div
                            className={`mb-4 p-3 rounded border text-sm ${
                              'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200'
                            }`}
                            role="alert"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="leading-relaxed">{postSaveNotice.message}</div>
                              <button
                                type="button"
                                onClick={() => setPostSaveNotice(null)}
                                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
                                aria-label="Dismiss message"
                                title="Dismiss"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`mb-4 p-3 rounded border text-sm ${
                              'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900 text-green-800 dark:text-green-200'
                            }`}
                            role="status"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="leading-relaxed">{postSaveNotice.message}</div>
                              <button
                                type="button"
                                onClick={() => setPostSaveNotice(null)}
                                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
                                aria-label="Dismiss message"
                                title="Dismiss"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        )
                      )}
                      
                      <form onSubmit={handleAddBlogPost} className="grid md:grid-cols-2 gap-4">
                         <div className="md:col-span-2 flex flex-col md:flex-row gap-3">
                           <input className={inputClassSmall + " flex-grow"} placeholder="Title" value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} required />
                           <div className="flex gap-2 min-w-fit">
                             <button 
                               type="button"
                               onClick={handleAiSmartWrite}
                               disabled={isGeneratingAi}
                               className="bg-purple-600 text-white px-3 py-2 rounded text-xs font-bold flex items-center gap-2 hover:bg-purple-700 transition"
                             >
                               {isGeneratingAi ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                               Smart Write
                             </button>
                           </div>
                         </div>

                         <div className="md:col-span-2">
                           <textarea
                             className={inputClassSmall + " w-full min-h-[64px]"}
                             placeholder="Writing instructions (optional): tone, personality, story angle, who it's for…"
                             value={smartWriteInstructions}
                             onChange={(e) => setSmartWriteInstructions(e.target.value)}
                           />
                         </div>
                         
                         <input
                           className={inputClassSmall}
                           placeholder="Author"
                           value={newPost.author}
                             onChange={e => setNewPost({ ...newPost, author: e.target.value })}
                           aria-label="Author"
                             title="Author shown on the post"
                         />

                           <input
                             className={inputClassSmall}
                             placeholder="Author role"
                             value={newPost.authorRole}
                             onChange={e => setNewPost({ ...newPost, authorRole: e.target.value })}
                             aria-label="Author role"
                             title="Author role shown on the post"
                             list="author-role-options"
                           />

                           <datalist id="author-role-options">
                             <option value="Chief Strategist" />
                             <option value="Editor" />
                             <option value="Contributor" />
                             <option value="Team Member" />
                           </datalist>
                         
                         <select 
                           className={inputClassSmall} 
                           value={newPost.category} 
                           onChange={e => setNewPost({...newPost, category: e.target.value})}
                           aria-label="Article Category"
                         >
                           {categoryOptions.map(opt => (
                             <option key={opt} value={opt}>{opt}</option>
                           ))}
                         </select>
                         
                         <input 
                           className={inputClassSmall} 
                           placeholder="Tags (comma separated)" 
                           value={(newPost.tags || []).join(', ')} 
                           onChange={e => {
                             const next = e.target.value
                               .split(',')
                               .map(t => t.trim())
                               .filter(Boolean);
                             const deduped = Array.from(new Set(next)).slice(0, 10);
                             setNewPost({ ...newPost, tags: deduped });
                           }}
                         />
                         
                         <input className={inputClassSmall} placeholder="Source Name (Optional)" value={newPost.sourceName} onChange={e => setNewPost({...newPost, sourceName: e.target.value})} />
                         <input className={inputClassSmall} placeholder="Source URL (Optional)" value={newPost.sourceUrl} onChange={e => setNewPost({...newPost, sourceUrl: e.target.value})} />

                         <input
                           type="datetime-local"
                           className={inputClassSmall}
                           value={newPost.createdAt ? new Date(newPost.createdAt).toISOString().slice(0, 16) : ''}
                           onChange={e => setNewPost({ ...newPost, createdAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                           aria-label="Publish date"
                           title="Publish date"
                           placeholder="Publish date"
                         />

                         <input
                           type="number"
                           min={0}
                           className={inputClassSmall}
                           placeholder="Views (optional)"
                           value={typeof newPost.views === 'number' ? newPost.views : ''}
                           onChange={e => setNewPost({ ...newPost, views: e.target.value === '' ? undefined : Number(e.target.value) })}
                           aria-label="Views"
                           title="Views"
                         />

                         <input
                           type="number"
                           min={0}
                           className={inputClassSmall}
                           placeholder="Likes (optional)"
                           value={typeof newPost.likes === 'number' ? newPost.likes : ''}
                           onChange={e => setNewPost({ ...newPost, likes: e.target.value === '' ? undefined : Number(e.target.value) })}
                           aria-label="Likes"
                           title="Likes"
                         />

                         <input
                           type="number"
                           min={0}
                           className={inputClassSmall}
                           placeholder="Loves (optional)"
                           value={typeof newPost.loves === 'number' ? newPost.loves : ''}
                           onChange={e => setNewPost({ ...newPost, loves: e.target.value === '' ? undefined : Number(e.target.value) })}
                           aria-label="Loves"
                           title="Loves"
                         />

                         <input
                           type="number"
                           min={0}
                           className={inputClassSmall}
                           placeholder="Claps (optional)"
                           value={typeof newPost.claps === 'number' ? newPost.claps : ''}
                           onChange={e => setNewPost({ ...newPost, claps: e.target.value === '' ? undefined : Number(e.target.value) })}
                           aria-label="Claps"
                           title="Claps"
                         />

                         {oneDriveStatus && oneDriveStatus.enabled && (
                           <div
                             className={
                               "md:col-span-2 text-[10px] font-bold uppercase tracking-wider " +
                               (oneDriveStatus.connected
                                 ? 'text-green-700'
                                 : (oneDriveStatus.needsReconnect ? 'text-amber-700' : 'text-gray-500'))
                             }
                             title={oneDriveStatus.error || ''}
                           >
                             Uploads ({String(oneDriveStatus.provider || 'unknown')}): {oneDriveStatus.connected ? 'Ready' : (oneDriveStatus.needsReconnect ? 'Needs reconnect' : 'Not ready')}
                           </div>
                         )}
                         
                         <div className="md:col-span-2 flex flex-col md:flex-row gap-3">
                           <input
                             className={inputClassSmall + " flex-grow"}
                             placeholder="Feature Image URL (optional)"
                             value={newPost.image}
                             onChange={e => setNewPost({ ...newPost, image: e.target.value })}
                           />
                           <input
                             key={featuredImageUploadKey}
                             type="file"
                             accept="image/jpeg,image/png,image/webp,image/gif"
                             className={inputClassSmall + " p-1 text-xs"}
                             onChange={(e) => handleFeaturedImageUpload(e.target.files?.[0])}
                             aria-label="Upload featured image"
                           />
                         </div>

                         {(newPost.image || featuredImageLocalPreview) && (
                           <div className="md:col-span-2">
                             <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Featured Image Preview</div>
                             <div className="bg-white dark:bg-gray-950 rounded border border-gray-200 dark:border-gray-800 overflow-hidden">
                               <img
                                 src={(() => {
                                   if (featuredImageLocalPreview) return featuredImageLocalPreview;
                                   const raw = String(newPost.image || '').trim();
                                   if (!raw) return raw;
                                   if (raw.startsWith('data:')) return raw;
                                   const join = raw.includes('?') ? '&' : '?';
                                   return `${raw}${join}v=${featuredImagePreviewNonce}`;
                                 })()}
                                 alt={newPost.title || 'Featured'}
                                 className="w-full h-48 object-cover"
                                 loading="lazy"
                               />
                               {isUploadingFeaturedImage && (
                                 <div className="p-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                                   Uploading image…
                                 </div>
                               )}
                             </div>
                           </div>
                         )}
                         
                         <div className="md:col-span-2 bg-white dark:bg-gray-950 rounded border border-gray-200 dark:border-gray-800 overflow-visible min-h-[300px] flex flex-col min-w-0 max-w-full">
                            <div className="p-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Article Content</div>
                            <div className="px-3 py-2 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
                              <label className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-200">
                                <input
                                  type="checkbox"
                                  checked={autoLinkUrls}
                                  onChange={(e) => setAutoLinkUrls(e.target.checked)}
                                />
                                Auto hyperlink URLs
                              </label>
                              <div className="flex items-center gap-2">
                                <select
                                  className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1 text-gray-700 dark:text-gray-100"
                                  defaultValue=""
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val) return;
                                    insertQuillText(val);
                                    e.currentTarget.value = '';
                                  }}
                                  aria-label="Insert special character"
                                  title="Insert special character"
                                >
                                  <option value="">Special</option>
                                  <option value="₦">₦ (Naira)</option>
                                  <option value="★">★ (Star)</option>
                                  <option value="•">• (Bullet)</option>
                                  <option value="→">→ (Arrow)</option>
                                  <option value="✓">✓ (Check)</option>
                                </select>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-xs font-bold bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1 text-gray-700 dark:text-gray-100 hover:border-grantify-green/50"
                                  onClick={() => {
                                    const emoji = window.prompt('Insert emoji (or any symbol):', '😀');
                                    if (!emoji) return;
                                    insertQuillText(emoji);
                                  }}
                                  aria-label="Insert emoji"
                                  title="Insert emoji"
                                >
                                  <Smile size={14} /> Emoji
                                </button>
                                <div className="text-[10px] text-gray-400 hidden md:block">Uncheck for bare plaintext links</div>
                              </div>
                            </div>
                            {isHydratingSelectedPost && (
                              <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin" /> Loading post content…
                              </div>
                            )}
                            <input
                              ref={inlineImageInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              className="hidden"
                              onChange={handleInlineImagePicked}
                              aria-label="Insert image into post"
                            />
                            <ReactQuill
                              ref={quillRef}
                              theme="snow"
                              value={newPost.content}
                              onChange={(content) => setNewPost(prev => ({ ...prev, content }))}
                              modules={quillModules}
                              formats={quillFormats}
                              className="flex-grow admin-quill min-w-0 max-w-full"
                              placeholder="Write your article here..."
                            />
                         </div>
 
                         <div className="flex flex-wrap items-start gap-3 mt-4">
                           <button type="submit" disabled={isSavingPost} className={`${isEditingPost ? 'bg-blue-600 hover:bg-blue-800' : 'bg-grantify-green hover:bg-green-800'} inline-flex items-center justify-center min-h-11 text-white font-bold py-3 leading-tight rounded transition shadow-lg relative z-10 px-4 whitespace-normal text-center`}>
                             {isSavingPost ? "Saving..." : (isEditingPost ? "Update Publication" : "Publish Article to Community")}
                           </button>
                           <button
                             type="button"
                             onClick={() => {
                               localStorage.setItem('grantify_blog_preview_data', JSON.stringify({
                                 ...newPost,
                                 id: newPost.id || 'preview',
                                 createdAt: newPost.createdAt || new Date().toISOString()
                               }));
                               window.open('/blog/preview', '_blank');
                             }}
                             className="inline-flex items-center justify-center min-h-11 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-100 font-bold py-3 leading-tight px-4 rounded transition shadow-md relative z-10 whitespace-normal text-center"
                           >
                             Preview Article
                           </button>
                           {isEditingPost && (
                             <button
                               type="button"
                               disabled={isSavingPost}
                               onClick={async () => {
                                 if (!newPost.id) return;
                                 if (!window.confirm('Approve and publish this post? This will remove the "autodraft" tag and publish.')) return;
                                 setIsSavingPost(true);
                                 try {
                                   const payload = {
                                     ...newPost,
                                     tags: (Array.isArray(newPost.tags) ? newPost.tags.filter(t => String(t).toLowerCase() !== 'autodraft') : []),
                                     content: autoLinkUrls ? linkifyHtml(newPost.content) : newPost.content
                                   };
                                   const updated = await ApiService.submitBlogAction({ ...payload, id: String(newPost.id), action: 'update' });
                                   // update local list
                                   setBlogPosts(prev => prev.map(p => (String(p.id) === String(newPost.id) ? { ...p, ...payload } : p)));
                                   alert('Post approved and published.');
                                   void refreshData();
                                 } catch (e: any) {
                                   alert(e?.message || 'Failed to approve and publish');
                                 } finally {
                                   setIsSavingPost(false);
                                 }
                               }}
                               className="inline-flex items-center justify-center min-h-11 max-w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 leading-tight px-4 rounded transition shadow-md whitespace-normal text-center"
                             >
                               Approve and publish post
                             </button>
                           )}
                         </div>
                      </form>
                    </div>
 
                    <div className="bg-white dark:bg-gray-950 rounded border border-gray-200 dark:border-gray-800 overflow-x-auto">
                      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                        <div className="text-xs text-gray-500">
                          {selectedBlogPostIds.size > 0 ? `${selectedBlogPostIds.size} selected` : 'Select posts/drafts to manage in bulk'}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const allIds = blogPosts.map(p => String(p.id));
                              setSelectedBlogPostIds(new Set(allIds));
                            }}
                            className="text-xs font-bold px-3 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const draftIds = blogPosts.filter(isAutodraftPost).map(p => String(p.id));
                              setSelectedBlogPostIds(new Set(draftIds));
                            }}
                            className="text-xs font-bold px-3 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            Select drafts
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBlogPostIds(new Set())}
                            className="text-xs font-bold px-3 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={handleBulkApproveBlogPosts}
                            disabled={selectedBlogPostIds.size === 0 || isSavingPost}
                            className="text-xs font-bold px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            Approve selected
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBulkEditForm({
                                category: '',
                                author: '',
                                authorRole: '',
                              });
                              setShowBulkEditModal(true);
                            }}
                            disabled={selectedBlogPostIds.size === 0 || isSavingPost}
                            className="text-xs font-bold px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            Edit selected
                          </button>
                          <button
                            type="button"
                            onClick={handleBulkDeleteBlogPosts}
                            disabled={selectedBlogPostIds.size === 0 || isSavingPost}
                            className="text-xs font-bold px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Delete selected
                          </button>
                        </div>
                      </div>
                      <table className="w-full text-sm min-w-[800px]">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                          <tr>
                            <th className="p-3 text-left w-10">
                              <input
                                type="checkbox"
                                aria-label="Select all posts"
                                checked={blogPosts.length > 0 && blogPosts.every(p => selectedBlogPostIds.has(String(p.id)))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedBlogPostIds(new Set(blogPosts.map(p => String(p.id))));
                                  } else {
                                    setSelectedBlogPostIds(new Set());
                                  }
                                }}
                              />
                            </th>
                            <th className="p-3 text-left">Article</th>
                            <th className="p-3 text-left">Author</th>
                            <th className="p-3 text-left">Category & Tags</th>
                            <th className="p-3 text-left">Engagement</th>
                            <th className="p-3 text-left">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {blogPosts.map(post => (
                            <tr key={post.id} className={newPost.id === post.id ? 'bg-blue-50' : ''}>
                              <td className="p-3 align-top">
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${post.title}`}
                                  checked={selectedBlogPostIds.has(String(post.id))}
                                  onChange={(e) => {
                                    setSelectedBlogPostIds(prev => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(String(post.id));
                                      else next.delete(String(post.id));
                                      return next;
                                    });
                                  }}
                                />
                              </td>
                              <td className="p-3">
                                <span className="font-bold block truncate max-w-[200px]" title={post.title}>{post.title}</span>
                                <span className="text-[10px] text-gray-400">{new Date(post.createdAt).toLocaleDateString()}</span>
                                {isAutodraftPost(post) && (
                                  <div className="mt-1 inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                                    Draft
                                  </div>
                                )}
                                {post.sourceName && (
                                  <div className="flex items-center gap-1 text-[10px] text-blue-500 font-bold mt-1">
                                    <LinkIcon size={10} /> {post.sourceName}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-xs">
                                <span className="font-bold">{post.author}</span>
                                <span className="block text-gray-400 italic">{post.authorRole}</span>
                              </td>
                              <td className="p-3">
                                <span className="text-[10px] bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 px-2 py-0.5 rounded font-black uppercase">{post.category}</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {post.tags?.map((tag, i) => (
                                    <span key={i} className="text-[9px] text-gray-400 bg-gray-100 px-1 rounded">#{tag}</span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3 text-xs text-gray-500">
                                <div className="flex flex-col gap-0.5">
                                  <div>{Number(post.likes || 0).toLocaleString()} Likes</div>
                                  <div>{Number(post.loves || 0).toLocaleString()} Loves</div>
                                  <div>{Number(post.claps || 0).toLocaleString()} Claps</div>
                                  <div>{Number(post.views || 0).toLocaleString()} Views</div>
                                  <div>{post.commentsCount} Comments</div>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex gap-1">
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      localStorage.setItem('grantify_blog_preview_data', JSON.stringify({
                                        ...post,
                                        createdAt: post.createdAt || new Date().toISOString()
                                      }));
                                      window.open('/blog/preview', '_blank');
                                    }}
                                    className="text-amber-600 hover:bg-amber-100 p-2 rounded"
                                    title="Preview post"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  {isAutodraftPost(post) && (
                                    <button 
                                      onClick={() => handleApproveSinglePost(post)}
                                      className="text-green-600 hover:bg-green-100 p-2 rounded"
                                      title="Approve and Publish Draft"
                                    >
                                      <Check size={16} />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleEditBlogPost(post)}
                                    className="text-blue-600 hover:bg-blue-100 p-2 rounded"
                                    title="Edit post"
                                  >
                                    <Type size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteBlogPost(post.id)} 
                                    className="text-red-600 hover:bg-red-100 p-2 rounded"
                                    title="Delete post"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Bulk Edit Modal */}
                    {showBulkEditModal && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto text-gray-900 dark:text-gray-100">
                          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                            <div>
                              <h3 className="text-lg font-bold">Bulk Edit Selected Drafts</h3>
                              <p className="text-xs text-gray-500">Updating {selectedBlogPostIds.size} post(s). Leave fields blank to keep their current values.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowBulkEditModal(false)}
                              className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                              title="Close modal"
                              aria-label="Close modal"
                            >
                              <X size={20} />
                            </button>
                          </div>

                          <form onSubmit={handleBulkEditBlogPosts} className="p-6 space-y-6">
                            <div className="space-y-4">
                              <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1" htmlFor="bulkEditForm-category">Category</label>
                                <select
                                  id="bulkEditForm-category"
                                  value={bulkEditForm.category}
                                  onChange={(e) => setBulkEditForm(prev => ({ ...prev, category: e.target.value }))}
                                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm"
                                  title="Bulk Category"
                                >
                                  <option value="">Keep current category</option>
                                  {categoryOptions.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1" htmlFor="bulkEditForm-author">Author Name</label>
                                <input
                                  id="bulkEditForm-author"
                                  type="text"
                                  value={bulkEditForm.author}
                                  onChange={(e) => setBulkEditForm(prev => ({ ...prev, author: e.target.value }))}
                                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm"
                                  placeholder="Keep current author name"
                                  title="Bulk Author"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1" htmlFor="bulkEditForm-authorRole">Author Role</label>
                                <input
                                  id="bulkEditForm-authorRole"
                                  type="text"
                                  value={bulkEditForm.authorRole}
                                  onChange={(e) => setBulkEditForm(prev => ({ ...prev, authorRole: e.target.value }))}
                                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3 text-sm"
                                  placeholder="Keep current author role"
                                  title="Bulk Author Role"
                                />
                              </div>
                            </div>

                            <div className="flex gap-4 justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                              <button
                                type="button"
                                onClick={() => setShowBulkEditModal(false)}
                                className="px-4 py-2 text-sm font-bold border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-950"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isSavingPost}
                                className="px-5 py-2 text-sm font-bold bg-grantify-green text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
                              >
                                {isSavingPost ? 'Saving...' : 'Apply Changes'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Admins & Profile Tab */}
              {activeTab === 'admins' && (
                <div>
                    <h3 id="my-profile" className="text-xl font-bold mb-4">My Profile</h3>

                    <form onSubmit={handleSaveProfile} className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-800 mb-8">
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="profile-name" className="block text-xs font-bold text-gray-600 dark:text-gray-200 mb-1">Full Name</label>
                          <input
                            id="profile-name"
                            type="text"
                            className={inputClassSmall}
                            value={profileForm.name}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                            autoComplete="name"
                          />
                        </div>
                        <div>
                          <label htmlFor="profile-username" className="block text-xs font-bold text-gray-600 dark:text-gray-200 mb-1">Username / Email</label>
                          <input
                            id="profile-username"
                            type="text"
                            className={inputClassSmall}
                            value={profileForm.username}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value }))}
                            autoComplete="username"
                          />
                        </div>

                        <div>
                          <label htmlFor="profile-current-password" className="block text-xs font-bold text-gray-600 dark:text-gray-200 mb-1">Current Password (only needed to change password)</label>
                          <input
                            id="profile-current-password"
                            type="password"
                            className={inputClassSmall}
                            value={profileForm.currentPassword}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                            autoComplete="current-password"
                          />
                        </div>
                        <div>
                          <label htmlFor="profile-new-password" className="block text-xs font-bold text-gray-600 dark:text-gray-200 mb-1">New Password</label>
                          <input
                            id="profile-new-password"
                            type="password"
                            className={inputClassSmall}
                            value={profileForm.newPassword}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, newPassword: e.target.value }))}
                            autoComplete="new-password"
                          />
                          <div className="mt-2">
                            <label htmlFor="profile-confirm-new-password" className="block text-xs font-bold text-gray-600 dark:text-gray-200 mb-1">Confirm New Password</label>
                            <input
                              id="profile-confirm-new-password"
                              type="password"
                              className={inputClassSmall}
                              value={profileForm.confirmNewPassword}
                              onChange={(e) => setProfileForm(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                              autoComplete="new-password"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <button
                          type="submit"
                          disabled={isSavingProfile}
                          className="bg-grantify-green text-white px-4 py-2 rounded hover:bg-green-700 font-bold disabled:opacity-60"
                        >
                          {isSavingProfile ? 'Saving…' : 'Save Profile'}
                        </button>
                        <div className="text-xs text-gray-500">Leave password fields blank to keep your current password.</div>
                      </div>
                    </form>

                    {user.role === UserRole.SUPER_ADMIN && (
                      <>
                        <h3 id="manage-admins" className="text-xl font-bold mb-6">Manage Administrators</h3>
                    
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
                      </>
                    )}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};