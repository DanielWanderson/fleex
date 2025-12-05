import React, { useState, useEffect } from 'react';
import { Check, X, Smartphone, Globe } from './Icons';
import { api } from '../services/storage';
import { testConnection } from '../services/firebase';
import { UserProfile } from '../types';

interface AuthProps {
  onSuccess: (user: UserProfile, isEmployee: boolean) => void;
  onLoginClick: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onSuccess, onLoginClick }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'employee'>('register');
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    email: '',
    password: '',
    confirmPassword: '',
    storeSlug: '',
    employeeName: '',
    employeePass: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Connection Status
  const [dbStatus, setDbStatus] = useState<{connected: boolean, msg: string} | null>(null);

  useEffect(() => {
      const checkDb = async () => {
          const result = await testConnection();
          setDbStatus({ connected: result.success, msg: result.message });
      };
      checkDb();
  }, []);

  // Relaxed Password Regex: Min 6 chars, 1 letter, 1 number, 1 special char
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[\W_]).{6,}$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Safety Timeout in case Backend Hangs
    const timeout = setTimeout(() => {
        if(loading) {
            setLoading(false);
            setError("O servidor demorou para responder. Tente novamente.");
        }
    }, 15000);

    try {
        let user: UserProfile | null = null;

        if (mode === 'employee') {
            const result = await api.loginSubAccountMock(formData.storeSlug, formData.employeeName, formData.employeePass);
            if (result) {
                await api.logActivity(result.actorName, 'Login de Colaborador');
                clearTimeout(timeout);
                onSuccess(result.user, true);
                return;
            } else {
                throw new Error("Loja não encontrada ou credenciais inválidas.");
            }
        } else if (mode === 'login') {
            user = await api.loginMock(formData.email, formData.password);
        } else {
             // Register Validation
             if (formData.password !== formData.confirmPassword) throw new Error("As senhas não coincidem.");
             if (!passwordRegex.test(formData.password)) throw new Error("A senha deve ter no mínimo 6 caracteres, contendo pelo menos 1 letra, 1 número e 1 caractere especial.");

            user = await api.registerUser({
              name: formData.name,
              slug: formData.slug,
              email: formData.email
            });
        }

        clearTimeout(timeout);
        if (user) {
            onSuccess(user, false);
        } else {
            throw new Error("Erro desconhecido. Tente novamente.");
        }
    } catch (err: any) {
        clearTimeout(timeout);
        console.error(err);
        setError(err.message || "Ocorreu um erro ao processar sua solicitação.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 md:p-10 animate-in fade-in duration-500">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'employee' ? 'Acesso Colaborador' : (mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta')}
          </h2>
        </div>

        {/* Database Status Indicator */}
        <div className={`mb-6 p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${dbStatus?.connected ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
            <Globe className="w-4 h-4" />
            <span>Status do Banco: {dbStatus ? dbStatus.msg : 'Verificando...'}</span>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
            <button onClick={() => setMode('register')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${mode === 'register' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Criar Conta</button>
            <button onClick={() => setMode('login')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${mode === 'login' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Entrar</button>
            <button onClick={() => setMode('employee')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${mode === 'employee' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Colaborador</button>
        </div>

        {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r text-sm flex items-start gap-2">
                <div className="mt-0.5"><X className="w-4 h-4"/></div>
                <div>{error}</div>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode === 'employee' && (
              <>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug da Loja</label>
                    <div className="relative flex items-center">
                         <span className="absolute left-4 text-gray-400 text-sm">fleex.com/</span>
                         <input type="text" required className="w-full pl-24 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="nomedaloja" value={formData.storeSlug} onChange={(e) => setFormData({...formData, storeSlug: e.target.value.toLowerCase()})} />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Seu Nome (Usuário)</label>
                    <input type="text" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="Ex: joao" value={formData.employeeName} onChange={(e) => setFormData({...formData, employeeName: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha de Acesso</label>
                    <input type="password" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="********" value={formData.employeePass} onChange={(e) => setFormData({...formData, employeePass: e.target.value})} />
                </div>
              </>
          )}

          {mode === 'register' && (
              <>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                    <input type="text" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="Seu nome" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome da loja</label>
                    <div className="relative flex items-center">
                    <span className="absolute left-4 text-gray-400 text-sm">fleex.com/</span>
                    <input type="text" required className="w-full pl-24 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="sualoja" value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} />
                    </div>
                </div>
              </>
          )}

          {(mode === 'register' || mode === 'login') && (
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input type="email" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="seu@email.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
          )}

          {(mode === 'register' || mode === 'login') && (
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input type="password" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder={mode === 'register' ? "Min. 6 caracteres" : "Sua senha"} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>
          )}

          {mode === 'register' && (
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
                <input type="password" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="Repita sua senha" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg shadow-lg hover:translate-y-[-2px] transition duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Processando...' : (mode === 'employee' ? 'Acessar Painel' : (mode === 'login' ? 'Entrar' : 'Criar minha conta →'))}
          </button>
        </form>
      </div>
    </div>
  );
};