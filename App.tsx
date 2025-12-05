
import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { PublicPage } from './components/PublicPage';
import { Auth } from './components/Auth';
import { api } from './services/storage';
import { UserProfile, LinkItem, Product, Service, Category } from './types';

const App = () => {
  const [view, setView] = useState<'landing' | 'auth' | 'dashboard' | 'public_preview'>('landing');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEmployee, setIsEmployee] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  
  // Public Page Data State
  const [publicData, setPublicData] = useState<{
    links: LinkItem[];
    products: Product[];
    categories: Category[];
    services: Service[];
  } | null>(null);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      const u = await api.getUser();
      if (u) {
        setUser(u);
        setView('dashboard');
        // In a real app, we would verify the token to see if it's an employee
        // For this mock, we assume stored session is owner unless re-logged
        setIsEmployee(false); 
      }
    };
    checkSession();
  }, []);

  const handleStart = () => {
    setView('auth');
  };

  const handleAuthSuccess = (u: UserProfile, employeeMode: boolean) => {
    setUser(u);
    setIsEmployee(employeeMode);
    setView('dashboard');
  };

  const handleLogout = () => {
    // In a real app we would clear token
    localStorage.removeItem('fleex_user');
    setUser(null);
    setIsEmployee(false);
    setView('landing');
  };

  const handleUserUpdate = (updatedUser: UserProfile) => {
      setUser(updatedUser);
  };

  const handleViewPublic = async () => {
    // Force refresh user data from storage to ensure we have latest plan/avatar/pixKey
    const latestUser = await api.getUser();
    if (!latestUser && !user) return;
    
    // If we found a user in storage, use it (it's the most up to date)
    // If not (e.g. demo mode), fallback to current state user
    const userToUse = latestUser || user;

    if(!userToUse) return;

    // Fetch fresh data for preview
    const [l, p, c, s] = await Promise.all([
        api.getLinks(),
        api.getProducts(),
        api.getCategories(),
        api.getServices()
    ]);
    
    // Update state to match storage
    setUser(userToUse);
    setPublicData({ links: l, products: p, categories: c, services: s });
    setView('public_preview');
  };

  const handleDemo = async () => {
    const data = await api.getDemoData();
    setUser(data.user);
    setPublicData({
        links: data.links,
        products: data.products,
        categories: data.categories,
        services: data.services
    });
    setIsDemo(true);
    setView('public_preview');
  };

  const handleBackFromPreview = () => {
    if (isDemo) {
        // Cleanup Demo State
        setUser(null);
        setPublicData(null);
        setIsDemo(false);
        setView('landing');
    } else {
        setView('dashboard');
    }
  };

  if (view === 'public_preview' && user && publicData) {
    return (
      <>
        <div className="fixed top-4 right-4 z-50">
           <button 
             onClick={handleBackFromPreview}
             className="bg-black text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-gray-800 transition flex items-center gap-2"
           >
             {isDemo ? (
                 <>Voltar para o Início</>
             ) : (
                 <>Voltar ao Painel</>
             )}
           </button>
        </div>
        <PublicPage 
            user={user} 
            links={publicData.links} 
            products={publicData.products} 
            categories={publicData.categories}
            services={publicData.services} 
        />
        {isDemo && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/90 text-white backdrop-blur-md z-40 text-center">
                <p className="mb-2 text-sm text-slate-300">Esta é uma demonstração de como sua loja pode ficar.</p>
                <button onClick={handleStart} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2 rounded-full font-bold shadow-lg transition">
                    Criar Minha Loja Agora
                </button>
            </div>
        )}
      </>
    );
  }

  if (view === 'dashboard' && user) {
    return <Dashboard user={user} isEmployee={isEmployee} onLogout={handleLogout} onViewPublic={handleViewPublic} onUserUpdated={handleUserUpdate} />;
  }

  if (view === 'auth') {
    return <Auth onSuccess={handleAuthSuccess} onLoginClick={() => setView('auth')} />; 
  }

  return <LandingPage onStart={handleStart} onLogin={handleStart} onDemo={handleDemo} />;
};

export default App;
