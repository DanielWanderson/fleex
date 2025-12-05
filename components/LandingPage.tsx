
import React from 'react';
import { Sparkles, ShoppingBag, BarChart, Palette, ArrowRight, Check, Star } from './Icons';

interface LandingPageProps {
  onStart: () => void;
  onLogin: () => void;
  onDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onLogin, onDemo }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {/* Navbar */}
      <nav className="border-b border-slate-800 backdrop-blur-sm sticky top-0 z-50 bg-slate-900/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
            Fleex.
          </div>
          <div className="flex gap-4">
             <button onClick={onLogin} className="text-sm font-medium hover:text-blue-400 transition">Entrar</button>
             <button onClick={onStart} className="text-sm font-medium bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-full transition">
               Começar
             </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-800 text-blue-300 text-sm mb-6">
          <Sparkles className="w-4 h-4" />
          <span>Novo: Descrições de produtos via IA</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
          A plataforma tudo-em-um para <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            criadores digitais.
          </span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
          Crie uma página incrível para vender produtos, agendar serviços e compartilhar seus links. 
          Pagamentos integrados, estatísticas e temas profissionais em um só lugar.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={onStart} className="bg-white text-slate-900 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2">
            Criar minha página <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={onDemo} className="px-8 py-3 rounded-full font-semibold border border-slate-700 hover:bg-slate-800 transition">
            Ver Demo
          </button>
        </div>
      </div>

      {/* Grid Features */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold mb-12 text-center">Tudo que você precisa para crescer</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl hover:border-blue-500/50 transition duration-300">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 text-blue-400">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Venda Produtos</h3>
            <p className="text-slate-400 leading-relaxed">
              Digitais ou físicos. Integrado com Mercado Pago. Nós fazemos o split automaticamente.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl hover:border-purple-500/50 transition duration-300">
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6 text-purple-400">
              <Palette className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Temas Visuais</h3>
            <p className="text-slate-400 leading-relaxed">
              Escolha entre nossos temas profissionais ou personalize inteiramente para combinar com sua marca.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl hover:border-green-500/50 transition duration-300">
             <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-6 text-green-400">
              <BarChart className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Estatísticas</h3>
            <p className="text-slate-400 leading-relaxed">
              Acompanhe visualizações, cliques e vendas em tempo real. Entenda melhor sua audiência.
            </p>
          </div>
        </div>
      </div>

      {/* Social Proof Section */}
      <div className="py-20 bg-slate-900 border-y border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    Mais de <span className="text-blue-400">1.000 vendedores</span> usam o Fleex
                </h2>
                <p className="text-slate-400 max-w-2xl mx-auto">
                    Não somos apenas uma ferramenta de link na bio. Somos o sistema operacional do seu negócio online.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Review 1 */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative">
                    <div className="flex text-yellow-500 mb-4 gap-1">
                        <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
                    </div>
                    <p className="text-slate-300 italic mb-6">
                        "O Fleex mudou completamente como eu vendo meus doces. O cliente escolhe, monta o pedido e me manda no WhatsApp. Simples demais!"
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-sm font-bold text-white">JC</div>
                        <div>
                            <div className="font-bold text-sm">Júlia Doceria</div>
                            <div className="text-xs text-slate-500">Confeitaria Artesanal</div>
                        </div>
                    </div>
                </div>

                {/* Review 2 */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative">
                    <div className="flex text-yellow-500 mb-4 gap-1">
                        <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
                    </div>
                    <p className="text-slate-300 italic mb-6">
                        "Já usei outras plataformas, mas nenhuma me deu a liberdade de personalizar o visual como essa. Minha loja ficou muito profissional."
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-sm font-bold text-white">RS</div>
                        <div>
                            <div className="font-bold text-sm">Rafael Store</div>
                            <div className="text-xs text-slate-500">Eletrônicos</div>
                        </div>
                    </div>
                </div>

                {/* Review 3 */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative">
                    <div className="flex text-yellow-500 mb-4 gap-1">
                        <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
                    </div>
                    <p className="text-slate-300 italic mb-6">
                        "A funcionalidade de carrinho de compras integrada é genial. Aumentou minhas vendas em 30% na primeira semana de uso."
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-sm font-bold text-white">MM</div>
                        <div>
                            <div className="font-bold text-sm">Moda Minimalista</div>
                            <div className="text-xs text-slate-500">Vestuário</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-800">
        <h2 className="text-3xl font-bold mb-12 text-center">Planos simples e transparentes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {/* Free */}
           <div className="p-8 rounded-2xl border border-slate-700 bg-slate-800/30">
             <h3 className="text-lg font-medium text-slate-300">Grátis</h3>
             <div className="text-4xl font-bold mt-4 mb-6">R$0</div>
             <ul className="space-y-4 mb-8">
               <li className="flex gap-3 text-slate-400"><Check className="w-5 h-5 text-blue-500" /> 4 Produtos</li>
               <li className="flex gap-3 text-slate-400"><Check className="w-5 h-5 text-blue-500" /> Analytics Básico</li>
               <li className="flex gap-3 text-slate-400"><Check className="w-5 h-5 text-blue-500" /> 5% Taxa de Transação</li>
             </ul>
             <button onClick={onStart} className="w-full py-3 rounded-lg border border-slate-600 hover:bg-slate-700 transition">Começar Grátis</button>
           </div>

           {/* Pro */}
           <div className="p-8 rounded-2xl border border-blue-500 bg-slate-800 relative">
             <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">POPULAR</div>
             <h3 className="text-lg font-medium text-white">Pro</h3>
             <div className="text-4xl font-bold mt-4 mb-6">R$19,90<span className="text-lg font-normal text-slate-400">/mês</span></div>
             <ul className="space-y-4 mb-8">
               <li className="flex gap-3 text-slate-300"><Check className="w-5 h-5 text-blue-400" /> 20 Produtos</li>
               <li className="flex gap-3 text-slate-300"><Check className="w-5 h-5 text-blue-400" /> Agendamento de Serviços</li>
               <li className="flex gap-3 text-slate-300"><Check className="w-5 h-5 text-blue-400" /> QR Code Customizado</li>
               <li className="flex gap-3 text-slate-300"><Check className="w-5 h-5 text-blue-400" /> 3% Taxa de Transação</li>
             </ul>
             <button onClick={onStart} className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition font-semibold">Assinar Pro</button>
           </div>

           {/* Master */}
           <div className="p-8 rounded-2xl border border-slate-700 bg-slate-800/30">
             <h3 className="text-lg font-medium text-slate-300">Master</h3>
             <div className="text-4xl font-bold mt-4 mb-6">R$39,90<span className="text-lg font-normal text-slate-400">/mês</span></div>
             <ul className="space-y-4 mb-8">
               <li className="flex gap-3 text-slate-400"><Check className="w-5 h-5 text-blue-500" /> Produtos Ilimitados</li>
               <li className="flex gap-3 text-slate-400"><Check className="w-5 h-5 text-blue-500" /> Sem marca Fleex</li>
               <li className="flex gap-3 text-slate-400"><Check className="w-5 h-5 text-blue-500" /> Acesso à API</li>
               <li className="flex gap-3 text-slate-400"><Check className="w-5 h-5 text-blue-500" /> 2% Taxa de Transação</li>
             </ul>
             <button onClick={onStart} className="w-full py-3 rounded-lg border border-slate-600 hover:bg-slate-700 transition">Assinar Master</button>
           </div>
        </div>
      </div>
    </div>
  );
};
