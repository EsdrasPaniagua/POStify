"use client";

import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { getOwnerId } from '@/src/lib/userId';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/src/components/Dialog';
import { Package, Search, Plus, Trash2, Edit2, DollarSign, ShoppingCart, Tag, X, ScanLine, Image as ImageIcon } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, getDocs, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
//*import { storage } from '@/src/lib/firebase';
import { auth, db } from '@/src/lib/firebase';
import { toast } from 'sonner';
import { BrowserMultiFormatReader } from '@zxing/library';


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
}

interface VariantOption {
  id: string;
  name: string;
}

interface Variant {
  id: string;
  name: string;
  options: VariantOption[];
}

const formatPrice = (price: number) => {
  return price.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).replace('ARS', '$');
};

const ScannerDialog = ({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    readerRef.current = new BrowserMultiFormatReader();

    readerRef.current.listVideoInputDevices()
      .then((devices) => {
        if (devices.length === 0) {
          toast.error('No se encontró cámara');
          return;
        }
        const back = devices.find((d: any) => d.label.toLowerCase().includes('back')) || devices[0];
        readerRef.current?.decodeFromVideoDevice(back.deviceId, videoRef.current!, (result) => {
          if (result) {
            onScan(result.getText());
          }
        });
      })
      .catch((err) => {
        console.error(err);
        toast.error('Error al acceder a la cámara');
      });

    return () => {
      readerRef.current?.reset();
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-card rounded-2xl p-4 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Escanear Código
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>X</Button>
        </div>
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Apunta la cámara al código de barras
        </p>
      </div>
    </div>
  );
};

export default function InventarioPage() {
  const [user, loading] = useAuthState(auth);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);

  const activeVariants = variants.filter(v => 
  v.options.length > 0 && 
  products.some(p => p.variants && p.variants[v.id])
);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerSearchOpen, setScannerSearchOpen] = useState(false); // <-- AGREGAR ESTO
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, string>>({});
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('');
  const [barcode, setBarcode] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [productImage, setProductImage] = useState('');

  const [selectedVariants, setSelectedVariants] = useState<{ id: string; value: string }[]>([]);

  useEffect(() => {
  if (user) {
    loadProducts();
    loadCategories();
    loadVariants();
  }
}, [user]);

  const loadProducts = async () => {
    try {
      const ownerId = getOwnerId() || user?.uid;
      if (!ownerId) return;
      const q = query(collection(db, 'products'), where('userId', '==', ownerId));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(data);
      });
      return () => unsubscribe();
    } catch (error) { console.error('Error:', error); }
  };

  const loadCategories = async () => {
    try {
      const ownerId = getOwnerId() || user?.uid;
      if (!ownerId) return;
      const q = query(collection(db, 'categories'), where('userId', '==', ownerId));
      const snapshot = await getDocs(q);
      const cats = snapshot.docs.map(doc => doc.data().name);
      setCategories(['Todos', ...cats]);
    } catch (error) { console.error('Error:', error); }
  };

 const loadVariants = async () => {
  try {
    const ownerId = getOwnerId() || user?.uid;
    if (!ownerId) return;
    const docRef = doc(db, 'settings', ownerId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setVariants(docSnap.data().variants || []);
    }
  } catch (error) { 
    console.error('Error:', error); 
  }
};

  const filteredProducts = products.filter(p => {
  const matchCat = selectedCategory === 'Todos' || 
    (selectedCategory === 'BAJO STOCK' && p.stock < 4) ||
    p.category === selectedCategory;
  
  // Filtro por variantes
  const matchVariants = selectedVariants.length === 0 || 
    selectedVariants.every(v => p.variants?.[v.id] === v.value);
  
  const matchSearch = !search || 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.barcode?.includes(search) || 
    p.category.toLowerCase().includes(search.toLowerCase());
    
  return matchCat && matchSearch && matchVariants;
});

  const totalStockValue = products.reduce((sum, p) => sum + (p.cost_price || 0) * p.stock, 0);
  const totalSaleValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
  const totalProducts = products.length;
  const lowStock = products.filter(p => p.stock < 4).length;
  

  const openNewDialog = () => {
  resetForm();
  setIsDialogOpen(true);
};

