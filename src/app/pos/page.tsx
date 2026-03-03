"use client";

import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Search, ScanLine, Package, ShoppingCart, Plus, Minus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs, getDoc, doc, updateDoc, addDoc, query, where, increment, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';
import { getOwnerId } from '@/src/lib/userId';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  barcode: string;
  cost_price: number;
  userId: string;
  image?: string;
  variants?: Record<string, string>;
  inventoryId?: string;
}

interface Inventory {
  id: string;
  name: string;
  color: string;
}

interface CartItem extends Product {
  qty: number;
}

const formatPrice = (price: number) => {
  return price.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).replace('ARS', '$');
};

const BarcodeScanner = ({ open, onClose, onScan }: { open: boolean; onClose: () => void; onScan: (code: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!videoRef.current) return;
    readerRef.current = new BrowserMultiFormatReader();
    readerRef.current.listVideoInputDevices()
      .then((devices) => {
        if (devices.length === 0) { toast.error('No se encontró cámara'); return; }
        const back = devices.find((d: any) => d.label.toLowerCase().includes('back')) || devices[0];
        readerRef.current?.decodeFromVideoDevice(back.deviceId, videoRef.current!, (result) => {
          if (result) { onScan(result.getText()); onClose(); }
        });
      })
      .catch(() => toast.error('Error al acceder a la cámara'));
    return () => { readerRef.current?.reset(); };
  }, [open, onScan, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-card rounded-2xl p-4 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Escanear Código
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">Apuntá la cámara al código de barras</p>
      </div>
    </div>
  );
};

const VariantDropdown = ({
  variant,
  selected,
  onToggle,
  onClear,
}: {
  variant: { id: string; name: string; options: { id: string; name: string }[] };
  selected: { id: string; value: string }[];
  onToggle: (id: string, value: string) => void;
  onClear: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedCount = selected.length;
  const label = selectedCount === 0
    ? variant.name
    : selectedCount === 1
      ? `${variant.name}: ${selected[0].value}`
      : `${variant.name}: ${selectedCount} selec.`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors whitespace-nowrap ${
          selectedCount > 0
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-background text-foreground border-input hover:bg-muted'
        }`}
      >
        {label}
        <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-card border rounded-xl shadow-xl min-w-[150px] overflow-hidden">
          {selectedCount > 0 && (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted border-b"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onClear(); }}
            >
              <X className="h-3 w-3" /> Limpiar filtro
            </button>
          )}
          {variant.options.map((opt) => {
            const isSelected = selected.some(v => v.value === opt.name);
            return (
              <button
                key={opt.id}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-muted transition-colors text-left"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onToggle(variant.id, opt.name)}
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                  isSelected ? 'bg-primary border-primary' : 'border-input'
                }`}>
                  {isSelected && (
                    <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                {opt.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ProductCard = ({ product, onAdd, inventories }: { product: Product; onAdd: (product: Product) => void; inventories: Inventory[] }) => {
  const inventory = inventories.find(i => i.id === product.inventoryId);
  return (
    <Card
      className="cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-200 active:scale-95 overflow-hidden"
      onClick={() => onAdd(product)}
    >
      <div className="aspect-square bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center relative min-h-[100px] sm:min-h-[120px]">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/30" />
        )}
        {(product.stock ?? 0) < 10 && (
          <Badge className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px]">{product.stock ?? 0}</Badge>
        )}
        {inventory && (
          <span
            className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white shadow"
            style={{ backgroundColor: inventory.color }}
          >
            {inventory.name}
          </span>
        )}
      </div>
      <CardContent className="p-2 sm:p-3">
        <Badge variant="secondary" className="text-[10px] mb-1">{product.category || 'Sin categoría'}</Badge>
        <h4 className="font-semibold text-xs sm:text-sm truncate leading-tight">{product.name}</h4>
        {product.variants && Object.keys(product.variants).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(product.variants).map(([key, value]) => (
              <span key={key} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{value}</span>
            ))}
          </div>
        )}
        <span className="text-base sm:text-xl font-bold text-primary block mt-1">{formatPrice(product.price)}</span>
      </CardContent>
    </Card>
  );
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
};

