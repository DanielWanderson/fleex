
import { PlanType, ThemeConfig } from './types';

export const PLANS = {
  [PlanType.FREE]: {
    name: 'Free',
    price: 0,
    limit: 10,
    fee: 10,
    features: ['Até 10 produtos', 'Variações de Cor/Tamanho', 'Taxa de 10% por venda', 'Apenas Pagamento via PIX', 'Painel Básico']
  },
  [PlanType.PRO]: {
    name: 'Pro',
    price: 19.99,
    limit: 30,
    fee: 5,
    features: ['Até 30 produtos', 'Taxa de 5% por venda', 'PIX, Cartão e Boleto', 'Dashboard Completo', 'Automação de Pagamentos']
  },
  [PlanType.BUSINESS]: {
    name: 'Business',
    price: 39.99,
    limit: 9999, // Unlimited
    fee: 0,
    features: ['Produtos Ilimitados', 'IA Scanner de Produtos', 'Recuperação de Carrinho', 'Cupons de Desconto', 'Pixel Meta & Analytics']
  },
  [PlanType.PROFESSIONAL]: {
    name: 'Profissional',
    price: 140.00,
    limit: 9999, // Unlimited
    fee: 0,
    features: ['Tudo do Business', 'Acesso para Equipe (Colaboradores)', 'Logs de Atividade', 'White Label Completo', 'Suporte VIP']
  }
};

export const THEMES: ThemeConfig[] = [
  {
    id: 'minimal-light',
    name: 'Clean Slate',
    bgClass: 'bg-gray-50',
    cardClass: 'bg-white border border-gray-200 shadow-sm',
    textClass: 'text-gray-900',
    buttonClass: 'bg-gray-900 text-white hover:bg-gray-800'
  },
  {
    id: 'midnight',
    name: 'Midnight',
    bgClass: 'bg-slate-900',
    cardClass: 'bg-slate-800 border border-slate-700 shadow-lg',
    textClass: 'text-white',
    buttonClass: 'bg-brand-500 text-white hover:bg-brand-600'
  },
  {
    id: 'sunset',
    name: 'Sunset Gradient',
    bgClass: 'bg-gradient-to-br from-orange-100 to-rose-100',
    cardClass: 'bg-white/80 backdrop-blur-md border border-white/50 shadow-sm',
    textClass: 'text-rose-950',
    buttonClass: 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md'
  },
  {
    id: 'forest',
    name: 'Forest',
    bgClass: 'bg-[#0f281e]',
    cardClass: 'bg-[#1a3c2f] border border-[#2d5242]',
    textClass: 'text-[#e2e8f0]',
    buttonClass: 'bg-[#4ade80] text-gray-900 hover:bg-[#22c55e]'
  }
];

export const MOCK_USER_ID = 'user_123';
