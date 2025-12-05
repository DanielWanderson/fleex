import React, { useState, useEffect } from 'react';
import { UserProfile, LinkItem, Product, Service, Category, Order, CartItem, PlanType, Variant, Coupon, AbandonedCart } from '../types';
import { THEMES } from '../constants';
import { 
    ExternalLink, ShoppingBag, X, 
    Truck, Smartphone, Check, Search, Instagram, WhatsApp, Mail, 
    Globe, LinkIcon, Minus, Plus, Trash2, CreditCard, MapPin, Lock, QrCode, ArrowRight, ChevronLeft
} from './Icons';
import { api } from '../services/storage';

interface PublicPageProps {
  user: UserProfile;
  links: LinkItem[];
  products: Product[];
  services: Service[];
  categories?: Category[];
}

const generatePixPayload = (key: string, name: string, city: string = 'Cidade', amount?: number, txId: string = '***') => {
  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 25);
  const formatField = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  };

  const merchantAccount = formatField('00', 'br.gov.bcb.pix') + formatField('01', key);
  
  let payload = 
    formatField('00', '01') +
    formatField('26', merchantAccount) +
    formatField('52', '0000') +
    formatField('53', '986');

  if (amount && amount > 0) {
      payload += formatField('54', amount.toFixed(2));
  }

  payload += 
    formatField('58', 'BR') +
    formatField('59', normalize(name)) +
    formatField('60', normalize(city)) +
    formatField('62', formatField('05', txId));

  // CRC16
  payload += '6304';
  
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
      else crc = crc << 1;
    }
  }
  
  const hex = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  return payload + hex;
};

