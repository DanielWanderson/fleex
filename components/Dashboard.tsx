
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, LinkItem, Product, Category, PlanType, Order, Coupon, AbandonedCart, StatPoint } from '../types';
import { api, fileToBase64 } from '../services/storage';
import { generateDescription, analyzeProductImage } from '../services/geminiService';
import { THEMES, PLANS } from '../constants';
import { 
  LayoutGrid, LinkIcon, ShoppingBag, BarChart, 
  Palette, QrCode, Plus, Trash2, 
  Image as ImageIcon, ExternalLink, X, Smartphone, Check, ClipboardList, Bell, Search,
  Sparkles as MagicIcon, Lock, Users, CreditCard, ChevronRight
} from './Icons';

// --- CUSTOM SVG CHART COMPONENTS ---
const SimpleAreaChart = ({ data }: { data: StatPoint[] }) => {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.revenue)) || 100;
  const height = 200;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = height - ((d.revenue / maxVal) * height);
    return `${x},${y}`;
  }).join(' ');

  const areaPath = `M0,${height} ${points} ${100},${height} Z`;
  
  return (
    <div className="w-full h-64 relative flex flex-col justify-end overflow-hidden">
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full h-full absolute inset-0 text-blue-500 overflow-visible">
        <path d={areaPath} fill="url(#grad)" stroke="none" />
        <path d={`M${points.replace(/ /g, ' L')}`} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex justify-between mt-2 text-xs text-gray-400 px-1 relative z-10">
        {data.map((d, i) => <span key={i}>{d.date}</span>)}
      </div>
    </div>
  );
};

const SimpleBarChart = ({ data }: { data: {name: string, value: number}[] }) => {
  const max = Math.max(...data.map(d => d.value)) || 1;
  return (
    <div className="w-full h-48 flex items-end justify-between gap-2 pt-6">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
           <div className="relative w-full bg-slate-100 rounded-t-sm hover:bg-slate-200 transition-all" style={{ height: `${(d.value / max) * 100}%` }}>
               <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">{d.value}</div>
           </div>
           <span className="text-[10px] text-gray-400 truncate w-full text-center">{d.name}</span>
        </div>
      ))}
    </div>
  );
};

const SimplePieChart = ({ data }: { data: {name: string, value: number, color: string}[] }) => {
  let cumulativePercent = 0;
  const total = data.reduce((a, b) => a + b.value, 0);

  return (
    <div className="flex flex-col md:flex-row items-center gap-8 h-full justify-center">
        <div className="relative w-40 h-40 rounded-full border-8 border-slate-50 overflow-hidden shadow-inner flex items-center justify-center bg-slate-50">
             <div className="w-full h-full rounded-full" style={{
                 background: `conic-gradient(${data.map(d => {
                     const start = cumulativePercent;
                     const deg = (d.value / total) * 100;
                     cumulativePercent += deg;
                     return `${d.color} 0 ${cumulativePercent}%`;
                 }).join(', ')})`
             }}></div>
             <div className="absolute inset-0 m-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                 <span className="text-xs font-bold text-gray-400">Total<br/>{total}</span>
             </div>
        </div>
        <div className="space-y-2">
            {data.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full" style={{background: d.color}}></span>
                    <span className="text-gray-600">{d.name}</span>
                    <span className="font-bold text-gray-800">{(d.value/total*100).toFixed(0)}%</span>
                </div>
            ))}
        </div>
    </div>
  );
};
// --- END CUSTOM CHARTS ---