const ConfirmModal = ({
  paymentMethod,
  items,
  subtotal,
  onConfirm,
  onCancel,
  processing,
}: {
  paymentMethod: string;
  items: CartItem[];
  subtotal: number;
  onConfirm: () => void;
  onCancel: () => void;
  processing: boolean;
}) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
      <div className="bg-primary/10 px-5 py-4 border-b flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Método de pago</p>
          <p className="font-bold text-lg">{PAYMENT_LABELS[paymentMethod]}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-bold text-2xl text-primary">{formatPrice(subtotal)}</p>
        </div>
      </div>
      <div className="px-5 py-3 max-h-48 overflow-y-auto space-y-1">
        {items.map(item => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-muted-foreground truncate flex-1 mr-2">
              {item.name} <span className="font-medium text-foreground">x{item.qty}</span>
            </span>
            <span className="font-medium flex-shrink-0">{formatPrice(item.price * item.qty)}</span>
          </div>
        ))}
      </div>
      <div className="px-5 py-4 border-t flex gap-2">
        <Button variant="outline" className="flex-1 h-11" onClick={onCancel} disabled={processing}>
          Cancelar
        </Button>
        <Button className="flex-1 h-11 bg-green-600 hover:bg-green-700" onClick={onConfirm} disabled={processing}>
          {processing ? 'Procesando...' : 'Confirmar'}
        </Button>
      </div>
    </div>
  </div>
);

