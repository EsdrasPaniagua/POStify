"use client";

import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Search, ScanLine, Package, ShoppingCart, Plus, Minus, Trash2, CreditCard, DollarSign, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs, doc, updateDoc, addDoc, query, where, increment } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  barcode: string;
  cost_price: number;
  userId: string;
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

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

const BarcodeScanner = ({ open, onClose, onScan }: BarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    setError('');
    setIsLoading(true);

    // Verificar si el dispositivo tiene cámara
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Tu navegador no soporta acceso a cámara');
      setIsLoading(false);
      return;
    }

    const initScanner = async () => {
      try {
        // Primero verificar permisos
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());

        // Iniciar lector
        readerRef.current = new BrowserMultiFormatReader();
        const devices = await readerRef.current.listVideoInputDevices();
        
        if (devices.length === 0) {
          setError('No se encontró cámara');
          setIsLoading(false);
          return;
        }

        // Buscar cámara trasera
        const backCamera = devices.find((d: any) => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        ) || devices[0];

        readerRef.current.decodeFromVideoDevice(
          backCamera.deviceId,
          videoRef.current!,
          (result, err) => {
            if (result) {
              onScan(result.getText());
              handleClose();
            }
            if (err && err.name !== 'NotFoundException') {
              console.log('Escaneo:', err);
            }
          }
        );
        
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error completo:', err);
        setIsLoading(false);
        
        if (err.name === 'NotAllowedError') {
          setError('Permiso denegado. Haz clic en el candado de la URL y permite la cámara.');
        } else if (err.name === 'NotReadableError') {
          setError('La cámara está siendo usada por otra aplicación. Ciérrala e intenta de nuevo.');
        } else if (err.name === 'NotFoundError') {
          setError('No se encontró cámara en este dispositivo');
        } else {
          setError('Error al acceder a la cámara: ' + err.message);
        }
      }
    };

    initScanner();

    return () => {
      if (readerRef.current) {
        try {
          readerRef.current.reset();
        } catch (e) {
          console.log('Error al resetear:', e);
        }
      }
    };
  }, [open, onScan]);

  const handleClose = () => {
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch (e) {
        console.log('Error al cerrar:', e);
      }
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-card rounded-2xl p-4 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Escanear Código
          </h3>
          <Button variant="ghost" size="icon" onClick={handleClose}>X</Button>
        </div>
        
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Iniciando cámara...</p>
          </div>
        )}
        
        {error && !isLoading ? (
          <div className="text-center py-8">
            <ScanLine className="h-12 w-12 mx-auto mb-4 text-red-400" />
            <p className="text-red-500 font-medium">{error}</p>
            <Button variant="outline" className="mt-4" onClick={handleClose}>Cerrar</Button>
          </div>
        ) : (
          !isLoading && (
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-32 border-2 border-primary/70 rounded-lg bg-primary/5" />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

const ProductCard = ({ product, onAdd }: ProductCardProps) => (
  <Card className="cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-200 active:scale-95 overflow-hidden" onClick={() => onAdd(product)}>
    <div className="aspect-square bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center relative min-h-[100px] sm:min-h-[120px]">
      <Package className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/30" />
      {(product.stock ?? 0) < 10 && <Badge className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px]">{product.stock}</Badge>}
    </div>
    <CardContent className="p-2 sm:p-3">
      <Badge variant="secondary" className="text-[10px] mb-1">{product.category || 'Sin categoría'}</Badge>
      <h4 className="font-semibold text-xs sm:text-sm truncate leading-tight">{product.name}</h4>
      <span className="text-base sm:text-xl font-bold text-primary block mt-1">{formatPrice(product.price)}</span>
    </CardContent>
  </Card>
);

interface CartProps {
  items: CartItem[];
  onUpdateQty: (productId: string, newQty: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: (paymentMethod: string) => void;
  processing: boolean;
}

const Cart = ({ items, onUpdateQty, onRemove, onCheckout, processing }: CartProps) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // En el Cart, cuando está vacío muestra un indicador
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-2">
        <ShoppingCart className="h-8 w-8 sm:h-12 sm:w-12 opacity-20 mb-2" />
        <p className="text-xs sm:text-sm font-medium">Carrito vacío</p>
        <p className="text-[10px] text-muted-foreground">Toca productos para agregar</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 sm:p-3 border-b bg-muted/30 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm">Carrito ({items.length})</h3>
          <span className="text-sm font-bold text-primary">{formatPrice(subtotal)}</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-1 sm:p-2 space-y-1">
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
          <Button className="bg-green-600 hover:bg-green-700 text-[10px] h-7" onClick={() => onCheckout('cash')} disabled={processing}>Efectivo</Button>
          <Button variant="outline" className="text-[10px] h-7" onClick={() => onCheckout('card')} disabled={processing}>Tarjeta</Button>
          <Button variant="outline" className="text-[10px] h-7" onClick={() => onCheckout('transfer')} disabled={processing}>Transfer</Button>
        </div>
      </div>
    </div>
  );
};

export default function HomePage() {
  const [user, loading] = useAuthState(auth);
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [categories, setCategories] = useState<string[]>(['Todos']);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [cartExpanded, setCartExpanded] = useState(false);

  // Cuando hay productos, expandir el carrito
  useEffect(() => {
    if (cart.length > 0) {
      setCartExpanded(true);
    } else {
      setCartExpanded(false);
    }
  }, [cart.length]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted && user) loadProducts(); }, [mounted, user]);

  const loadProducts = async () => {
    try {
      const q = query(collection(db, 'products'), where('userId', '==', user?.uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
      setCategories(['Todos', ...new Set(data.map(p => p.category))]);
    } catch (error) { console.error('Error:', error); }
  };

  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'Todos' || p.category === selectedCategory;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search);
    return matchCat && matchSearch;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        if (exists.qty >= product.stock) { toast.error('Sin stock'); return prev; }
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (productId: string, newQty: number) => {
    if (newQty <= 0) { setCart(prev => prev.filter(item => item.id !== productId)); return; }
    const product = products.find(p => p.id === productId);
    if (newQty > product?.stock) { toast.error('Sin stock'); return; }
    setCart(prev => prev.map(item => item.id === productId ? { ...item, qty: newQty } : item));
  };

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(item => item.id !== productId));

  const handleScan = (code: string) => {
    const product = products.find(p => p.barcode === code);
    if (product) { addToCart(product); toast.success('Agregado'); }
    else { toast.error('No encontrado'); setSearch(code); }
  };

  const handleCheckout = async (paymentMethod: string) => {
    if (!user) { toast.error('Inicia sesión'); return; }
    if (cart.length === 0) { toast.error('Carrito vacío'); return; }
    setProcessing(true);
    try {
      const saleData = {
        userId: user.uid,
        total: cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
        items: cart.reduce((sum, item) => sum + item.qty, 0),
        paymentMethod,
        products: cart.map(item => item.name + ' x' + item.qty).join(', '),
        productsList: cart.map(item => ({ name: item.name, qty: item.qty, price: item.price, category: item.category })),
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'sales'), saleData);
      for (const item of cart) {
        await updateDoc(doc(db, 'products', item.id), { stock: increment(-item.qty) });
      }
      toast.success('Venta: ' + formatPrice(saleData.total));
      setCart([]);
      loadProducts();
    } catch (error) { console.error('Error:', error); toast.error('Error'); }
    finally { setProcessing(false); }
  };

  if (!mounted || loading) return <div className="p-6"><h1>Cargando...</h1></div>;

  if (!user) return (
    <div className="p-6 flex flex-col items-center justify-center h-[60vh]">
      <ShoppingCart className="h-20 w-20 text-muted-foreground/20 mb-4" />
      <h2 className="text-xl font-semibold mb-2">Inicia sesión</h2>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)]">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-card/50">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11" />
            </div>
            <Button variant="outline" onClick={() => setScannerOpen(true)} className="h-11"><ScanLine className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="border-b overflow-x-auto">
          <div className="flex gap-2 px-4 py-2">
            {categories.map((cat) => (
              <Badge key={cat} variant={selectedCategory === cat ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => setSelectedCategory(cat)}>{cat}</Badge>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><Package className="h-16 w-16 opacity-20 mb-4" /><p>No hay productos</p></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {filteredProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} />)}
            </div>
          )}
        </div>
      </div>
      <div className={`lg:w-96 h-[20vh] sm:h-[20vh] ${cartExpanded ? 'sm:h-[40vh]' : ''} lg:h-full border-t lg:border-t-0 lg:border-l bg-card transition-all duration-300`}>
        <Cart items={cart} onUpdateQty={updateQty} onRemove={removeFromCart} onCheckout={handleCheckout} processing={processing} />
      </div>
      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />
    </div>
  );
}