const resetForm = () => {
  setName('');
  setPrice('');
  setStock('');
  setCategory('');
  setBarcode('');
  setCostPrice('');
  setProductImage(''); // ← ESTA LÍNEA
  setEditingProduct(null);
  setSelectedVariantOptions({});
};

  const openEditDialog = (product: Product) => {
  setEditingProduct(product);
  setName(product.name);
  setPrice(product.price.toString());
  setStock(product.stock.toString());
  setCategory(product.category);
  setBarcode(product.barcode || '');
  setCostPrice(product.cost_price?.toString() || '');
  setProductImage(product.image || '');
  setSelectedVariantOptions(product.variants || {});
  setIsDialogOpen(true);
};

  const handleScan = (code: string) => {
    setBarcode(code);
    setScannerOpen(false);
    toast.success('Código escaneado');
  };

  const handleScanSearch = (code: string) => {
  setSearch(code);
  setScannerSearchOpen(false);
  toast.success('Código escaneado');
};
  

const handleSave = async () => {
  const ownerId = getOwnerId() || user?.uid;
  if (!ownerId || !name || !price || !stock || !category) {
    toast.error('Completa todos los campos');
    return;
  }
  
  try {
    const productData: any = {
      name,
      price: parseFloat(price),
      stock: parseInt(stock),
      category,
      barcode: barcode || '',
      cost_price: parseFloat(costPrice) || 0,
      userId: ownerId,
      image: productImage || '' // Guardar Base64 directamente
    };

    const variantsData: Record<string, string> = {};
    Object.entries(selectedVariantOptions).forEach(([key, value]) => {
      if (value) variantsData[key] = value;
    });
    if (Object.keys(variantsData).length > 0) {
      productData.variants = variantsData;
    }

    if (editingProduct) {
      await updateDoc(doc(db, 'products', editingProduct.id), productData);
      toast.success('Producto actualizado');
    } else {
      await addDoc(collection(db, 'products'), productData);
      toast.success('Producto agregado');
    }
    setIsDialogOpen(false);
    resetForm();
  } catch (error) {
    console.error('Error:', error);
    toast.error('Error al guardar');
  }
};

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      toast.success('Eliminado');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error');
    }
  };

  const handleAddCategory = async () => {
  const ownerId = getOwnerId() || user?.uid;
  if (!ownerId) {
    toast.error('Inicia sesión');
    return;
  }
    if (!newCategory.trim()) {
      toast.error('Escribe nombre');
      return;
    }
    if (categories.includes(newCategory.trim())) {
      toast.error('Ya existe');
      return;
    }
    try {
      await addDoc(collection(db, 'categories'), { name: newCategory.trim(), userId: ownerId });
      setCategories(prev => [...prev, newCategory.trim()]);
      setCategory(newCategory.trim());
      setNewCategory('');
      setIsCategoryDialogOpen(false);
      toast.success('Categoría agregada');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error');
    }
  };

  const handleDeleteCategory = async (cat: string) => {
  if (!confirm(`¿Eliminar "${cat}"?`)) return;
  try {
    const ownerId = getOwnerId() || user?.uid;
    if (!ownerId) return;
    const q = query(collection(db, 'categories'), where('userId', '==', ownerId), where('name', '==', cat));
      const snapshot = await getDocs(q);
      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, 'categories', docSnap.id));
      }
      setCategories(prev => prev.filter(c => c !== cat));
      setIsCategoryDialogOpen(false);
      toast.success('Categoría eliminada');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error');
    }
  };

  if (!user) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[60vh]">
        <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Inicia sesión</h2>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6"><h1>Cargando...</h1></div>;
  }

const groupedProducts = filteredProducts.reduce((groups: any[], product) => {
  // Agrupar por nombre + talle
  const talle = product.variants?.size || product.variants?.Talle || product.variants?.talle || '';
  const key = `${product.name}-${talle}`;
  
  const existingGroup = groups.find(g => g.key === key);
  
  if (existingGroup) {
    existingGroup.products.push(product);
  } else {
    groups.push({
      key,
      name: product.name,
      talle,
      products: [product]
    });
  }
  
  return groups;
}, []);