export const PublicPage: React.FC<PublicPageProps> = ({ user, links, products, services, categories = [] }) => {
  const theme = THEMES.find(t => t.id === user.themeId) || THEMES[0];
  
  // Navigation & Filter States
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Selection States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeView, setActiveView] = useState<'home' | 'product'>('home'); // New routing state

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Cart & Checkout States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'delivery' | 'address' | 'payment' | 'gateway' | 'success'>('details');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  
  // Advanced Shipping States
  const [shippingOptions, setShippingOptions] = useState<{service: string, price: number, days: number}[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<{service: string, price: number} | null>(null);
  const [isCalculatingFreight, setIsCalculatingFreight] = useState(false);
  const [cep, setCep] = useState('');
  const [freightError, setFreightError] = useState('');
  
  // Payment Gateway States
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // UI UX States
  const [isAnimatingCart, setIsAnimatingCart] = useState(false);

  // Cart Recovery State
  const CART_KEY = `fleex_cart_${user.id}`;
  const [restoreCartData, setRestoreCartData] = useState<CartItem[] | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);

  // DEEP LINKING CHECK
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product');
    if (productId) {
        const found = products.find(p => p.id === productId);
        if (found) {
            setSelectedProduct(found);
            setActiveView('product');
        }
    }
  }, [products]);

  useEffect(() => {
      // Load coupons for validation
      const loadCoupons = async () => {
          const c = await api.getCoupons();
          setCoupons(c);
      }
      loadCoupons();
  }, [user]);

  // Check for saved cart on mount
  useEffect(() => {
    const saved = localStorage.getItem(CART_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                setRestoreCartData(parsed);
            } else {
                setSessionStarted(true);
            }
        } catch {
            setSessionStarted(true);
        }
    } else {
        setSessionStarted(true);
    }
  }, [user.id, CART_KEY]);

  // Auto-save cart to storage
  useEffect(() => {
    if (sessionStarted) {
         if (cart.length > 0) {
             localStorage.setItem(CART_KEY, JSON.stringify(cart));
         } else {
             localStorage.removeItem(CART_KEY);
         }
    }
  }, [cart, sessionStarted, user.id, CART_KEY]);
  
  // Order Data
  const [orderData, setOrderData] = useState({
    customerName: '',
    customerPhone: '',
    customerCity: '',
    customerState: '',
    deliveryMethod: 'pickup' as 'pickup' | 'delivery' | 'shipping', 
    address: ''
  });

  const handleCloseCheckout = async () => {
      if (orderData.customerName && orderData.customerPhone && checkoutStep !== 'success') {
          const abandoned: AbandonedCart = {
              id: Date.now().toString(),
              customerName: orderData.customerName,
              customerPhone: orderData.customerPhone,
              items: cart,
              date: new Date().toISOString(),
              totalValue: cart.reduce((acc, item) => acc + (item.price * item.quantity), 0),
              recovered: false
          };
          await api.saveAbandonedCart(abandoned);
      }
      setIsCheckoutModalOpen(false);
  };

  const filteredProducts = products.filter(p => {
      const matchesCategory = activeCategory === 'all' || p.categoryId === activeCategory;
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product) => {
      if (product.variants && product.variants.length > 0 && !selectedVariant) {
          alert("Por favor, selecione uma opção.");
          return;
      }

      setSessionStarted(true);
      if (restoreCartData) setRestoreCartData(null);

      if (product.stock <= 0) return;

      setCart(prev => {
          const variantId = selectedVariant ? selectedVariant.id : 'default';
          const existing = prev.find(item => item.id === product.id && (item.selectedVariant?.id || 'default') === variantId);
          
          if (existing && existing.quantity + 1 > product.stock) {
              alert("Estoque insuficiente para adicionar mais itens.");
              return prev;
          }

          if (existing) {
              return prev.map(item => (item.id === product.id && (item.selectedVariant?.id || 'default') === variantId) ? { ...item, quantity: item.quantity + 1 } : item);
          }
          return [...prev, { ...product, quantity: 1, selectedVariant: selectedVariant || undefined }];
      });
      
      setIsAnimatingCart(true);
      setTimeout(() => setIsAnimatingCart(false), 500);
      setIsCartOpen(true); // Open cart immediately
  };

  const removeFromCart = (index: number) => {
      setSessionStarted(true);
      if (restoreCartData) setRestoreCartData(null);
      setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, delta: number) => {
      setSessionStarted(true);
      setCart(prev => prev.map((item, i) => {
          if (i === index) {
              const product = products.find(p => p.id === item.id);
              const maxStock = product?.stock || 0;
              const newQty = item.quantity + delta;
              if (newQty > maxStock) return item;
              if (newQty < 1) return item;
              return { ...item, quantity: newQty };
          }
          return item;
      }));
  };

  const handleApplyCoupon = () => {
      const found = coupons.find(c => c.code === couponCode.toUpperCase());
      if (found) {
          setAppliedCoupon(found);
          alert(`Cupom ${found.code} aplicado: ${found.discountPercent}% OFF`);
      } else {
          alert("Cupom inválido ou expirado.");
          setAppliedCoupon(null);
      }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setFreightError('');
      setShippingOptions([]);
      
      let val = e.target.value.replace(/\D/g, ''); // Remove non-digits
      if (val.length > 8) val = val.slice(0, 8); // Limit to 8 digits
      
      // Mask: 00000-000
      if (val.length > 5) {
          val = val.replace(/^(\d{5})(\d)/, '$1-$2');
      }
      
      setCep(val);
  };

  const calculateFreight = async () => {
      const cleanCep = cep.replace(/\D/g, '');
      if (cleanCep.length !== 8) {
          setFreightError("O CEP deve conter 8 números.");
          return;
      }
      
      setIsCalculatingFreight(true);
      setFreightError('');
      
      try {
          const options = await api.calculateFreight(cleanCep);
          setShippingOptions(options);
      } catch (e: any) {
          setShippingOptions([]);
          setFreightError(e.message || "Erro ao calcular frete");
      } finally {
          setIsCalculatingFreight(false);
      }
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const discountAmount = appliedCoupon ? (subtotal * appliedCoupon.discountPercent / 100) : 0;
  const shippingCost = selectedShipping ? selectedShipping.price : 0;
  const cartTotal = subtotal - discountAmount + shippingCost;
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const startCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutModalOpen(true);
    setCheckoutStep('details');
    // Reset states
    setShippingOptions([]);
    setSelectedShipping(null);
    setCep('');
    setFreightError('');
    setIsProcessingPayment(false);
    setCreatedOrder(null);
  };

  const nextStep = () => {
    if (checkoutStep === 'details') {
        if (!orderData.customerName || !orderData.customerPhone || !orderData.customerCity) return alert("Preencha todos os dados.");
        setCheckoutStep('delivery');
    } else if (checkoutStep === 'delivery') {
        if (orderData.deliveryMethod === 'delivery' || orderData.deliveryMethod === 'shipping') {
             if (orderData.deliveryMethod === 'shipping' && !selectedShipping) return alert("Selecione uma opção de frete.");
             setCheckoutStep('address');
        } else {
             // Pickup
             setCheckoutStep('payment');
        }
    } else if (checkoutStep === 'address') {
        if (!orderData.address) return alert("Preencha o endereço.");
        setCheckoutStep('payment');
    } else if (checkoutStep === 'payment') {
        finishOrderStep();
    }
  };

  const finishOrderStep = async () => {
    if (cart.length === 0) return;

    // Check Auto Payment
    if (user.autoPaymentActive) {
        // Create order as pending, move to Gateway screen
        const newOrder = await createOrder('pending');
        setCreatedOrder(newOrder);
        setCheckoutStep('gateway');
        return;
    } 
    
    // Manual Flow (Default)
    await createOrder('pending');
    await finalizeAndRedirect(false);
  };

  const createOrder = async (status: Order['status']): Promise<Order> => {
      const summary = cart.map(i => `${i.quantity}x ${i.title} ${i.selectedVariant ? `(${i.selectedVariant.name})` : ''}`).join(', ');
      
      const newOrder: Order = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerCity: orderData.customerCity,
        customerState: orderData.customerState,
        customerCep: cep,
        productTitle: summary,
        productPrice: cartTotal,
        deliveryMethod: orderData.deliveryMethod,
        shippingService: selectedShipping?.service,
        shippingCost: selectedShipping?.price,
        address: orderData.address,
        status: status
      };
      await api.addOrder(newOrder);
      await api.updateStock(cart);
      localStorage.removeItem(CART_KEY);
      return newOrder;
  };

  const simulatePaymentApproval = async () => {
      if (!createdOrder) return;
      setIsProcessingPayment(true);
      
      // Simulate API call
      setTimeout(async () => {
          await api.updateOrder(createdOrder.id, { status: 'paid', paymentMethod: selectedPaymentMethod });
          setIsProcessingPayment(false);
          await finalizeAndRedirect(true);
      }, 2000);
  };

  const finalizeAndRedirect = async (isPaid: boolean) => {
    setCheckoutStep('success');
  };

  const openWhatsApp = () => {
      let methodText = 'Retirada na Loja';
      if(orderData.deliveryMethod === 'delivery') methodText = 'Entrega Local (Motoboy)';
      if(orderData.deliveryMethod === 'shipping') methodText = `Envio via ${selectedShipping?.service}`;

      const summary = cart.map(i => `${i.quantity}x ${i.title} ${i.selectedVariant ? `(${i.selectedVariant.name})` : ''}`).join(', ');
      
      let msg = `Olá *${user.name}*, pagamento APROVADO! ✅ \n\n`;
      msg += `O pedido #${createdOrder?.id.slice(-4)} já foi pago via ${selectedPaymentMethod === 'pix' ? 'Pix' : 'Cartão'}.\n\n`;
      msg += `👤 *Cliente:* ${orderData.customerName} (${orderData.customerCity}/${orderData.customerState})\n`;
      msg += `📋 *Itens:* \n${summary}\n`;
      msg += `💰 *Total:* R$ ${cartTotal.toFixed(2)}\n`;
      msg += `📍 *Endereço:* ${orderData.address}\n`;

      const encoded = encodeURIComponent(msg);
      window.open(`https://wa.me/${user.phone}?text=${encoded}`, '_blank');
  }

  const handleShareProduct = (product: Product) => {
      const url = `${window.location.origin}/?product=${product.id}`;
      if (navigator.share) {
          navigator.share({ title: product.title, text: product.description, url }).catch(console.error);
      } else {
          navigator.clipboard.writeText(url);
          alert("Link do produto copiado!");
      }
  };

  // Logic to determine if customer is "Local" vs "Shipping"
  const isLocalCustomer = user.storeCity && orderData.customerCity.toLowerCase().trim() === user.storeCity.toLowerCase().trim();
  const isBusinessPlan = user.plan === PlanType.BUSINESS || user.plan === PlanType.PROFESSIONAL;

  // --- RENDER HELPERS (Moved up to be available for Product View) ---
  const renderCartDrawer = () => (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
              <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 text-gray-900">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <h2 className="text-xl font-bold">Carrinho</h2>
                      <button onClick={() => setIsCartOpen(false)}><X className="w-6 h-6"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {cart.map((item, index) => (
                          <div key={index} className="flex gap-4 items-center">
                              <img src={item.images[0]} className="w-16 h-16 rounded-lg object-cover bg-gray-50" />
                              <div className="flex-1">
                                  <h4 className="font-bold text-sm line-clamp-1">{item.title}</h4>
                                  <div className="text-xs text-gray-500 mt-1">R$ {item.price.toFixed(2)}</div>
                                  <div className="flex items-center gap-3 mt-1">
                                      <button onClick={() => updateQuantity(index, -1)} className="bg-gray-100 p-1 rounded"><Minus className="w-3 h-3"/></button>
                                      <span className="text-sm font-bold">{item.quantity}</span>
                                      <button onClick={() => updateQuantity(index, 1)} className="bg-gray-100 p-1 rounded"><Plus className="w-3 h-3"/></button>
                                  </div>
                              </div>
                              <button onClick={() => removeFromCart(index)} className="text-red-400"><Trash2 className="w-5 h-5"/></button>
                          </div>
                      ))}
                  </div>
                  {cart.length > 0 && (
                      <div className="p-6 bg-gray-50 border-t border-gray-100">
                          <div className="flex justify-between items-center mb-4">
                              <span className="text-gray-600">Total</span>
                              <span className="text-2xl font-bold">R$ {subtotal.toFixed(2)}</span>
                          </div>
                          <button onClick={startCheckout} className={`w-full text-white font-bold py-4 rounded-xl shadow ${theme.buttonClass}`}>Finalizar Pedido</button>
                      </div>
                  )}
              </div>
          </div>
  );

  const renderCheckoutModal = () => (
      <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white text-gray-900 w-full max-w-md md:rounded-2xl rounded-t-3xl p-6 relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-10">
                <button onClick={handleCloseCheckout} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"><X className="w-6 h-6" /></button>
                
                <div className="mb-6 border-b border-gray-100 pb-4">
                    <h3 className="text-xl font-bold">Checkout</h3>
                </div>

                {checkoutStep === 'details' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div>
                            <label className="block text-sm font-bold mb-1">Seu Nome</label>
                            <input 
                                className="w-full p-3 bg-gray-50 rounded-lg border outline-none" 
                                value={orderData.customerName}
                                onChange={e => setOrderData({...orderData, customerName: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">WhatsApp</label>
                            <input 
                                className="w-full p-3 bg-gray-50 rounded-lg border outline-none" 
                                value={orderData.customerPhone}
                                onChange={e => setOrderData({...orderData, customerPhone: e.target.value})}
                            />
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="block text-sm font-bold mb-1">Cidade</label>
                                <input 
                                    className="w-full p-3 bg-gray-50 rounded-lg border outline-none" 
                                    value={orderData.customerCity}
                                    placeholder="Ex: São Paulo"
                                    onChange={e => setOrderData({...orderData, customerCity: e.target.value})}
                                />
                            </div>
                            <div className="w-20">
                                <label className="block text-sm font-bold mb-1">UF</label>
                                <input 
                                    className="w-full p-3 bg-gray-50 rounded-lg border outline-none text-center uppercase" 
                                    value={orderData.customerState}
                                    maxLength={2}
                                    placeholder="SP"
                                    onChange={e => setOrderData({...orderData, customerState: e.target.value})}
                                />
                            </div>
                        </div>
                        <button onClick={nextStep} className={`w-full text-white py-3 rounded-xl font-bold mt-4 ${theme.buttonClass}`}>Continuar</button>
                    </div>
                )}

                {checkoutStep === 'delivery' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <p className="font-bold text-gray-700">Opções de Entrega</p>
                        
                        {/* Logic: If Business Plan AND different city, force shipping */}
                        {isBusinessPlan && !isLocalCustomer ? (
                            <div className="space-y-4">
                                <button 
                                    onClick={() => setOrderData({...orderData, deliveryMethod: 'shipping'})}
                                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition ${orderData.deliveryMethod === 'shipping' ? 'border-blue-500 bg-blue-50' : 'border-gray-100'}`}
                                >
                                    <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Truck /></div>
                                    <div className="text-left flex-1">
                                        <div className="font-bold">Correios / Transportadora</div>
                                        <div className="text-xs text-gray-500">Envio para {orderData.customerCity}</div>
                                    </div>
                                    {orderData.deliveryMethod === 'shipping' && <Check className="w-5 h-5 text-blue-500"/>}
                                </button>

                                {orderData.deliveryMethod === 'shipping' && (
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 animate-in fade-in">
                                        <div className="flex gap-2 mb-1">
                                            <input 
                                                className={`flex-1 p-2 border rounded-lg text-sm ${freightError ? 'border-red-500 text-red-500' : ''}`} 
                                                placeholder="00000-000" 
                                                value={cep}
                                                onChange={handleCepChange}
                                                maxLength={9}
                                                type="tel"
                                            />
                                            <button onClick={calculateFreight} disabled={isCalculatingFreight} className="bg-gray-900 text-white px-4 rounded-lg text-xs font-bold">
                                                {isCalculatingFreight ? '...' : 'Calcular'}
                                            </button>
                                        </div>
                                        
                                        {freightError && (
                                            <div className="text-xs text-red-500 font-bold mb-3">{freightError}</div>
                                        )}

                                        {shippingOptions.length > 0 && (
                                            <div className="space-y-2 mt-2">
                                                {shippingOptions.map((opt, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        onClick={() => setSelectedShipping(opt)}
                                                        className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer ${selectedShipping?.service === opt.service ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}
                                                    >
                                                        <div>
                                                            <div className="font-bold text-sm">{opt.service}</div>
                                                            <div className="text-xs text-gray-500">{opt.days} dias úteis</div>
                                                        </div>
                                                        <div className="font-bold text-sm">R$ {opt.price.toFixed(2)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Local Options (or Free Plan default)
                            <>
                                <button 
                                    onClick={() => setOrderData({...orderData, deliveryMethod: 'pickup'})}
                                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition ${orderData.deliveryMethod === 'pickup' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-100'}`}
                                >
                                    <div className="bg-orange-100 p-2 rounded-full text-orange-600"><ShoppingBag /></div>
                                    <div className="text-left">
                                        <div className="font-bold">Pegar na Loja</div>
                                        <div className="text-xs text-gray-500">Grátis</div>
                                    </div>
                                </button>
                                <button 
                                    onClick={() => setOrderData({...orderData, deliveryMethod: 'delivery'})}
                                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition ${orderData.deliveryMethod === 'delivery' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-100'}`}
                                >
                                    <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Smartphone /></div>
                                    <div className="text-left">
                                        <div className="font-bold">Entrega Local (Motoboy)</div>
                                        <div className="text-xs text-gray-500">Taxa a combinar</div>
                                    </div>
                                </button>
                            </>
                        )}

                        <button onClick={nextStep} className={`w-full text-white py-3 rounded-xl font-bold mt-4 ${theme.buttonClass}`}>Continuar</button>
                    </div>
                )}

                {checkoutStep === 'address' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <textarea 
                            className="w-full p-3 bg-gray-50 rounded-lg border outline-none h-24 resize-none" 
                            placeholder="Endereço Completo (Rua, Número, Comp...)"
                            value={orderData.address}
                            onChange={e => setOrderData({...orderData, address: e.target.value})}
                        />
                        <button onClick={nextStep} className={`w-full text-white py-3 rounded-xl font-bold mt-4 ${theme.buttonClass}`}>Ir para Pagamento</button>
                    </div>
                )}

                {checkoutStep === 'payment' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 text-center">
                        <div className="text-left">
                            <label className="text-xs font-bold text-gray-500 uppercase">Resumo</label>
                            <div className="flex justify-between text-sm mt-1">
                                <span>Subtotal</span>
                                <span>R$ {subtotal.toFixed(2)}</span>
                            </div>
                            {selectedShipping && (
                                <div className="flex justify-between text-sm text-blue-600">
                                    <span>Frete ({selectedShipping.service})</span>
                                    <span>+ R$ {selectedShipping.price.toFixed(2)}</span>
                                </div>
                            )}
                             {appliedCoupon && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Desconto</span>
                                    <span>- R$ {discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-lg mt-2 border-t pt-2">
                                <span>Total</span>
                                <span>R$ {cartTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Coupon Input */}
                         <div className="text-left">
                            <label className="text-xs font-bold text-gray-500 uppercase">Cupom</label>
                            <div className="flex gap-2 mt-1">
                                <input 
                                    type="text" 
                                    value={couponCode}
                                    onChange={e => setCouponCode(e.target.value)}
                                    className="flex-1 bg-gray-50 border border-gray-200 p-2 rounded text-sm uppercase outline-none"
                                    placeholder="Código"
                                    disabled={!!appliedCoupon}
                                />
                                {appliedCoupon ? (
                                    <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} className="text-red-500 text-xs font-bold">Remover</button>
                                ) : (
                                    <button onClick={handleApplyCoupon} className="bg-gray-900 text-white px-3 py-2 rounded text-xs font-bold">Aplicar</button>
                                )}
                            </div>
                        </div>

                        <button 
                            onClick={finishOrderStep}
                            className={`w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg transition flex items-center justify-center gap-2 ${user.autoPaymentActive ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
                        >
                            {user.autoPaymentActive ? (
                                <><CreditCard className="w-5 h-5"/> Pagar Agora</>
                            ) : (
                                <><Smartphone className="w-5 h-5" /> Enviar Pedido no WhatsApp</>
                            )}
                        </button>
                    </div>
                )}

                {/* PAYMENT GATEWAY SCREEN (Only if enabled) */}
                {checkoutStep === 'gateway' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                        <div className="text-center">
                            <div className="inline-flex bg-blue-100 p-3 rounded-full text-blue-600 mb-2">
                                <Lock className="w-8 h-8"/>
                            </div>
                            <h3 className="text-lg font-bold">Pagamento Seguro</h3>
                            <p className="text-sm text-gray-500">Escolha como deseja pagar</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setSelectedPaymentMethod('pix')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition ${selectedPaymentMethod === 'pix' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200'}`}
                            >
                                <QrCode className="w-6 h-6"/>
                                <span className="font-bold text-sm">Pix</span>
                            </button>
                            <button 
                                onClick={() => setSelectedPaymentMethod('card')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition ${selectedPaymentMethod === 'card' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200'}`}
                            >
                                <CreditCard className="w-6 h-6"/>
                                <span className="font-bold text-sm">Cartão</span>
                            </button>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center">
                            {selectedPaymentMethod === 'pix' ? (
                                <div className="space-y-4">
                                    <div className="text-sm text-gray-600">Escaneie o código para pagar:</div>
                                    <div className="w-48 h-48 bg-white mx-auto border p-2 rounded-lg flex items-center justify-center">
                                         {/* Generate Real Pix QR Code based on Order Total */}
                                         <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generatePixPayload(user.pixKey || 'test@pix.com', user.name, user.storeCity, cartTotal))}`} 
                                            alt="Pix QR" 
                                            className="w-full h-full"
                                         />
                                    </div>
                                    <div className="text-xs text-gray-400">Total: R$ {cartTotal.toFixed(2)}</div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="w-full h-12 bg-white border rounded px-3 flex items-center text-gray-400 text-sm">0000 0000 0000 0000</div>
                                    <div className="flex gap-2">
                                        <div className="w-1/2 h-12 bg-white border rounded px-3 flex items-center text-gray-400 text-sm">MM/AA</div>
                                        <div className="w-1/2 h-12 bg-white border rounded px-3 flex items-center text-gray-400 text-sm">CVC</div>
                                    </div>
                                    <div className="w-full h-12 bg-white border rounded px-3 flex items-center text-gray-400 text-sm">Nome no Cartão</div>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={simulatePaymentApproval}
                            disabled={isProcessingPayment}
                            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                        >
                            {isProcessingPayment ? 'Processando...' : 'Simular Pagamento Aprovado'}
                        </button>
                    </div>
                )}

                {checkoutStep === 'success' && (
                    <div className="text-center py-10">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-bold">Pedido Confirmado!</h3>
                        <p className="text-gray-500 mb-6">
                            {user.autoPaymentActive 
                                ? "Seu pagamento foi aprovado e o vendedor já foi notificado." 
                                : "Confirme os detalhes com o vendedor no WhatsApp."}
                        </p>
                        
                        <div className="space-y-3">
                            <button onClick={openWhatsApp} className="w-full bg-green-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 transition">
                                <WhatsApp className="w-5 h-5" /> Enviar Comprovante
                            </button>
                            <button onClick={() => { setIsCheckoutModalOpen(false); setCart([]); }} className="text-blue-600 font-bold hover:underline text-sm">
                                Voltar para a loja
                            </button>
                        </div>
                    </div>
                )}
            </div>
      </div>
  );

  // --- DEDICATED PRODUCT VIEW ---
  if (activeView === 'product' && selectedProduct) {
      return (
        <div className={`min-h-screen ${theme.bgClass} font-sans pb-10`}>
            {/* Nav */}
            <div className="p-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-white/80">
                <button onClick={() => { setActiveView('home'); setSelectedProduct(null); }} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition">
                    <ChevronLeft className="w-6 h-6 text-gray-800"/>
                </button>
                <div className="font-bold text-gray-900 truncate max-w-[200px]">{selectedProduct.title}</div>
                <button onClick={() => setIsCartOpen(true)} className="relative p-2">
                    <ShoppingBag className="w-6 h-6 text-gray-800"/>
                    {cartCount > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-1 rounded-full">{cartCount}</span>}
                </button>
            </div>

            <div className="max-w-4xl mx-auto p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Images */}
                 <div className="space-y-4">
                     <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden shadow-sm">
                         <img src={selectedProduct.images[currentImageIndex]} className="w-full h-full object-cover" />
                     </div>
                     {selectedProduct.images.length > 1 && (
                         <div className="flex gap-2 overflow-x-auto pb-2">
                             {selectedProduct.images.map((img, i) => (
                                 <div 
                                    key={i} 
                                    onClick={() => setCurrentImageIndex(i)}
                                    className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer border-2 transition ${currentImageIndex === i ? 'border-black' : 'border-transparent'}`}
                                 >
                                     <img src={img} className="w-full h-full object-cover" />
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>

                 {/* Info */}
                 <div className="space-y-6">
                     <div>
                         <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedProduct.title}</h1>
                         <div className="text-4xl font-bold text-gray-900">R$ {selectedProduct.price.toFixed(2)}</div>
                         <div className="text-sm text-gray-500 mt-1">Em até 12x de R$ {(selectedProduct.price/12).toFixed(2)}</div>
                     </div>

                     {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                        <div>
                             <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Escolha uma opção</h3>
                             <div className="flex flex-wrap gap-2">
                                 {selectedProduct.variants.map(v => (
                                     <button
                                        key={v.id}
                                        onClick={() => setSelectedVariant(v)}
                                        className={`px-6 py-3 rounded-lg text-sm font-bold border-2 transition ${
                                            selectedVariant?.id === v.id 
                                            ? 'border-black bg-black text-white' 
                                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                        }`}
                                     >
                                         {v.name}
                                     </button>
                                 ))}
                             </div>
                        </div>
                     )}
                     
                     {/* Shipping Calculator */}
                     <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                         <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Calcular Frete</label>
                         <div className="flex gap-2">
                             <input 
                                className="flex-1 p-2 border rounded-lg outline-none text-sm text-gray-900" 
                                placeholder="00000-000" 
                                value={cep}
                                onChange={handleCepChange}
                                maxLength={9}
                             />
                             <button onClick={calculateFreight} className="bg-gray-900 text-white px-4 rounded-lg text-xs font-bold">{isCalculatingFreight ? '...' : 'OK'}</button>
                         </div>
                         {freightError && <div className="text-xs text-red-500 mt-2 font-bold">{freightError}</div>}
                         {shippingOptions.length > 0 && (
                             <div className="mt-3 space-y-2">
                                 {shippingOptions.map((opt, i) => (
                                     <div key={i} className="flex justify-between text-sm">
                                         <span className="text-gray-600">{opt.service} ({opt.days} dias)</span>
                                         <span className="font-bold text-gray-900">R$ {opt.price.toFixed(2)}</span>
                                     </div>
                                 ))}
                             </div>
                         )}
                     </div>

                     <div className="flex gap-4">
                         <button 
                             onClick={() => addToCart(selectedProduct)}
                             disabled={selectedProduct.stock <= 0}
                             className={`flex-1 py-4 rounded-xl font-bold text-lg shadow-lg hover:brightness-90 transition text-white ${selectedProduct.stock <= 0 ? 'bg-gray-400' : 'bg-green-600'}`}
                         >
                             {selectedProduct.stock <= 0 ? 'Esgotado' : 'Comprar Agora'}
                         </button>
                         <button onClick={() => handleShareProduct(selectedProduct)} className="p-4 rounded-xl border-2 border-gray-200 hover:bg-gray-50 transition">
                             <QrCode className="w-6 h-6 text-gray-700" />
                         </button>
                     </div>
                     
                     <div className="prose text-gray-600 border-t pt-4">
                         <h3 className="text-sm font-bold text-gray-900 uppercase">Descrição</h3>
                         <p className="mt-2">{selectedProduct.description}</p>
                     </div>
                 </div>
            </div>
            {/* Re-use Checkout Modal Logic */}
            {/* Same Checkouts/Carts components are rendered below */}
            {isCartOpen && renderCartDrawer()}
            {isCheckoutModalOpen && renderCheckoutModal()}
        </div>
      )
  }

  return (
    <div className={`min-h-screen ${theme.bgClass} ${theme.textClass} font-sans pb-24`}>
      
      {/* ... keeping existing header/product/grid code ... */}
      <div className="max-w-md mx-auto px-4 pt-10">
           {/* Profile Header */}
        <div className="text-center mb-6 animate-in fade-in duration-500">
            <div className="mb-4 relative inline-block">
                <img 
                    src={user.avatarUrl} 
                    alt={user.name} 
                    className="w-24 h-24 rounded-full mx-auto border-4 border-white shadow-md object-cover"
                />
            </div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="opacity-80 text-sm mt-2 max-w-[90%] mx-auto leading-relaxed">{user.bio}</p>
        </div>

         {/* Product Header with Search & Cart */}
         <div className="flex items-center justify-between mb-6 px-1 h-12">
            {isSearchOpen ? (
                <div className={`flex-1 flex items-center gap-2 p-2 rounded-xl shadow-sm border animate-in fade-in slide-in-from-right-2 ${theme.cardClass}`}>
                    <Search className="w-4 h-4 opacity-50" />
                    <input 
                        autoFocus
                        className={`flex-1 bg-transparent text-sm outline-none ${theme.textClass} placeholder:opacity-50`}
                        placeholder="Buscar produto..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}>
                        <X className="w-4 h-4 opacity-50" />
                    </button>
                </div>
            ) : (
                <>
                    <div className="flex flex-col justify-center">
                        <h2 className="font-bold text-xl leading-none">Produtos</h2>
                        <span className="text-xs opacity-60 mt-1">{filteredProducts.length} encontrados</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setIsSearchOpen(true)}
                            className={`p-3 rounded-full transition shadow-sm border border-transparent hover:brightness-95 ${theme.cardClass}`}
                        >
                            <Search className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => { setIsCartOpen(true); setSessionStarted(true); if(restoreCartData) setRestoreCartData(null); }}
                            className={`p-3 rounded-full transition shadow-lg relative ${theme.buttonClass} ${isAnimatingCart ? 'animate-bounce' : ''}`}
                        >
                            <ShoppingBag className="w-5 h-5" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-transparent shadow-sm">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>
                </>
            )}
        </div>

        {/* Product Grid */}
        <div className="mb-10">
             <div className="grid grid-cols-2 gap-4">
                {filteredProducts.map(product => {
                    const isSoldOut = product.stock <= 0;
                    return (
                        <div 
                            key={product.id} 
                            className={`group rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer border border-transparent relative ${theme.cardClass} ${isSoldOut ? 'opacity-80 grayscale-[0.5]' : ''}`}
                            onClick={() => { setSelectedProduct(product); setActiveView('product'); setCurrentImageIndex(0); setSelectedVariant(null); }}
                        >
                        {isSoldOut && (
                            <div className="absolute inset-0 bg-black/40 z-20 flex items-center justify-center pointer-events-none">
                                <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Esgotado</span>
                            </div>
                        )}
                        <div className="aspect-[4/5] bg-gray-100 relative overflow-hidden">
                            <img 
                                src={product.images[0]} 
                                alt={product.title} 
                                className="w-full h-full object-cover transition duration-500 group-hover:scale-110" 
                            />
                        </div>
                        <div className="p-3">
                            <h3 className="font-bold text-sm truncate opacity-90">{product.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="font-bold text-sm text-green-500">R$ {product.price.toFixed(2)}</span>
                            </div>
                        </div>
                        </div>
                    );
                })}
             </div>
        </div>
      </div>
      {/* Cart & Modals */}
      {isCartOpen && renderCartDrawer()}
      {isCheckoutModalOpen && renderCheckoutModal()}
    </div>
  );
};