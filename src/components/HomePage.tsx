"use client";

import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
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

// BarcodeScanner Modal
interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

const BarcodeScanner = ({ open, onClose, onScan }: BarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reader = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      reader.current = new BrowserMultiFormatReader();
      reader.current!
        .listVideoInputDevices()
        .then((videoInputDevices) => {
          if (videoInputDevices.length === 0) {
            setError('No se encontraron cámaras');
            return;
          }
          const backCamera = videoInputDevices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('rear')
          ) || videoInputDevices[0];

          reader.current!
            .decodeFromVideoDevice(backCamera.deviceId, videoRef.current, (result, err) => {
              if (result) {
                onScan(result.getText());
                handleClose();
              }
              if (err && !(err instanceof NotFoundException)) {
                console.error(err);
              }
            })
            .catch((err) => {
              setError('Error: ' + err.message);
            });
        })
        .catch((err) => {
          setError('Error: ' + err.message);
        });
    }

    return () => {
      if (reader.current) {
        reader.current.reset();
      }
    };
  }, [open, onScan]);

  const handleClose = () => {
    if (reader.current) {
      reader.current.reset();
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl p-4 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Escanear Código
          </h3>
          <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full">
            ×
          </Button>
        </div>
        
        {error ? (
          <div className="text-center py-8 text-destructive">
            <p>{error}</p>
            <Button variant="outline" className="mt-4" onClick={handleClose}>Cerrar</Button>
          </div>
        ) : (
          <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-56 border-2 border-primary/70 rounded-2xl bg-primary/10 animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ProductCard
interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

const ProductCard = ({ product, onAdd }: ProductCardProps) => {
  const handleAdd = () => {
    onAdd(product);
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={handleAdd}
    >
      <div className="aspect-square bg-muted flex items-center justify-center relative">
        <Package className="h-12 w-12 text-muted-foreground/30" />
        {product.stock < 10 && (
          <Badge className="absolute top-2 right-2 bg-red-500">Bajo stock</Badge>
        )}
      </div>
      <CardContent className="p-3">
        <h4 className="font-semibold text-sm mb-2 truncate">{product.name}</h4>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-primary">${product.price.toFixed(2)}</span>
          <Badge variant="secondary">{product.stock} uds</Badge>
        </div>
      </CardContent>
    </Card>
  );
};

// Cart
interface CartProps {
  items: CartItem[];
  onUpdateQty: (productId: string, newQty: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: (paymentMethod: string) => void;
  processing: boolean;
}

const Cart = ({ items, onUpdateQty, onRemove, onCheckout, processing }: CartProps) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <ShoppingCart className="h-12 w-12 opacity-30 mb-3" />
        <p className="text-center font-medium">El carrito está vacío</p>
        <p className="text-sm text-center mt-1">Agrega productos</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-bold text-lg">Carrito de Venta</h3>
        <p className="text-sm text-muted-foreground">{items.length} productos</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">{item.name}</h4>
              <p className="text-sm text-muted-foreground">${item.price.toFixed(2)} c/u</p>
            </div>
            
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onUpdateQty(item.id, item.qty - 1)}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center font-bold">{item.qty}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onUpdateQty(item.id, item.qty + 1)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => onRemove(item.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="border-t p-4 space-y-4">
        <div className="flex justify-between text-2xl font-bold">
          <span>Total</span>
          <span className="text-primary">${subtotal.toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" onClick={() => onCheckout('cash')} disabled={processing}>
            <DollarSign className="h-4 w-4 mr-1" /> Efectivo
          </Button>
          <Button variant="outline" onClick={() => onCheckout('card')} disabled={processing}>
            <CreditCard className="h-4 w-4 mr-1" /> Tarjeta
          </Button>
          <Button variant="outline" onClick={() => onCheckout('transfer')} disabled={processing}>
            <Wallet className="h-4 w-4 mr-1" /> Transfer
          </Button>
        </div>
      </div>
    </div>
  );
};

// HomePage Principal
export default function HomePage() {
  const [user, loading] = useAuthState(auth);
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [categories, setCategories] = useState(['Todos']);
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user) {
      loadProducts();
    }
  }, [mounted, user]);

  const loadProducts = async () => {
    try {
      const q = query(collection(db, 'products'), where('userId', '==', user?.uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(data);
      const cats = ['Todos', ...new Set(data.map(p => p.category))];
      setCategories(cats);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    const matchesSearch = !search || 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search);
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);

      if (existingItem) {
        if (existingItem.qty >= product.stock) {
          toast.error('No hay suficiente stock');
          return prevCart;
        }
        return prevCart.map(item =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }

      return [...prevCart, { ...product, qty: 1 }];
    });
  };

  const updateQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart(prevCart => prevCart.filter(item => item.id !== productId));
      return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (newQty > product.stock) {
      toast.error('No hay suficiente stock');
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, qty: newQty } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const handleScan = (code: string) => {
    const product = products.find(p => p.barcode === code);
    
    if (product) {
      addToCart(product);
      toast.success(`Agregado: ${product.name}`);
    } else {
      toast.error('Producto no encontrado');
      setSearch(code);
    }
  };

  const handleCheckout = async (paymentMethod: string) => {
    if (!user) {
      toast.error('Inicia sesión para vender');
      return;
    }

    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    setProcessing(true);

    try {
      const saleData = {
        userId: user.uid,
        total: cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
        items: cart.reduce((sum, item) => sum + item.qty, 0),
        paymentMethod,
        products: cart.map(item => `${item.name} x${item.qty}`).join(', '),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'sales'), saleData);

      for (const item of cart) {
        const productRef = doc(db, 'products', item.id);
        await updateDoc(productRef, {
          stock: increment(-item.qty)
        });
      }

      toast.success(`Venta procesada: $${saleData.total.toFixed(2)}`);
      setCart([]);
      loadProducts();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al procesar venta');
    } finally {
      setProcessing(false);
    }
  };

  if (!mounted || loading) {
    return <div className="p-6"><h1>Cargando...</h1></div>;
  }

  if (!user) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[60vh]"> <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mb-4" /> <h2 className="text-xl font-semibold mb-2">Inicia sesión</h2> <p className="text-muted-foreground">Necesitas iniciar sesión para vender</p> </div> ); }

return ( <div className="flex flex-col lg:flex-row h-screen bg-background"> <div className="flex-1 flex flex-col h-full lg:h-auto overflow-hidden"> <div className="p-4 border-b bg-card"> <div className="flex flex-col sm:flex-row gap-3"> <div className="relative flex-1"> <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /> <Input placeholder="Buscar producto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11" /> </div> <Button variant="outline" onClick={() => setScannerOpen(true)} className="h-11 gap-2"> <ScanLine className="h-4 w-4" /> Escanear </Button> </div> </div>


Copy code
    <div className="border-b bg-card/50 overflow-x-auto">
      <div className="flex gap-2 px-4 py-3">
        {categories.map((cat) => (
          <Badge
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap px-4 py-1.5"
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </Badge>
        ))}
      </div>
    </div>

    <div className="flex-1 overflow-y-auto p-4">
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <Package className="h-12 w-12 opacity-30 mb-3" />
          <p className="text-center">No hay productos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} onAdd={addToCart} />
          ))}
        </div>
      )}
    </div>
  </div>

  <div className="lg:w-[360px] h-[40vh] lg:h-full border-t lg:border-t-0 lg:border-l bg-card overflow-hidden">
    <Cart items={cart} onUpdateQty={updateQty} onRemove={removeFromCart} onCheckout={handleCheckout} processing={processing} />
  </div>

  <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />
</div>
); }