// Ordenar grupos por talle numérico
groupedProducts.sort((a, b) => {
  const talleA = parseInt(a.talle) || 999;
  const talleB = parseInt(b.talle) || 999;
  return talleA - talleB;
});


  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Inventario</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)}>
            <Tag className="h-4 w-4 mr-2" />Categorías
          </Button>
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />Nuevo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Productos</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold">{totalProducts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Costo Stock</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-orange-600">{formatPrice(totalStockValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Valor Venta</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-green-600">{formatPrice(totalSaleValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Bajo Stock</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-red-500">{lowStock}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-10"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setScannerSearchOpen(true)}
            >
              <ScanLine className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Badge
              variant={selectedCategory === 'Todos' ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setSelectedCategory('Todos')}
            >
              Todos
            </Badge>
            <Badge
              variant={selectedCategory === 'BAJO STOCK' ? 'destructive' : 'outline'}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setSelectedCategory('BAJO STOCK')}
            >
              BAJO STOCK
            </Badge>
            {categories.filter(c => c !== 'Todos').map((cat) => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                className="cursor-pointer whitespace-nowrap"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
          {variants.filter(v => v.options.length > 0).length > 0 && (
  <div className="flex gap-4 overflow-x-auto pb-2 px-1">
    {variants.filter(v => v.options.length > 0).map((variant) => (
      <div key={variant.id} className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground whitespace-nowrap">{variant.name}:</span>
        <select
          value={selectedVariants.find(v => v.id === variant.id)?.value || ''}
          onChange={(e) => {
            if (!e.target.value) {
              setSelectedVariants(prev => prev.filter(v => v.id !== variant.id));
            } else {
              setSelectedVariants(prev => [...prev.filter(v => v.id !== variant.id), { id: variant.id, value: e.target.value }]);
            }
          }}
          className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-xs min-w-[80px]"
        >
          <option value="">Todas</option>
          {variant.options.map((opt: any) => (
            <option key={opt.id} value={opt.name}>
              {opt.name}
            </option>
          ))}
        </select>
      </div>
    ))}
  </div>
)}
        </CardContent>
      </Card>

      {/* Products Table */}
<div className="overflow-x-auto">
  <table className="w-full text-sm">
    <thead className="border-b bg-muted/50">
      <tr>
        <th className="text-left p-2 font-semibold text-xs">Imagen</th>
        <th className="text-left p-2 font-semibold text-xs">Producto</th>
        {activeVariants.map((v) => (
          <th key={v.id} className="text-left p-2 font-semibold text-xs">{v.name}</th>
        ))}
        <th className="text-right p-2 font-semibold text-xs">Precio</th>
                <th className="text-right p-2 font-semibold text-xs">Costo</th>
        <th className="text-left p-2 font-semibold text-xs">Categoría</th>
        <th className="text-left p-2 font-semibold text-xs">Código</th>
        <th className="text-center p-2 font-semibold text-xs">Stock</th>
        <th className="text-center p-2 font-semibold text-xs">Acciones</th>
      </tr>
    </thead>
<tbody>
  {groupedProducts.map((group, groupIdx: number) => (
    <React.Fragment key={group.key}>
      {group.products.map((p: any, idx: number) => (
        <tr 
          key={p.id} 
          className={`hover:bg-transparent ${idx === group.products.length - 1 ? 'border-b-4 border-muted' : ''}`}
        >
          <td className="p-2">
            {p.image ? (
              <img src={p.image} alt={p.name} className="w-10 h-10 object-cover rounded" />
            ) : (
              <Package className="h-6 w-6 text-muted-foreground/30" />
            )}
          </td>
          <td className="p-2">
            {idx === 0 && <span className="font-medium text-xs">{group.name}</span>}
          </td>
          <td className="p-2">
            <Badge variant="secondary" className="text-[10px]">
              {p.variants?.color || p.variants?.Color || '-'}
            </Badge>
          </td>
          <td className="p-2">
            {idx === 0 && (
              <Badge variant="outline" className="text-[10px]">
                {group.talle || '-'}
              </Badge>
            )}
          </td>
          <td className="p-2 text-right font-medium text-green-600 text-xs">{formatPrice(p.price)}</td>
          <td className="p-2 text-right text-muted-foreground text-xs">{formatPrice(p.cost_price || 0)}</td>
          <td className="p-2">
            {idx === 0 && <Badge variant="secondary" className="text-[10px]">{p.category}</Badge>}
          </td>
          <td className="p-2 text-muted-foreground text-[10px]">{p.barcode || '-'}</td>
          <td className="p-2 text-center">
            <span className={`text-xs font-bold ${p.stock < 4 ? 'text-red-500' : ''}`}>{p.stock}</span>
          </td>
          <td className="p-2">
            <div className="flex justify-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => openEditDialog(p)}>
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(p.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </td>
        </tr>
      ))}
    </React.Fragment>
  ))}
</tbody>
  </table>
      {groupedProducts.length === 0 && (
      <div className="text-center py-12 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
        <p>No hay productos</p>
      </div>
    )}
</div>

{/* Product Dialog */}
<Dialog open={isDialogOpen} onOpenChange={(open) => {
  setIsDialogOpen(open);
  if (!open) resetForm();
}}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>{editingProduct ? 'Editar' : 'Nuevo'} Producto</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      {/* Imagen */}
      <div>
        <Label>Imagen del producto</Label>
        <div className="flex gap-2 items-center">
          <Input 
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (file.size > 1000000) {
                  toast.error('La imagen debe ser menor a 1MB');
                  return;
                }
                
                const reader = new FileReader();
                reader.onload = () => {
                  setProductImage(reader.result as string);
                };
                reader.onerror = () => {
                  toast.error('Error al leer la imagen');
                };
                reader.readAsDataURL(file);
              }
            }} 
          />
          {productImage && (
            <img 
              src={productImage} 
              alt="Preview" 
              className="w-10 h-10 object-cover rounded border bg-muted" 
            />
          )}
        </div>
      </div>
      
      <div>
        <Label>Nombre *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Precio *</Label>
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <Label>Stock *</Label>
          <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Categoría *</Label>
          {categories.length <= 1 ? (
            <div className="p-2 border rounded bg-muted text-sm text-muted-foreground">
              No hay categorías. Ve a "Categorías" para crear una.
            </div>
          ) : (
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Selecciona una categoría</option>
              {categories.filter(c => c !== 'Todos').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <Label>Costo</Label>
          <Input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="0.00" />
        </div>
      </div>
      
      <div>
        <Label>Código de Barras</Label>
        <div className="flex gap-2">
          <Input 
            value={barcode} 
            onChange={(e) => setBarcode(e.target.value)} 
            placeholder="Código de barras" 
          />
          <Button variant="outline" type="button" onClick={() => setScannerOpen(true)}>
            <ScanLine className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {variants.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <Label className="mb-2 block">Variantes</Label>
          <div className="space-y-3">
            {variants.map((variant) => (
              <div key={variant.id}>
                <Label className="text-xs text-muted-foreground">{variant.name}</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {variant.options.map((option) => (
                    <Button
                      key={option.id}
                      type="button"
                      variant={selectedVariantOptions[variant.id] === option.name ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedVariantOptions(prev => ({
                          ...prev,
                          [variant.id]: prev[variant.id] === option.name ? '' : option.name
                        }));
                      }}
                    >
                      {option.name}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
      <Button onClick={handleSave}>Guardar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* Categories Dialog */}
<Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
  <DialogContent>
    <DialogHeader>
            <DialogTitle>Categorías</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Nueva categoría"
          onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
        />
        <Button onClick={handleAddCategory}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.filter(c => c !== 'Todos').map((cat) => (
          <Badge key={cat} variant="outline" className="flex items-center gap-1 px-3 py-1">
            {cat}
            <button onClick={() => handleDeleteCategory(cat)}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  </DialogContent>
</Dialog>

{/* Scanner Dialog for Search */}
{scannerSearchOpen && (
  <ScannerDialog 
    onScan={handleScanSearch} 
    onClose={() => setScannerSearchOpen(false)} 
  />
)}

{/* Scanner Dialog for Add Product */}
{scannerOpen && (
  <ScannerDialog 
    onScan={handleScan} 
    onClose={() => setScannerOpen(false)} 
  />
)}
</div>
);
}