interface DashboardProps {
  user: UserProfile;
  isEmployee: boolean;
  onLogout: () => void;
  onViewPublic: () => void;
  onUserUpdated?: (user: UserProfile) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user: initialUser, isEmployee, onLogout, onViewPublic, onUserUpdated }) => {
  const [user, setUser] = useState(initialUser);
  const [activeView, setActiveView] = useState<'overview' | 'links' | 'products' | 'categories' | 'theme' | 'settings' | 'orders' | 'marketing' | 'team'>('overview');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pickup' | 'delivery' | 'shipping'>('all');
  
  // Data States
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<StatPoint[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCart[]>([]);
  
  // UI States
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  
  // Upgrade & Subscription States
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<PlanType | null>(null);
  const [upgradeStep, setUpgradeStep] = useState<'select' | 'payment'>('select');
  const [paymentData, setPaymentData] = useState({ number: '', name: '', expiry: '', cvv: '', doc: '' });
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // Team & Logs States
  const [newSubName, setNewSubName] = useState('');
  const [newSubPass, setNewSubPass] = useState('');
  const [logFilterName, setLogFilterName] = useState('');
  const [logFilterDate, setLogFilterDate] = useState('');

  // Marketing Tab Specific States
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('');
  
  // Notification States
  const [notification, setNotification] = useState<{show: boolean, order?: Order} | null>(null);
  const prevOrdersRef = useRef<Order[]>([]);
  const prevCartsRef = useRef<AbandonedCart[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Refs for File Inputs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);
  const [activeProductIdForUpload, setActiveProductIdForUpload] = useState<string | null>(null);

  // Initial Data Load (Run Once)
  useEffect(() => {
    const loadData = async () => {
      const [l, p, c, st, o, cp, ac] = await Promise.all([
        api.getLinks(),
        api.getProducts(),
        api.getCategories(),
        api.getStats(),
        api.getOrders(),
        api.getCoupons(),
        api.getAbandonedCarts()
      ]);
      setLinks(l);
      setProducts(p);
      setCategories(c);
      setStats(st);
      setOrders(o);
      setCoupons(cp);
      setAbandonedCarts(ac);
      
      prevOrdersRef.current = o;
      prevCartsRef.current = ac;
    };
    loadData();

    audioRef.current = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"); 
  }, []);

  // Polling Mechanism (Independent)
  useEffect(() => {
    const poller = setInterval(async () => {
        const freshOrders = await api.getOrders();
        const freshCarts = await api.getAbandonedCarts();
        
        if (freshOrders.length > prevOrdersRef.current.length) {
            const newOrder = freshOrders[0];
            setNotification({ show: true, order: newOrder });
            try { audioRef.current?.play().catch(() => {}); } catch(e) {}
            setTimeout(() => setNotification(null), 5000);
            setOrders(freshOrders);
        } else if (JSON.stringify(freshOrders) !== JSON.stringify(prevOrdersRef.current)) {
             setOrders(freshOrders);
        }
        
        if (JSON.stringify(freshCarts) !== JSON.stringify(prevCartsRef.current)) {
            setAbandonedCarts(freshCarts);
        }

        prevOrdersRef.current = freshOrders;
        prevCartsRef.current = freshCarts;
    }, 5000); // Polling every 5s

    return () => clearInterval(poller);
  }, []);

  // Auto-Save Effect
  useEffect(() => {
    const autoSave = async () => {
        setSaveStatus('saving');
        await Promise.all([
            api.setLinks(links),
            api.setProducts(products),
            api.setCategories(categories),
            api.setCoupons(coupons),
        ]);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1500);
    };

    const timer = setTimeout(autoSave, 2000); // Debounce save
    return () => clearTimeout(timer);
  }, [links, products, categories, coupons]);

  const handleUpdateUser = async (updates: Partial<UserProfile>) => {
    const updated = await api.updateUser(updates);
    setUser(updated);
    if (onUserUpdated) onUserUpdated(updated);
    api.logActivity(isEmployee ? 'Colaborador' : 'Admin', 'Atualização de Configurações');
  };

  const handleUpdateTheme = async (themeId: string) => {
    await handleUpdateUser({ themeId });
    api.logActivity(isEmployee ? 'Colaborador' : 'Admin', `Tema alterado para ${themeId}`);
  };

  const handleDelete = (id: string, type: 'link'|'product'|'category'|'coupon') => {
    if(type === 'link') setLinks(prev => prev.filter(i => i.id !== id));
    if(type === 'product') setProducts(prev => prev.filter(i => i.id !== id));
    if(type === 'category') setCategories(prev => prev.filter(i => i.id !== id));
    if(type === 'coupon') setCoupons(prev => prev.filter(i => i.id !== id));
    api.logActivity(isEmployee ? 'Colaborador' : 'Admin', `Excluiu ${type}`);
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
      const updated = await api.updateOrder(orderId, { status });
      setOrders(updated);
      api.logActivity(isEmployee ? 'Colaborador' : 'Admin', `Status do pedido ${orderId} para ${status}`);
  };
  
  const handleGenerateAI = async (title: string, type: 'product'|'bio', id?: string) => {
    setIsLoadingAI(true);
    const desc = await generateDescription(title, type);
    setIsLoadingAI(false);
    if (type === 'product' && id) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, description: desc } : p));
    } else if (type === 'bio') {
      handleUpdateUser({ bio: desc });
    }
    api.logActivity('Admin', `Gerou descrição IA para ${type}`);
  };

  const handleAddProduct = () => {
      setProducts([{ id: Date.now().toString(), title: '', description: '', price: 0, stock: 10, images: ['https://picsum.photos/400/300'], categoryId: categories[0]?.id || '', active: true, sales: 0, variants: [] }, ...products]);
      api.logActivity(isEmployee ? 'Colaborador' : 'Admin', 'Adicionou novo produto');
  };
  const handleAddVariant = (productId: string, name: string) => {
      if (!name) return;
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, variants: [...(p.variants || []), { id: Date.now().toString(), name }] } : p));
  };
  const handleRemoveVariant = (productId: string, variantId: string) => {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, variants: (p.variants || []).filter(v => v.id !== variantId) } : p));
  };
  const handleCreateCoupon = () => {
      if(!newCouponCode || !newCouponDiscount) return;
      setCoupons([...coupons, { id: Date.now().toString(), code: newCouponCode.toUpperCase(), discountPercent: parseFloat(newCouponDiscount), usageCount: 0 }]);
      setNewCouponCode(''); setNewCouponDiscount('');
      api.logActivity(isEmployee ? 'Colaborador' : 'Admin', `Criou cupom ${newCouponCode}`);
  };

  const handleAddSubAccount = () => {
      if(!newSubName || !newSubPass) return;
      const sub = { id: Date.now().toString(), name: newSubName, password: newSubPass, role: 'editor' as const };
      const updatedSubs = [...(user.subAccounts || []), sub];
      handleUpdateUser({ subAccounts: updatedSubs });
      setNewSubName(''); setNewSubPass('');
      api.logActivity('Admin', `Adicionou colaborador ${sub.name}`);
  }

  const handleRecoverAllCarts = () => alert("Simulando envio de mensagem para todos os carrinhos abandonados...");
  
  const handleExportCustomers = async () => {
     const csv = await api.exportCustomersToCSV();
     const blob = new Blob([csv], { type: 'text/csv' });
     const url = window.URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = 'clientes_fleex.csv';
     a.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const base64 = await fileToBase64(e.target.files[0]);
      await handleUpdateUser({ avatarUrl: base64 });
    }
  };

  // MULTI-UPLOAD HANDLER
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && activeProductIdForUpload) {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      const base64s = await Promise.all(files.map(fileToBase64));
      
      setProducts(prev => prev.map(p => {
          if (p.id === activeProductIdForUpload) {
              const newImages = [...p.images, ...base64s].slice(0, 6);
              if (p.images.length === 1 && p.images[0].includes('picsum')) {
                   return { ...p, images: base64s.slice(0, 6) };
              }
              return { ...p, images: newImages };
          }
          return p;
      }));

      // AI Scan Feature (Trigger only on first image of the batch)
      if (isBusinessOrPro && files.length === 1 && window.confirm("Deseja que a IA preencha o Nome e Descrição com base nesta imagem?")) {
          setIsLoadingAI(true);
          const analysis = await analyzeProductImage(base64s[0]);
          if (analysis) {
               setProducts(prev => prev.map(p => p.id === activeProductIdForUpload ? { ...p, title: analysis.title, description: analysis.description } : p));
               api.logActivity('IA', 'Preenchimento automático via Imagem');
          }
          setIsLoadingAI(false);
      }
      
      setActiveProductIdForUpload(null);
    }
  };

  const triggerProductUpload = (productId: string) => { setActiveProductIdForUpload(productId); productInputRef.current?.click(); };
  
  const handleUpgradeConfirm = async () => { 
      if (selectedPlanForUpgrade) { 
          if (!paymentData.number || !paymentData.cvv) return alert("Preencha os dados do cartão.");
          await handleUpdateUser({ plan: selectedPlanForUpgrade }); 
          setSelectedPlanForUpgrade(null); 
          setIsUpgradeOpen(false);
          setUpgradeStep('select');
          setPaymentData({ number: '', name: '', expiry: '', cvv: '', doc: '' });
          alert("Assinatura confirmada com sucesso!");
      } 
  };

  // Computed
  const currentPlan = PLANS[user.plan];
  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
  const isFreePlan = user.plan === PlanType.FREE;
  const isBusinessOrPro = user.plan === PlanType.BUSINESS || user.plan === PlanType.PROFESSIONAL;
  const isProfessional = user.plan === PlanType.PROFESSIONAL;

  const filteredOrders = orders.filter(o => {
      if (orderFilter === 'all') return true;
      if (orderFilter === 'pickup') return o.deliveryMethod === 'pickup';
      if (orderFilter === 'delivery') return o.deliveryMethod === 'delivery'; 
      if (orderFilter === 'shipping') return o.deliveryMethod === 'shipping';
      return true;
  });

  const filteredProducts = products.filter(p => p.title.toLowerCase().includes(productSearchQuery.toLowerCase()));
  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(categorySearchQuery.toLowerCase()));
  const filteredLogs = (user.activityLogs || []).filter(log => {
      const matchesName = log.actorName.toLowerCase().includes(logFilterName.toLowerCase());
      const matchesDate = logFilterDate ? log.timestamp.includes(logFilterDate) : true;
      return matchesName && matchesDate;
  });

  // Chart Data
  const pieData = [
    { name: 'Instagram', value: 400, color: '#E1306C' },
    { name: 'WhatsApp', value: 300, color: '#25D366' },
    { name: 'Direto', value: 300, color: '#3b82f6' },
    { name: 'Google', value: 200, color: '#F4B400' },
  ];
  const funnelData = [
      { name: 'Views', value: 1000 },
      { name: 'Clicks', value: 600 },
      { name: 'Cart', value: 200 },
      { name: 'Sales', value: 80 },
  ];
  const hoursData = Array.from({length: 12}).map((_, i) => ({ name: `${8+i}h`, value: Math.floor(Math.random()*100) + 20 }));

  const NavButton = ({view, icon: Icon, label, count}: any) => (
      <button 
        onClick={() => { setActiveView(view); setMobileMenuOpen(false); }} 
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${activeView === view ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
      >
          <Icon className="w-5 h-5"/> {label}
          {count > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 rounded-full">{count}</span>}
      </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans text-slate-900 overflow-hidden relative">
      
      {/* Toast Notification */}
      {notification && (
          <div className="fixed top-4 right-4 z-[60] animate-in slide-in-from-right fade-in duration-300">
              <div className="bg-white border-l-4 border-green-500 shadow-xl rounded-r-lg p-4 flex items-center gap-3 pr-8 min-w-[300px]">
                  <div className="bg-green-100 p-2 rounded-full text-green-600"><ShoppingBag className="w-5 h-5"/></div>
                  <div>
                      <div className="font-bold text-sm">Novo Pedido Recebido!</div>
                      <div className="text-xs text-gray-500">{notification.order?.customerName} • R$ {notification.order?.productPrice.toFixed(2)}</div>
                  </div>
              </div>
          </div>
      )}

      {/* LATERAL MOBILE MENU (DRAWER) */}
      <div className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setMobileMenuOpen(false)}></div>
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl transform transition-transform duration-300 md:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <span className="text-2xl font-bold text-blue-600">Fleex.</span>
              <button onClick={() => setMobileMenuOpen(false)}><X className="w-6 h-6 text-gray-400"/></button>
          </div>
          <div className="p-4 space-y-1 overflow-y-auto h-full pb-20">
             <NavButton view="overview" icon={LayoutGrid} label="Visão Geral" />
             <NavButton view="links" icon={LinkIcon} label="Meus Links" />
             <NavButton view="orders" icon={ClipboardList} label="Pedidos" count={pendingOrdersCount} />
             <NavButton view="products" icon={ShoppingBag} label="Produtos" />
             <NavButton view="categories" icon={ClipboardList} label="Categorias" />
             {(isBusinessOrPro) && <NavButton view="marketing" icon={MagicIcon} label="Marketing" />}
             {(isProfessional && !isEmployee) && <NavButton view="team" icon={Users} label="Equipe & Logs" />}
             <NavButton view="theme" icon={Palette} label="Aparência" />
             <NavButton view="settings" icon={QrCode} label="Configurações" />
             
             {!isEmployee && (
                 <div className="pt-4 mt-4 border-t">
                    <button onClick={() => { setIsUpgradeOpen(true); setMobileMenuOpen(false); }} className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold shadow-lg">Fazer Upgrade</button>
                 </div>
             )}
             <button onClick={onLogout} className="w-full mt-2 text-gray-500 text-sm font-medium hover:text-red-500 transition p-3 text-left">Sair</button>
          </div>
      </div>

      {/* Sidebar Desktop */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col sticky top-0 h-screen">
         <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <span className="text-2xl font-bold text-blue-600">Fleex.</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase font-bold">{PLANS[user.plan].name}</span>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto mt-4">
             <NavButton view="overview" icon={LayoutGrid} label="Visão Geral" />
             <NavButton view="links" icon={LinkIcon} label="Meus Links" />
             <NavButton view="orders" icon={ClipboardList} label="Pedidos" count={pendingOrdersCount} />
             <NavButton view="products" icon={ShoppingBag} label="Produtos" />
             <NavButton view="categories" icon={ClipboardList} label="Categorias" />
             {(isBusinessOrPro) && <NavButton view="marketing" icon={MagicIcon} label="Marketing" />}
             {(isProfessional && !isEmployee) && <NavButton view="team" icon={Users} label="Equipe & Logs" />}
             <NavButton view="theme" icon={Palette} label="Aparência" />
             <NavButton view="settings" icon={QrCode} label="Loja & Configs" />
        </nav>
        <div className="p-4 border-t border-gray-100">
          {!isEmployee && <button onClick={() => setIsUpgradeOpen(true)} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 rounded-lg text-sm font-bold shadow-lg mb-3 hover:opacity-90 transition">Fazer Upgrade</button>}
          <button onClick={onLogout} className="w-full text-gray-500 text-sm font-medium hover:text-red-500 transition">Sair</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto h-screen bg-gray-50 relative p-4 md:p-8">
           {/* Header Mobile */}
           <div className="md:hidden flex items-center justify-between mb-6">
               <span className="text-xl font-bold text-blue-600">Fleex.</span>
               <div className="flex gap-4">
                   <button className="relative" onClick={() => setActiveView('orders')}>
                       <Bell className="w-6 h-6 text-gray-600"/>
                       {pendingOrdersCount > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>}
                   </button>
                   <button onClick={() => setMobileMenuOpen(true)} className="text-gray-600"><LayoutGrid/></button>
               </div>
           </div>

           {/* Top Bar (Desktop) */}
           <div className="hidden md:flex justify-between items-center mb-8">
              <h1 className="text-2xl font-bold text-gray-800 capitalize">
                  {activeView === 'overview' && 'Visão Geral'}
                  {activeView === 'links' && 'Meus Links'}
                  {activeView === 'products' && 'Meus Produtos'}
                  {activeView === 'marketing' && 'Marketing & Vendas'}
                  {activeView === 'team' && 'Gestão de Equipe & Logs'}
                  {activeView === 'settings' && 'Configurações'}
              </h1>
              <div className="flex items-center gap-4">
                  {saveStatus === 'saving' && <span className="text-sm text-gray-400 animate-pulse">Salvando...</span>}
                  {saveStatus === 'saved' && <span className="text-sm text-green-500 flex items-center gap-1"><Check className="w-3 h-3"/> Salvo</span>}
                  
                  <button onClick={() => setIsShareOpen(true)} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <QrCode className="w-4 h-4"/> Compartilhar
                  </button>
                  <button onClick={onViewPublic} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2">
                      <ExternalLink className="w-4 h-4"/> Ver Loja
                  </button>
                  <button className="relative" onClick={() => setActiveView('orders')}>
                      <Bell className="w-6 h-6 text-gray-400 hover:text-gray-600 transition"/>
                      {pendingOrdersCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center border-2 border-gray-50">{pendingOrdersCount}</span>}
                  </button>
              </div>
           </div>

           {/* View: Overview */}
           {activeView === 'overview' && (
             <div className="space-y-6 animate-in fade-in">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><ShoppingBag className="w-24 h-24 text-blue-500"/></div>
                        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Vendas Hoje</h3>
                        <div className="text-3xl font-bold mt-2 text-gray-900">R$ {stats.length > 0 ? stats[stats.length-1].revenue.toFixed(2) : '0.00'}</div>
                        <div className="text-green-500 text-sm font-bold mt-2 flex items-center gap-1">+{stats.length > 0 ? stats[stats.length-1].sales : 0} pedidos</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><LinkIcon className="w-24 h-24 text-purple-500"/></div>
                        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Cliques (Semana)</h3>
                        <div className="text-3xl font-bold mt-2 text-gray-900">{stats.reduce((a,b) => a+b.clicks, 0)}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-4 opacity-10"><BarChart className="w-24 h-24 text-green-500"/></div>
                        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Conversão</h3>
                        <div className="text-3xl font-bold mt-2 text-gray-900">3.2%</div>
                        <div className="text-gray-400 text-sm mt-2">Média do setor: 2.5%</div>
                    </div>
                </div>

                {/* Free Plan Restriction */}
                {isFreePlan ? (
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-center text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold mb-2">Desbloqueie o Poder dos Dados</h3>
                            <p className="text-slate-300 mb-6 max-w-lg mx-auto">Usuários Pro e Business têm acesso a gráficos detalhados, funis de venda e análise de tráfego.</p>
                            <button onClick={() => setIsUpgradeOpen(true)} className="bg-blue-500 hover:bg-blue-400 text-white px-8 py-3 rounded-full font-bold transition">Fazer Upgrade</button>
                        </div>
                    </div>
                ) : (
                    // PRO/BUSINESS Dashboard
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Area Chart */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1 lg:col-span-2">
                             <h3 className="text-lg font-bold mb-6">Desempenho (Receita)</h3>
                             <SimpleAreaChart data={stats} />
                        </div>
                        
                        {/* Traffic Sources */}
                         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                             <h3 className="text-lg font-bold mb-6">Origem do Tráfego</h3>
                             <SimplePieChart data={pieData} />
                        </div>

                        {/* Conversion Funnel */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold mb-6">Funil de Vendas</h3>
                            <div className="h-64 flex flex-col gap-2 justify-center">
                                {funnelData.map((d, i) => {
                                    const max = funnelData[0].value;
                                    const w = (d.value / max) * 100;
                                    return (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 w-16 text-right">{d.name}</span>
                                            <div className="flex-1 bg-slate-50 rounded-full h-8 overflow-hidden">
                                                <div 
                                                    className="h-full bg-blue-500 flex items-center px-3 text-xs text-white font-bold transition-all duration-1000" 
                                                    style={{width: `${w}%`, opacity: 0.5 + (i * 0.15)}}
                                                >
                                                    {d.value}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                         {/* Peak Hours */}
                         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1 lg:col-span-2">
                            <h3 className="text-lg font-bold mb-6">Horários de Pico (Hoje)</h3>
                            <SimpleBarChart data={hoursData} />
                        </div>
                    </div>
                )}
             </div>
           )}

           {/* View: Products */}
           {activeView === 'products' && (
             <div className="space-y-6 animate-in fade-in">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                     <h2 className="text-2xl font-bold">Meus Produtos</h2>
                     <div className="flex gap-2 w-full md:w-auto">
                         <div className="relative flex-1 md:w-64">
                             <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                             <input 
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 transition" 
                                placeholder="Buscar produto..."
                                value={productSearchQuery}
                                onChange={e => setProductSearchQuery(e.target.value)}
                             />
                         </div>
                         <button onClick={handleAddProduct} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap">
                             <Plus className="w-4 h-4"/> Novo Produto
                         </button>
                     </div>
                 </div>

                 {/* Products List */}
                 <div className="space-y-6">
                     {filteredProducts.map(product => (
                         <div key={product.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition hover:shadow-md">
                             <div className="flex flex-col md:flex-row gap-6">
                                 {/* Image Upload & AI Scan */}
                                 <div className="w-full md:w-32 flex flex-col gap-2">
                                     <div 
                                        className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer overflow-hidden relative group"
                                        onClick={() => triggerProductUpload(product.id)}
                                     >
                                        {product.images[0] ? (
                                             <img src={product.images[0]} className="w-full h-full object-cover" />
                                         ) : <ImageIcon className="w-8 h-8 text-gray-400"/>}
                                         <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition flex-col gap-1">
                                             <span className="text-white text-xs font-bold">Alterar</span>
                                             {isBusinessOrPro && <span className="text-yellow-300 text-[10px] font-bold">+ IA Scan</span>}
                                         </div>
                                     </div>
                                     {product.images.length > 1 && (
                                         <div className="flex gap-1 overflow-x-auto">
                                             {product.images.slice(1).map((img, idx) => (
                                                 <img key={idx} src={img} className="w-8 h-8 rounded object-cover" />
                                             ))}
                                         </div>
                                     )}
                                 </div>
                                 
                                 {/* Inputs */}
                                 <div className="flex-1 space-y-4">
                                     <div className="flex gap-4">
                                         <input 
                                            value={product.title} 
                                            onChange={(e) => setProducts(prev => prev.map(p => p.id === product.id ? { ...p, title: e.target.value } : p))}
                                            className="flex-1 font-bold text-lg bg-gray-50 border border-transparent hover:border-gray-200 focus:bg-white focus:border-blue-500 rounded px-2 py-1 outline-none transition"
                                            placeholder="Nome do Produto"
                                         />
                                         <button onClick={() => handleDelete(product.id, 'product')} className="text-red-400 hover:text-red-600"><Trash2 className="w-5 h-5"/></button>
                                     </div>
                                     
                                     <div className="flex items-start gap-4">
                                         <div className="w-1/2 md:w-32">
                                             <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Preço (R$)</label>
                                             <input 
                                                type="number"
                                                value={product.price} 
                                                onChange={(e) => setProducts(prev => prev.map(p => p.id === product.id ? { ...p, price: parseFloat(e.target.value) } : p))}
                                                className="w-full font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded px-3 py-2 outline-none focus:border-blue-500 appearance-none text-center"
                                                placeholder="0.00"
                                             />
                                         </div>
                                         <div className="w-1/2 md:w-32">
                                             <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Estoque</label>
                                             <input 
                                                type="number"
                                                value={product.stock} 
                                                onChange={(e) => setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: parseInt(e.target.value) } : p))}
                                                className="w-full font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded px-3 py-2 outline-none focus:border-blue-500 appearance-none text-center"
                                                placeholder="0"
                                             />
                                         </div>
                                     </div>
                                     
                                     {/* Product Dimensions Inputs */}
                                     <div className="grid grid-cols-4 gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                                         <div>
                                            <label className="text-[9px] uppercase font-bold text-gray-400 block">Peso (Kg)</label>
                                            <input type="number" step="0.1" value={product.weight || ''} onChange={(e) => setProducts(prev => prev.map(p => p.id === product.id ? {...p, weight: parseFloat(e.target.value)} : p))} className="w-full text-xs p-1 rounded border" placeholder="0.3" />
                                         </div>
                                         <div>
                                            <label className="text-[9px] uppercase font-bold text-gray-400 block">Alt (cm)</label>
                                            <input type="number" value={product.height || ''} onChange={(e) => setProducts(prev => prev.map(p => p.id === product.id ? {...p, height: parseInt(e.target.value)} : p))} className="w-full text-xs p-1 rounded border" placeholder="10" />
                                         </div>
                                         <div>
                                            <label className="text-[9px] uppercase font-bold text-gray-400 block">Larg (cm)</label>
                                            <input type="number" value={product.width || ''} onChange={(e) => setProducts(prev => prev.map(p => p.id === product.id ? {...p, width: parseInt(e.target.value)} : p))} className="w-full text-xs p-1 rounded border" placeholder="20" />
                                         </div>
                                         <div>
                                            <label className="text-[9px] uppercase font-bold text-gray-400 block">Comp (cm)</label>
                                            <input type="number" value={product.length || ''} onChange={(e) => setProducts(prev => prev.map(p => p.id === product.id ? {...p, length: parseInt(e.target.value)} : p))} className="w-full text-xs p-1 rounded border" placeholder="20" />
                                         </div>
                                     </div>

                                     <div className="relative">
                                         <textarea 
                                            value={product.description}
                                            onChange={(e) => setProducts(prev => prev.map(p => p.id === product.id ? { ...p, description: e.target.value } : p))}
                                            className="w-full text-sm text-gray-600 bg-gray-50 border border-transparent hover:border-gray-200 focus:bg-white focus:border-blue-500 rounded px-3 py-2 outline-none resize-none h-20"
                                            placeholder="Descrição do produto..."
                                         />
                                         <button 
                                            onClick={() => handleGenerateAI(product.title, 'product', product.id)}
                                            disabled={isLoadingAI || !product.title}
                                            className="absolute bottom-2 right-2 text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-purple-200 transition disabled:opacity-50"
                                         >
                                             <MagicIcon className="w-3 h-3"/> {isLoadingAI ? 'Gerando...' : 'Gerar com IA'}
                                         </button>
                                     </div>

                                     {/* Variants Section */}
                                     <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                         <div className="flex justify-between items-center mb-2">
                                             <span className="text-xs font-bold text-gray-500 uppercase">Variações (Cor, Tamanho)</span>
                                         </div>
                                         <div className="flex flex-wrap gap-2 mb-2">
                                             {product.variants?.map(v => (
                                                 <span key={v.id} className="bg-white border px-2 py-1 rounded text-xs flex items-center gap-1 shadow-sm">
                                                     {v.name}
                                                     <button onClick={() => handleRemoveVariant(product.id, v.id)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3"/></button>
                                                 </span>
                                             ))}
                                         </div>
                                         <div className="flex gap-2">
                                             <input 
                                                id={`variant-input-${product.id}`}
                                                className="flex-1 text-xs p-1 border rounded outline-none" 
                                                placeholder="Ex: Tamanho P, Azul..."
                                                onKeyDown={(e) => { if(e.key === 'Enter') { handleAddVariant(product.id, e.currentTarget.value); e.currentTarget.value = ''; } }}
                                             />
                                             <button 
                                                onClick={() => { const el = document.getElementById(`variant-input-${product.id}`) as HTMLInputElement; handleAddVariant(product.id, el.value); el.value = ''; }}
                                                className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-bold hover:bg-gray-300"
                                             >
                                                 Adicionar
                                             </button>
                                         </div>
                                     </div>

                                     <div className="flex items-center gap-2 mt-2">
                                         <span className="text-xs text-gray-400">Categoria:</span>
                                         <select 
                                            value={product.categoryId}
                                            onChange={(e) => setProducts(prev => prev.map(p => p.id === product.id ? { ...p, categoryId: e.target.value } : p))}
                                            className="text-sm bg-transparent border-b border-gray-300 outline-none pb-0.5"
                                         >
                                             {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                         </select>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
                 {/* Multi Upload Input */}
                 <input type="file" ref={productInputRef} className="hidden" accept="image/*" multiple onChange={handleProductImageUpload} />
             </div>
           )}

           {/* View: Settings */}
           {activeView === 'settings' && (
             <div className="space-y-6 animate-in fade-in">
               <h2 className="text-2xl font-bold">Configurações</h2>
               <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                  {/* ... existing profile settings ... */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Perfil da Loja</h3>
                    <div className="flex items-center gap-4 mb-4">
                         <div 
                            className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden cursor-pointer relative group"
                            onClick={() => avatarInputRef.current?.click()}
                         >
                             <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover"/>
                             <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center text-white text-xs">Alterar</div>
                         </div>
                         <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                         <div>
                             <div className="font-bold">{user.name}</div>
                             <div className="text-sm text-gray-500">fleex.com/{user.slug}</div>
                         </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input value={user.name} onChange={(e) => handleUpdateUser({name: e.target.value})} className="border p-2 rounded" placeholder="Nome da Loja" />
                        <input value={user.phone} onChange={(e) => handleUpdateUser({phone: e.target.value})} className="border p-2 rounded" placeholder="WhatsApp (55...)" />
                        <input value={user.pixKey} onChange={(e) => handleUpdateUser({pixKey: e.target.value})} className="border p-2 rounded" placeholder="Chave Pix (E-mail/CPF)" />
                    </div>
                    <textarea value={user.bio} onChange={(e) => handleUpdateUser({bio: e.target.value})} className="w-full border p-2 rounded mt-4 h-24" placeholder="Bio da loja..." />
                    <button 
                        onClick={() => handleGenerateAI(user.name, 'bio')} 
                        className="mt-2 text-xs bg-purple-100 text-purple-600 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-purple-200 transition"
                    >
                        <MagicIcon className="w-3 h-3"/> Gerar Bio com IA
                    </button>
                  </div>
                  
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Endereço da Loja (Origem do Frete)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">CEP de Origem</label>
                             <input 
                                type="text" 
                                value={user.storeCep || ''} 
                                onChange={(e) => handleUpdateUser({storeCep: e.target.value})} 
                                className="w-full p-2 border rounded-lg bg-white" 
                                placeholder="00000-000" 
                             />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                             <input 
                                type="text" 
                                value={user.storeCity || ''} 
                                onChange={(e) => handleUpdateUser({storeCity: e.target.value})} 
                                className="w-full p-2 border rounded-lg bg-white" 
                             />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Estado (UF)</label>
                             <input 
                                type="text" 
                                value={user.storeState || ''} 
                                onChange={(e) => handleUpdateUser({storeState: e.target.value})} 
                                className="w-full p-2 border rounded-lg bg-white" 
                                maxLength={2}
                             />
                        </div>
                        <div className="md:col-span-3 text-xs text-gray-500">
                            * Necessário para calcular frete e diferenciar entregas locais de envios.
                        </div>
                    </div>
                  </div>

                  {/* RESTRICTED: Payment Gateway Section for PRO/BUSINESS (Hidden for Employees) */}
                  {(user.plan !== PlanType.FREE && !isEmployee) && (
                      <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold mb-4">Gateway de Pagamento Automático</h3>
                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <div className="font-bold text-blue-900">Recebimento Automático (Pix/Cartão)</div>
                                    <div className="text-sm text-blue-700">O sistema identifica pagamentos e aprova pedidos na hora.</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={user.autoPaymentActive || false}
                                        onChange={(e) => handleUpdateUser({ autoPaymentActive: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            
                            {user.autoPaymentActive && (
                                <div className="space-y-4 animate-in fade-in">
                                    <div className="flex items-center gap-2 text-green-600 text-sm font-bold bg-green-100 p-2 rounded">
                                        <Check className="w-4 h-4"/> Gateway Ativo e Operando
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">API Key (Simulada)</label>
                                        <div className="flex gap-2">
                                            <input disabled value="live_sk_test_98234092834092834" className="w-full bg-white border p-2 rounded text-gray-500 text-sm font-mono" />
                                            <button className="text-blue-600 text-xs font-bold">Gerar Nova</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                      </div>
                  )}
                  
                  {/* RESTRICTED: Payment Verification Form (Hidden for Employees) */}
                  {(isBusinessOrPro && !isEmployee) && (
                      <div className="border-t pt-6 opacity-50 pointer-events-none">
                         <h3 className="text-lg font-semibold mb-4">Dados para Recebimento (KYC) - <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Verificado</span></h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <input disabled placeholder="CPF/CNPJ" className="border p-2 rounded bg-gray-50" value="***.***.***-**" />
                             <input disabled placeholder="Nome Completo" className="border p-2 rounded bg-gray-50" value={user.name} />
                             <input disabled placeholder="Banco" className="border p-2 rounded bg-gray-50" value="Nubank" />
                             <input disabled placeholder="Agência/Conta" className="border p-2 rounded bg-gray-50" value="**** / *****-*" />
                         </div>
                      </div>
                  )}
               </div>
             </div>
          )}

           {/* View: Links */}
           {activeView === 'links' && (
               <div className="space-y-6 animate-in fade-in">
                   <div className="flex justify-between items-center">
                       <h2 className="text-2xl font-bold">Meus Links</h2>
                       <button onClick={() => setLinks([...links, { id: Date.now().toString(), title: 'Novo Link', url: 'https://', active: true, clicks: 0 }])} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                           <Plus className="w-4 h-4"/> Adicionar
                       </button>
                   </div>
                   <div className="space-y-3">
                       {links.map(link => (
                           <div key={link.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 group">
                               <div className="cursor-move text-gray-300"><LayoutGrid className="w-5 h-5"/></div>
                               <div className="flex-1 space-y-2">
                                   <input 
                                     value={link.title} 
                                     onChange={(e) => setLinks(links.map(l => l.id === link.id ? { ...l, title: e.target.value } : l))}
                                     className="w-full font-bold bg-transparent outline-none placeholder:text-gray-300"
                                     placeholder="Título do Link"
                                   />
                                   <input 
                                     value={link.url} 
                                     onChange={(e) => setLinks(links.map(l => l.id === link.id ? { ...l, url: e.target.value } : l))}
                                     className="w-full text-sm text-gray-500 bg-transparent outline-none"
                                     placeholder="https://..."
                                   />
                               </div>
                               <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition">
                                   <button onClick={() => handleDelete(link.id, 'link')} className="p-2 hover:bg-red-50 text-red-500 rounded"><Trash2 className="w-4 h-4"/></button>
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
           )}

           {/* View: Categories */}
           {activeView === 'categories' && (
               <div className="space-y-6 animate-in fade-in">
                   <div className="flex justify-between items-center">
                       <h2 className="text-2xl font-bold">Categorias</h2>
                   </div>
                   <div className="flex gap-2">
                       <input 
                            className="flex-1 p-3 bg-white border border-gray-200 rounded-lg outline-none" 
                            placeholder="Nova Categoria..."
                            onKeyDown={(e) => { if(e.key === 'Enter') { setCategories([{id: Date.now().toString(), name: e.currentTarget.value}, ...categories]); e.currentTarget.value = ''; } }}
                       />
                   </div>
                   <div className="space-y-2">
                       {filteredCategories.map(cat => (
                           <div key={cat.id} className="bg-white p-4 rounded-lg border border-gray-200 flex justify-between items-center">
                               <span className="font-medium">{cat.name}</span>
                               <button onClick={() => handleDelete(cat.id, 'category')} className="text-red-400 p-2 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                           </div>
                       ))}
                   </div>
               </div>
           )}
           
           {/* View: Marketing */}
           {activeView === 'marketing' && (
             <div className="space-y-8 animate-in fade-in">
                 <h2 className="text-2xl font-bold">Marketing & Ferramentas</h2>
                 {/* Coupons */}
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                     <div className="flex justify-between items-center mb-4">
                         <h3 className="text-lg font-bold flex items-center gap-2"><MagicIcon className="w-5 h-5 text-yellow-500"/> Cupons de Desconto</h3>
                     </div>
                     <div className="flex gap-2 mb-4">
                         <input 
                            value={newCouponCode}
                            onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                            className="flex-1 p-2 border rounded uppercase" 
                            placeholder="CÓDIGO (Ex: PROMO10)" 
                         />
                         <input 
                            type="number"
                            value={newCouponDiscount}
                            onChange={(e) => setNewCouponDiscount(e.target.value)}
                            className="w-24 p-2 border rounded" 
                            placeholder="% OFF" 
                         />
                         <button onClick={handleCreateCoupon} className="bg-gray-900 text-white px-4 rounded font-bold">Criar</button>
                     </div>
                     <div className="space-y-2">
                         {coupons.map(c => (
                             <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                                 <div>
                                     <span className="font-bold text-green-600">{c.code}</span>
                                     <span className="text-gray-500 text-sm ml-2">({c.discountPercent}% OFF)</span>
                                 </div>
                                 <button onClick={() => handleDelete(c.id, 'coupon')} className="text-red-400"><Trash2 className="w-4 h-4"/></button>
                             </div>
                         ))}
                     </div>
                 </div>
                 {/* Abandoned Carts */}
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                     <div className="flex justify-between items-center mb-4">
                         <h3 className="text-lg font-bold flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-red-500"/> Carrinhos Abandonados</h3>
                         <button onClick={handleRecoverAllCarts} className="text-sm text-blue-600 font-bold hover:underline">Recuperar Todos</button>
                     </div>
                     {abandonedCarts.length === 0 ? (
                         <div className="text-center text-gray-400 py-4">Nenhum carrinho abandonado recente.</div>
                     ) : (
                         <div className="space-y-3">
                             {abandonedCarts.map(cart => (
                                 <div key={cart.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                                     <div>
                                         <div className="font-bold">{cart.customerName}</div>
                                         <div className="text-xs text-gray-500">{cart.customerPhone} • R$ {cart.totalValue.toFixed(2)}</div>
                                     </div>
                                     <button className="bg-green-100 text-green-700 px-3 py-1 rounded text-xs font-bold">Enviar Zap</button>
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>
                 {/* Integrations */}
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                     <h3 className="text-lg font-bold mb-4">Integrações</h3>
                     <div className="space-y-4">
                         <div>
                             <label className="block text-sm font-medium mb-1">Pixel do Meta (ID)</label>
                             <input 
                                value={user.metaPixelId || ''} 
                                onChange={(e) => handleUpdateUser({ metaPixelId: e.target.value })}
                                className="w-full border p-2 rounded" 
                                placeholder="123456789" 
                             />
                         </div>
                     </div>
                 </div>
             </div>
           )}

           {/* View: Theme */}
           {activeView === 'theme' && (
               <div className="space-y-6 animate-in fade-in">
                   <h2 className="text-2xl font-bold">Aparência da Loja</h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {THEMES.map(theme => (
                           <div 
                                key={theme.id} 
                                onClick={() => handleUpdateTheme(theme.id)}
                                className={`cursor-pointer rounded-xl overflow-hidden border-2 transition relative ${user.themeId === theme.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}
                           >
                               <div className={`h-32 ${theme.bgClass} flex items-center justify-center`}>
                                   <div className={`p-4 rounded shadow-lg ${theme.cardClass} ${theme.textClass}`}>
                                       <div className="h-2 w-16 bg-current opacity-20 rounded mb-2"></div>
                                       <div className="h-2 w-10 bg-current opacity-20 rounded"></div>
                                   </div>
                               </div>
                               <div className="p-4 bg-white flex justify-between items-center">
                                   <span className="font-bold">{theme.name}</span>
                                   {user.themeId === theme.id && <div className="bg-blue-100 text-blue-600 p-1 rounded-full"><Check className="w-4 h-4"/></div>}
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
           )}

           {/* View: Orders */}
           {activeView === 'orders' && (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Gerenciar Pedidos</h2>
                </div>
                {/* Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <button onClick={() => setOrderFilter('all')} className={`px-4 py-2 rounded-full text-sm font-bold border transition ${orderFilter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>Todos</button>
                    <button onClick={() => setOrderFilter('pickup')} className={`px-4 py-2 rounded-full text-sm font-bold border transition ${orderFilter === 'pickup' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'}`}>Retirada</button>
                    <button onClick={() => setOrderFilter('delivery')} className={`px-4 py-2 rounded-full text-sm font-bold border transition ${orderFilter === 'delivery' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200'}`}>Local (Motoboy)</button>
                    <button onClick={() => setOrderFilter('shipping')} className={`px-4 py-2 rounded-full text-sm font-bold border transition ${orderFilter === 'shipping' ? 'bg-purple-500 text-white border-purple-500' : 'bg-white text-gray-600 border-gray-200'}`}>Envios (Correios)</button>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {filteredOrders.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">Nenhum pedido nesta categoria.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Data</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Cliente</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredOrders.map(order => (
                                        <tr key={order.id} className="hover:bg-gray-50/50">
                                            <td className="p-4 text-sm text-gray-500">
                                                {new Date(order.date).toLocaleDateString('pt-BR')} <br/>
                                                <span className="text-xs">{new Date(order.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-sm text-gray-900">{order.customerName}</div>
                                                <div className="text-xs text-gray-500">{order.customerPhone}</div>
                                            </td>
                                            <td className="p-4">
                                                {order.status === 'paid' ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded">
                                                        <Check className="w-3 h-3" /> Pago
                                                    </span>
                                                ) : order.deliveryMethod === 'shipping' ? (
                                                    <div>
                                                        <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">{order.shippingService || 'Correios'}</span>
                                                    </div>
                                                ) : (
                                                    <span className={`text-xs font-bold px-2 py-1 rounded ${order.deliveryMethod === 'pickup' ? 'text-orange-600 bg-orange-50' : 'text-blue-600 bg-blue-50'}`}>
                                                        {order.deliveryMethod === 'pickup' ? 'Retirada' : 'Motoboy'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <select 
                                                    value={order.status} 
                                                    onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as any)}
                                                    className="text-xs border rounded p-1 mb-2 block"
                                                >
                                                    <option value="pending">Pendente</option>
                                                    <option value="paid">Pago (Aprovado)</option>
                                                    <option value="completed">Concluído</option>
                                                    <option value="shipped">Saiu p/ Entrega</option>
                                                    <option value="canceled">Cancelado</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
          )}

          {/* View: Team Management (NEW TAB) */}
          {(activeView === 'team' && !isEmployee) && (
             <div className="space-y-6 animate-in fade-in">
                 <h2 className="text-2xl font-bold">Gestão de Equipe & Logs</h2>
                  {/* Create SubAccount */}
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-blue-600"/> Adicionar Colaborador</h4>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                          <div className="flex gap-3">
                              <input 
                                  value={newSubName} 
                                  onChange={(e) => setNewSubName(e.target.value)} 
                                  placeholder="Nome de Usuário" 
                                  className="flex-1 p-2 border rounded text-sm"
                              />
                              <input 
                                  value={newSubPass} 
                                  onChange={(e) => setNewSubPass(e.target.value)} 
                                  placeholder="Senha de Acesso" 
                                  type="password"
                                  className="flex-1 p-2 border rounded text-sm"
                              />
                              <button onClick={handleAddSubAccount} className="bg-gray-900 text-white px-4 py-2 rounded text-sm font-bold">Adicionar</button>
                          </div>
                      </div>
                  </div>
                  {/* Activity Logs */}
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h4 className="text-lg font-bold text-gray-800 mb-4">Logs de Atividade</h4>
                      <div className="bg-white border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                          <table className="w-full text-left">
                              <thead className="bg-gray-100 border-b">
                                  <tr>
                                      <th className="p-3 text-xs font-bold text-gray-600">Data</th>
                                      <th className="p-3 text-xs font-bold text-gray-600">Usuário</th>
                                      <th className="p-3 text-xs font-bold text-gray-600">Ação</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y text-sm">
                                  {filteredLogs.map(log => (
                                      <tr key={log.id}>
                                          <td className="p-3 text-gray-500 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                                          <td className="p-3 font-bold">{log.actorName}</td>
                                          <td className="p-3">{log.action} {log.details && <span className="text-gray-400 text-xs">- {log.details}</span>}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
             </div>
          )}
          
      </main>

      {/* Upgrade Modal with Payment Step */}
      {isUpgradeOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 text-white w-full max-w-5xl rounded-3xl p-8 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => { setIsUpgradeOpen(false); setUpgradeStep('select'); }} className="absolute top-6 right-6 p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition"><X className="w-6 h-6 text-white"/></button>
            
            {upgradeStep === 'select' ? (
                <>
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-bold mb-4">Escolha o plano ideal para seu negócio</h2>
                        <p className="text-slate-400">Desbloqueie recursos exclusivos e venda mais.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {Object.values(PLANS).map((plan) => (
                            <div key={plan.name} className={`relative p-6 rounded-2xl border ${user.plan === PlanType[plan.name.toUpperCase() as keyof typeof PlanType] ? 'border-green-500 bg-slate-800/50' : 'border-slate-700 bg-slate-800/30'}`}>
                                {user.plan === PlanType[plan.name.toUpperCase() as keyof typeof PlanType] && <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">ATUAL</div>}
                                <h3 className="text-xl font-bold">{plan.name}</h3>
                                <div className="text-3xl font-bold mt-4 mb-6">R$ {plan.price.toFixed(2)}</div>
                                <ul className="space-y-3 mb-8 text-sm text-slate-400">
                                    {plan.features.map((f, i) => <li key={i} className="flex gap-2"><Check className="w-4 h-4 text-blue-500"/> {f}</li>)}
                                </ul>
                                <button 
                                    onClick={() => { 
                                        setSelectedPlanForUpgrade(PlanType[plan.name.toUpperCase() as keyof typeof PlanType]); 
                                        setUpgradeStep('payment');
                                    }}
                                    className={`w-full py-3 rounded-lg font-bold transition ${user.plan === PlanType[plan.name.toUpperCase() as keyof typeof PlanType] ? 'bg-green-600 cursor-default' : 'bg-blue-600 hover:bg-blue-700'}`}
                                    disabled={user.plan === PlanType[plan.name.toUpperCase() as keyof typeof PlanType]}
                                >
                                    {user.plan === PlanType[plan.name.toUpperCase() as keyof typeof PlanType] ? 'Plano Atual' : 'Selecionar'}
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="max-w-md mx-auto">
                    <button onClick={() => setUpgradeStep('select')} className="text-sm text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-1">← Voltar para planos</button>
                    <div className="bg-white text-slate-900 rounded-2xl p-6">
                        <h3 className="text-2xl font-bold mb-4">Dados de Pagamento</h3>
                        <div className="bg-blue-50 p-4 rounded-lg mb-6 flex justify-between items-center">
                            <div>
                                <div className="text-sm text-blue-900 font-bold">Plano Selecionado</div>
                                <div className="text-xs text-blue-700">{selectedPlanForUpgrade}</div>
                            </div>
                            <div className="font-bold text-lg">R$ {PLANS[selectedPlanForUpgrade!].price.toFixed(2)}/mês</div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nome no Cartão</label>
                                <input className="w-full border p-3 rounded-lg bg-gray-50" placeholder="Como no cartão" value={paymentData.name} onChange={e => setPaymentData({...paymentData, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Número do Cartão</label>
                                <div className="relative">
                                    <input className="w-full border p-3 rounded-lg bg-gray-50 pl-10" placeholder="0000 0000 0000 0000" value={paymentData.number} onChange={e => setPaymentData({...paymentData, number: e.target.value})} />
                                    <CreditCard className="w-5 h-5 absolute left-3 top-3.5 text-gray-400"/>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Validade</label>
                                    <input className="w-full border p-3 rounded-lg bg-gray-50" placeholder="MM/AA" value={paymentData.expiry} onChange={e => setPaymentData({...paymentData, expiry: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">CVV</label>
                                    <input className="w-full border p-3 rounded-lg bg-gray-50" placeholder="123" value={paymentData.cvv} onChange={e => setPaymentData({...paymentData, cvv: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">CPF/CNPJ</label>
                                <input className="w-full border p-3 rounded-lg bg-gray-50" placeholder="000.000.000-00" value={paymentData.doc} onChange={e => setPaymentData({...paymentData, doc: e.target.value})} />
                            </div>
                        </div>

                        <button 
                            onClick={handleUpgradeConfirm}
                            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 transition mt-6"
                        >
                            Confirmar Assinatura
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>
      )}
      
      {/* Share Modal */}
      {isShareOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm relative">
                  <button onClick={() => setIsShareOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X/></button>
                  <h3 className="text-xl font-bold mb-4">Compartilhar Loja</h3>
                  
                  <div className="bg-gray-50 border p-4 rounded-xl flex items-center justify-center mb-4">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://fleex.com/${user.slug}`} 
                        alt="QR Code" 
                        className="w-48 h-48 mix-blend-multiply"
                      />
                  </div>
                  
                  <div className="flex gap-2">
                      <input readOnly value={`fleex.com/${user.slug}`} className="flex-1 bg-gray-100 border p-2 rounded text-sm text-gray-500"/>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(`fleex.com/${user.slug}`); alert('Link copiado!'); }} 
                        className="bg-gray-900 text-white px-4 rounded text-sm font-bold"
                      >
                          Copiar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