const Cart = ({
  items, onUpdateQty, onRemove, onCheckout, processing, onClose
}: {
  items: CartItem[];
  onUpdateQty: (productId: string, newQty: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: (paymentMethod: string) => void;
  processing: boolean;
  onClose: () => void;
}) => {
  const [pendingPayment, setPendingPayment] = useState<string | null>(null);
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleConfirm = () => {
    if (pendingPayment) {
      onCheckout(pendingPayment);
      setPendingPayment(null);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="p-3 border-b bg-muted/30 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm">Carrito ({items.reduce((s, i) => s + i.qty, 0)})</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-primary">{formatPrice(subtotal)}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5 p-1.5 bg-muted/50 rounded-lg text-xs">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{item.name}</h4>
                <p className="text-muted-foreground text-[10px]">{formatPrice(item.price)}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-5 w-5" onClick={() => onUpdateQty(item.id, item.qty - 1)}>
                  <Minus className="h-2 w-2" />
                </Button>
                <span className="w-4 text-center text-xs font-bold">{item.qty}</span>
                <Button variant="outline" size="icon" className="h-5 w-5" onClick={() => onUpdateQty(item.id, item.qty + 1)}>
                  <Plus className="h-2 w-2" />
                </Button>
              </div>
              <Button variant="ghost" size="icon" className="h-5 w-5 text-red-500" onClick={() => onRemove(item.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        <div className="p-2 sm:p-3 border-t flex-shrink-0">
          <div className="grid grid-cols-3 gap-1">
            <Button className="bg-green-600 hover:bg-green-700 text-[10px] h-8" onClick={() => setPendingPayment('cash')} disabled={processing}>Efectivo</Button>
            <Button variant="outline" className="text-[10px] h-8" onClick={() => setPendingPayment('card')} disabled={processing}>Tarjeta</Button>
            <Button variant="outline" className="text-[10px] h-8" onClick={() => setPendingPayment('transfer')} disabled={processing}>Transfer</Button>
          </div>
        </div>
      </div>

      {pendingPayment && (
        <ConfirmModal
          paymentMethod={pendingPayment}
          items={items}
          subtotal={subtotal}
          onConfirm={handleConfirm}
          onCancel={() => setPendingPayment(null)}
          processing={processing}
        />
      )}
    </>
  );
};

export default function HomePage({ defaultInventoryId }: { defaultInventoryId?: string } = {}) {
  const [user, loading] = useAuthState(auth);
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<{ id: string; value: string }[]>([]);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [selectedInventory, setSelectedInventory] = useState<string>(defaultInventoryId || 'all');

  const searchRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cart.length > 0) setCartOpen(true);
  }, [cart.length]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const stored = localStorage.getItem('employeeData');
    if (stored) setEmployeeData(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const ownerId = getOwnerId() || user?.uid;
    if (ownerId) {
      loadProducts(ownerId);
      loadVariants(ownerId);
    }
  }, [mounted, user, loading]);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadProducts = async (ownerId: string) => {
    try {
      const q = query(collection(db, 'products'), where('userId', '==', ownerId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
    } catch (error) {
      console.error('Error:', error);
      setProducts([]);
    }
  };

  const loadVariants = async (ownerId: string) => {
    try {
      const docRef = doc(db, 'settings', ownerId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setVariants(docSnap.data().variants || []);
        setInventories(docSnap.data().inventories || []);
      }
    } catch (error) { console.error('Error:', error); }
  };

  // Sugerencias únicas por nombre para el dropdown
  const dropdownSuggestions = search.trim().length > 0
    ? Array.from(
        new Map(
          products
            .filter(p =>
              p.name.toLowerCase().includes(search.toLowerCase()) ||
              p.barcode?.includes(search)
            )
            .map(p => [p.name.toLowerCase(), p])
        ).values()
      ).slice(0, 8)
    : [];

  const hasActiveSearch = search.trim().length > 0 || selectedVariants.length > 0;

  const filteredProducts = hasActiveSearch ? products.filter(p => {
    const variantGroups = selectedVariants.reduce((acc, v) => {
      if (!acc[v.id]) acc[v.id] = [];
      acc[v.id].push(v.value);
      return acc;
    }, {} as Record<string, string[]>);
    const matchVariants = selectedVariants.length === 0 ||
      Object.entries(variantGroups).every(([id, values]) =>
        values.some(val => p.variants?.[id] === val)
      );
    const matchSearch = !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search);
    const matchInventory = selectedInventory === 'all' || p.inventoryId === selectedInventory;
    return matchSearch && matchVariants && matchInventory;
  }) : [];

  const addToCart = (product: Product) => {
    setCart(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        if (exists.qty >= product.stock) { toast.error('Sin stock'); return prev; }
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    toast.success(`${product.name} agregado`);
  };

  const handleSelectSuggestion = (name: string) => {
    setSearch(name);
    setShowDropdown(false);
    searchRef.current?.focus();
  };

  const updateQty = (productId: string, newQty: number) => {
    if (newQty <= 0) { setCart(prev => prev.filter(item => item.id !== productId)); return; }
    const product = products.find(p => p.id === productId);
    if (newQty > (product?.stock ?? 0)) { toast.error('Sin stock'); return; }
    setCart(prev => prev.map(item => item.id === productId ? { ...item, qty: newQty } : item));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const newCart = prev.filter(item => item.id !== productId);
      if (newCart.length === 0) setCartOpen(false);
      return newCart;
    });
  };

  const handleScan = (code: string) => {
    const product = products.find(p => p.barcode === code);
    if (product) {
      addToCart(product);
      setSearch('');
    } else {
      toast.error('Producto no encontrado');
      setSearch(code);
    }
  };

  const handleCheckout = async (paymentMethod: string) => {
    const ownerId = getOwnerId() || user?.uid;
    if (!ownerId) { toast.error('Inicia sesión'); return; }
    if (cart.length === 0) { toast.error('Carrito vacío'); return; }
    setProcessing(true);
    try {
      const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
      const isOwnerSale = !employeeData?.id;
      const employeeCommissionPercent = isOwnerSale ? 100 : (employeeData?.commissionPercent || 10);

      const saleData = {
        userId: ownerId,
        total,
        items: cart.reduce((sum, item) => sum + item.qty, 0),
        paymentMethod,
        products: cart.map(item => item.name + ' x' + item.qty).join(', '),
        productsList: cart.map(item => ({
          name: item.name,
          qty: item.qty,
          price: item.price,
          costPrice: item.cost_price || 0,
          category: item.category,
          inventoryId: item.inventoryId || null,
          inventoryName: inventories.find(i => i.id === item.inventoryId)?.name || null,
        })),
        createdAt: new Date().toISOString(),
        employeeId: isOwnerSale ? 'owner' : (employeeData?.id || null),
        employeeName: isOwnerSale ? 'DUEÑO' : (employeeData?.name || null),
        employeeCommissionPercent
      };

      const batch = writeBatch(db);
      const saleRef = doc(collection(db, 'sales'));
      batch.set(saleRef, saleData);
      for (const item of cart) {
        batch.update(doc(db, 'products', item.id), { stock: increment(-item.qty) });
      }
      await batch.commit();
      toast.success('Venta: ' + formatPrice(total));
      setCart([]);
      setCartOpen(false);
      setSearch('');
      loadProducts(ownerId);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al procesar la venta');
    } finally {
      setProcessing(false);
    }
  };

  const toggleVariant = (id: string, value: string) => {
    setSelectedVariants(prev => {
      const exists = prev.find(v => v.id === id && v.value === value);
      // Si ya existe, lo quita; si no existe, lo agrega SIN eliminar otras opciones de la misma variante
      if (exists) return prev.filter(v => !(v.id === id && v.value === value));
      return [...prev, { id, value }];
    });
  };

  if (!mounted || loading) return <div className="p-6"><h1>Cargando...</h1></div>;

  const ownerId = getOwnerId() || user?.uid;
  if (!ownerId) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <ShoppingCart className="h-20 w-20 text-muted-foreground/20" />
        <h2 className="text-xl font-semibold">Inicia sesión para continuar</h2>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-60px)]">

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* BARRA DE BÚSQUEDA */}
        <div className={`transition-all duration-300 flex flex-col items-center justify-center px-4 ${hasActiveSearch ? 'py-3' : 'py-16'}`}>

          {!hasActiveSearch && (
            <div className="text-center mb-6">
              <ShoppingCart className="h-12 w-12 text-primary/30 mx-auto mb-2" />
              <h2 className="text-xl font-semibold">¿Qué buscás?</h2>
              <p className="text-sm text-muted-foreground">Buscá un producto o escaneá el código</p>
            </div>
          )}

          {/* Wrapper con ref para detectar clicks afuera */}
          <div ref={wrapperRef} className="relative w-full max-w-xl">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  placeholder="Buscar producto..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => { if (search.trim()) setShowDropdown(true); }}
                  className="pl-9 h-11"
                  autoFocus
                  autoComplete="off"
                />
                {search && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setSearch(''); setShowDropdown(false); searchRef.current?.focus(); }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button variant="outline" onClick={() => setScannerOpen(true)} className="h-11 px-4">
                <ScanLine className="h-4 w-4" />
              </Button>
            </div>

            {/* DROPDOWN */}
            {showDropdown && dropdownSuggestions.length > 0 && (
              <div className="absolute left-0 right-12 top-full mt-1 z-50 bg-card border rounded-xl shadow-xl overflow-hidden">
                {dropdownSuggestions.map((product) => (
                  <button
                    key={product.id}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectSuggestion(product.name)}
                  >
                    {/* Miniatura */}
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {product.image
                        ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        : <Package className="h-4 w-4 text-muted-foreground/40" />
                      }
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.category}</p>
                    </div>
                    {/* Precio */}
                    <span className="text-sm font-bold text-primary flex-shrink-0">{formatPrice(product.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filtros de variantes + inventarios */}
          {hasActiveSearch && (variants.filter(v => v.options.length > 0).length > 0 || inventories.length > 0) && (
            <div className="flex gap-2 flex-wrap w-full max-w-xl mt-2">
              {/* Selector de inventario */}
              {inventories.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setSelectedInventory('all')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border font-medium transition-colors ${
                      selectedInventory === 'all'
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background text-foreground border-input hover:bg-muted'
                    }`}
                  >
                    Todos
                  </button>
                  {inventories.map(inv => (
                    <button
                      key={inv.id}
                      onClick={() => setSelectedInventory(inv.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border font-medium transition-colors`}
                      style={selectedInventory === inv.id
                        ? { backgroundColor: inv.color, color: '#fff', borderColor: inv.color }
                        : { backgroundColor: 'transparent', color: inv.color, borderColor: inv.color }
                      }
                    >
                      <span className="w-2 h-2 rounded-full bg-current opacity-80" />
                      {inv.name}
                    </button>
                  ))}
                </div>
              )}
              {/* Filtros de variantes */}
              {variants.filter(v => v.options.length > 0).map((variant) => {
                const selected = selectedVariants.filter(v => v.id === variant.id);
                return (
                  <VariantDropdown
                    key={variant.id}
                    variant={variant}
                    selected={selected}
                    onToggle={toggleVariant}
                    onClear={() => setSelectedVariants(prev => prev.filter(v => v.id !== variant.id))}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* RESULTADOS */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {hasActiveSearch && filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Package className="h-10 w-10 opacity-20 mb-2" />
              <p className="text-sm">No se encontraron productos</p>
            </div>
          )}

          {filteredProducts.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} onAdd={addToCart} inventories={inventories} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CARRITO */}
      {cartOpen && cart.length > 0 && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/40 z-30" onClick={() => setCartOpen(false)} />
          <div className="fixed lg:static right-0 top-0 bottom-0 z-40 w-80 lg:w-96 bg-card border-l shadow-2xl lg:shadow-none flex flex-col">
            <Cart
              items={cart}
              onUpdateQty={updateQty}
              onRemove={removeFromCart}
              onCheckout={handleCheckout}
              processing={processing}
              onClose={() => setCartOpen(false)}
            />
          </div>
        </>
      )}

      {/* Botón flotante carrito mobile */}
      {cart.length > 0 && !cartOpen && (
        <button
          className="lg:hidden fixed bottom-20 right-4 z-40 bg-primary text-primary-foreground rounded-full p-4 shadow-lg flex items-center gap-2"
          onClick={() => setCartOpen(true)}
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="font-bold text-sm">{cart.reduce((s, i) => s + i.qty, 0)}</span>
        </button>
      )}

      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />
    </div>
  );
}