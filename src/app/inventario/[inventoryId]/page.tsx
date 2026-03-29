// Updated code for src/app/inventario/[inventoryId]/page.tsx

import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BrowserMultiFormatReader } from '@zxing/library';
import { getOwnerId } from '@/src/lib/userId';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/src/components/Dialog';
import { Package, Search, Plus, Trash2, Edit2, DollarSign, ShoppingCart, Tag, X, ScanLine, ArrowLeft, Warehouse, ChevronDown, Upload } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, getDocs, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  category?: string;
  barcode?: string;
  variants?: Record<string, string>;
  cost_price?: number;
  inventoryId?: string;
}

interface Inventory {
  id: string;
  name: string;
  color: string;
}

interface Variant {
  id: string;
  name: string;
  options: { id: string; name: string }[];
}

const formatPrice = (value: number) => `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const ScannerDialog = ({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    readerRef.current = new BrowserMultiFormatReader();
    readerRef.current.listVideoInputDevices()
      .then((devices) => {
        if (devices.length === 0) { toast.error('No se encontró cámara'); return; }
        const back = devices.find((d: any) => d.label.toLowerCase().includes('back')) || devices[0];
        readerRef.current?.decodeFromVideoDevice(back.deviceId, videoRef.current!, (result) => {
          if (result) onScan(result.getText());
        });
      })
      .catch(() => toast.error('Error al acceder a la cámara'));
    return () => { readerRef.current?.reset(); };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-card rounded-2xl p-4 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Escanear Códig
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
};

export default function InventarioPage() {
  const params = useParams();
  const router = useRouter();
  const inventoryId = params?.inventoryId as string;

  const [user, loading] = useAuthState(auth);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [currentInventory, setCurrentInventory] = useState<Inventory | null>(null);
  const [inventories, setInventories] = useState<Inventory[]>([]);

  const activeVariants = variants.filter(v =>
    v.options.length > 0 &&
    products.some(p => p.variants && p.variants[v.id])
  );

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerSearchOpen, setScannerSearchOpen] = useState(false);
  const [pedidoMode, setPedidoMode] = useState(false);
  const [pedidoCantidades, setPedidoCantidades] = useState<Record<string, number>>({});
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [selectedVariants, setSelectedVariants] = useState<{ id: string; value: string }[]>([]);
  const [showLowStock, setShowLowStock] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('');
  const [barcode, setBarcode] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [productImage, setProductImage] = useState<string | null>(null);
  const [productImagePreview, setProductImagePreview] = useState('');
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadInventories();
      loadProducts();
      loadCategories();
      loadVariants();
    }
  }, [user, inventoryId]);

  const loadInventories = async () => {
    try {
      const ownerId = getOwnerId() || user?.uid;
      if (!ownerId) return;
      const docSnap = await getDoc(doc(db, 'settings', ownerId));
      if (docSnap.exists()) {
        const invs: Inventory[] = docSnap.data().inventories || [];
        setInventories(invs);
        const found = invs.find(i => i.id === inventoryId);
        setCurrentInventory(found || null);
      }
    } catch (error) { console.error('Error:', error); }
  };

  const loadProducts = async () => {
    try {
      const ownerId = getOwnerId() || user?.uid;
      if (!ownerId) return;
      const q = query(collection(db, 'products'), where('userId', '==', ownerId));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
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
      setCategories(['Todos', ...snapshot.docs.map(doc => doc.data().name)]);
    } catch (error) { console.error('Error:', error); }
  };

  const loadVariants = async () => {
    try {
      const ownerId = getOwnerId() || user?.uid;
      if (!ownerId) return;
      const docSnap = await getDoc(doc(db, 'settings', ownerId));
      if (docSnap.exists()) setVariants(docSnap.data().variants || []);
    } catch (error) { console.error('Error:', error); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error('La imagen debe ser menor a 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setProductImage(base64);
      setProductImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const saveProduct = async () => {
    try {
      if (!name || !price || !stock || !category) { toast.error('Completá los campos requeridos'); return; }
      const ownerId = getOwnerId() || user?.uid;
      if (!ownerId) return;

      const productData = {
        name,
        price: parseFloat(price),
        stock: parseInt(stock),
        category,
        barcode,
        cost_price: costPrice ? parseFloat(costPrice) : undefined,
        image: productImage,
        variants: selectedVariantOptions,
        userId: ownerId,
        inventoryId,
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
        toast.success('Producto actualizado');
      } else {
        await addDoc(collection(db, 'products'), productData);
        toast.success('Producto creado');
      }
      closeDialog();
    } catch { toast.error('Error'); }
  };

  const deleteProduct = async (id: string) => {
    try {
      const ownerId = getOwnerId() || user?.uid;
      if (!ownerId) return;
      await deleteDoc(doc(db, 'products', id));
      toast.success('Producto eliminado');
    } catch { toast.error('Error'); }
  };

  const openNewDialog = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setStock('');
    setCategory('');
    setBarcode('');
    setCostPrice('');
    setProductImage(null);
    setProductImagePreview('');
    setSelectedVariantOptions({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(product.price.toString());
    setStock(product.stock.toString());
    setCategory(product.category || '');
    setBarcode(product.barcode || '');
    setCostPrice(product.cost_price?.toString() || '');
    setProductImage(product.image || null);
    setProductImagePreview(product.image || '');
    setSelectedVariantOptions(product.variants || {});
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    setSelectedVariantOptions({});
    setProductImage(null);
    setProductImagePreview('');
  };

  const addCategory = async (cat: string) => {
    try {
      const ownerId = getOwnerId() || user?.uid;
      if (!ownerId) return;
      await addDoc(collection(db, 'categories'), { userId: ownerId, name: cat });
      setNewCategory('');
      toast.success('Categoría creada');
    } catch { toast.error('Error'); }
  };

  const deleteCategory = async (cat: string) => {
    try {
      const ownerId = getOwnerId() || user?.uid;
      if (!ownerId) return;
      const q = query(collection(db, 'categories'), where('userId', '==', ownerId), where('name', '==', cat));
      const snapshot = await getDocs(q);
      for (const docSnap of snapshot.docs) await deleteDoc(doc(db, 'categories', docSnap.id));
      setCategories(prev => prev.filter(c => c !== cat));
      setIsCategoryDialogOpen(false);
      toast.success('Categoría eliminada');
    } catch { toast.error('Error'); }
  };

  if (!user) return (
    <div className="p-6 flex flex-col items-center justify-center h-[60vh]">
      <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <h2 className="text-xl font-semibold">Inicia sesión</h2>
    </div>
  );

  if (loading) return <div className="p-6">Cargando...</div>;

  const filteredProducts = products
    .filter(p => p.inventoryId === inventoryId)
    .filter(p => selectedCategory === 'Todos' || p.category === selectedCategory)
    .filter(p => !showLowStock || p.stock < 4)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search));

  const groupedProducts = filteredProducts.reduce((groups: any[], product) => {
    const talle = product.variants?.size || product.variants?.Talle || product.variants?.talle || '';
    const key = `${product.name}-${talle}`;
    const existing = groups.find(g => g.key === key);
    if (existing) existing.products.push(product);
    else groups.push({ key, name: product.name, talle, products: [product] });
    return groups;
  }, []).sort((a, b) => (parseInt(a.talle) || 999) - (parseInt(b.talle) || 999));

  const generarPDF = () => {
    const items = filteredProducts.filter(p => (pedidoCantidades[p.id] || 0) > 0);
    if (items.length === 0) { toast.error('Ingresá al menos una cantidad'); return; }
    const rows = items.map(p => `
      <tr>
        <td style="padding:8px;border:1px solid #e2e8f0">${p.name}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${Object.values(p.variants || {}).join(' / ') || '-'}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;font-weight:bold;color:#2563eb">${pedidoCantidades[p.id]}</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Pedido — ${currentInventory?.name || ''}</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;color:#1e293b}h1{font-size:22px;margin-bottom:4px}
    .inv{display:inline-block;padding:4px 12px;border-radius:20px;color:#fff;font-size:13px;margin-bottom:16px}
    p.fecha{color:#64748b;font-size:13px;margin-bottom:24px}table{width:100%;border-collapse:collapse;font-size:14px}
    thead tr{background:#f1f5f9}th{padding:10px 8px;border:1px solid #e2e8f0;text-align:left;font-weight:600}
    tr:nth-child(even){background:#f8fafc}.total{margin-top:16px;text-align:right;font-size:14px;color:#475569}</style>
    </head><body>
    <h1>Orden de Pedido</h1>
    <span class="inv" style="background:${currentInventory?.color || '#6b7280'}">${currentInventory?.name || 'Inventario'}</span>
    <p class="fecha">Generado: ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    <table><thead><tr><th>Producto</th><th style="text-align:center">Variantes</th><th style="text-align:center">Cantidad a pedir</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p class="total">Total: <strong>${items.length}</strong> productos | <strong>${items.reduce((s, p) => s + (pedidoCantidades[p.id] || 0), 0)}</strong> unidades</p>
    </body></html>`;
    const win = window.open('', '_blank');
    if (!win) { toast.error('Permitir popups para generar el PDF'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const invColor = currentInventory?.color || '#6b7280';
  const invColorLight = invColor + '20';
  const invColorMid = invColor + '40';

  const totalStockValue = filteredProducts.reduce((sum, p) => sum + (p.cost_price || 0) * p.stock, 0);
  const totalSaleValue = filteredProducts.reduce((sum, p) => sum + p.price * p.stock, 0);

  return (
    <div className="p-4 sm:p-6">
      <div
        className="flex items-center gap-3 mb-5 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-sm"
        style={{ backgroundColor: invColor }}
      >
        <button onClick={() => router.push('/inventario')} className="hover:opacity-70 transition-opacity">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Warehouse className="h-4 w-4" />
        <span className="font-semibold">{currentInventory ? currentInventory.name : 'Cargando...'}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold" style={{ color: invColor }}>
          {currentInventory?.name || 'Inventario'}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)} style={{ borderColor: invColorMid }}>
            <Tag className="h-4 w-4 mr-2" />Categorías
          </Button>
          <Button onClick={openNewDialog} style={{ backgroundColor: invColor }}>
            <Plus className="h-4 w-4 mr-2" />Nuevo producto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card style={{ borderColor: invColorMid }}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4" style={{ color: invColor }} />
              <span className="text-xs text-muted-foreground">Costo Stock</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-orange-600">{formatPrice(totalStockValue)}</p>
          </CardContent>
        </Card>

        <Card style={{ borderColor: invColorMid }}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4" style={{ color: invColor }} />
              <span className="text-xs text-muted-foreground">Valor Venta</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-green-600">{formatPrice(totalSaleValue)}</p>
          </CardContent>
        </Card>

        <Card style={{ borderColor: invColorMid }}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="h-4 w-4" style={{ color: invColor }} />
              <span className="text-xs text-muted-foreground">Total Stock</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold">{filteredProducts.reduce((sum, p) => sum + p.stock, 0)}</p>
          </CardContent>
        </Card>

        <Card style={{ borderColor: invColorMid }}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4" style={{ color: invColor }} />
              <span className="text-xs text-muted-foreground">Productos</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold">{filteredProducts.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4" style={{ borderColor: invColorMid }}>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground mb-2 font-semibold">Top productos en stock</p>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {Array.from(
              filteredProducts.reduce((map, p) => {
                map.set(p.name, (map.get(p.name) || 0) + p.stock);
                return map;
              }, new Map<string, number>())
            )
              .map(([name, stock]) => ({ name, stock }))
              .filter(i => i.stock > 0)
              .sort((a, b) => b.stock - a.stock)
              .map(({ name, stock }) => (
                <div key={name} className="flex justify-between text-xs">
                  <span className="truncate">{name}</span>
                  <span className="font-bold">{stock}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4" style={{ borderColor: invColorMid }}>
        <CardContent className="pt-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en este inventario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-10"
            />
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setScannerSearchOpen(true)}>
              <ScanLine className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <button
              onClick={() => { const n = !showLowStock; setShowLowStock(n); if (!n) { setPedidoMode(false); setPedidoCantidades({}); } }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border font-medium transition-colors ${showLowStock
                ? 'bg-red-500 text-white border-red-500'
                : 'bg-background text-red-500 border-red-300 hover:bg-red-50 dark:hover:bg-red-950'}`}
            >
              <Package className="h-3 w-3" />
              Bajo Stock
              {showLowStock && (
                <span className="ml-1 bg-white/30 rounded-full px-1.5 text-[10px]">
                  {filteredProducts.filter(p => p.stock < 4).length}
                </span>
              )}
            </button>

            <button
              disabled={!showLowStock}
              onClick={() => { setPedidoMode(p => !p); setPedidoCantidades({}); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border font-medium transition-colors ${!showLowStock
                ? 'opacity-30 cursor-not-allowed border-muted text-muted-foreground'
                : pedidoMode
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-background text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950'}`}
            >
              <Plus className="h-3 w-3" />Hacer Pedido
            </button>

            {pedidoMode && (
              <button
                onClick={generarPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border font-medium bg-green-500 text-white border-green-500 hover:bg-green-600 transition-colors"
              >
                Generar PDF
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border font-medium transition-colors bg-background text-foreground border-input hover:bg-muted"
              >
                <span>Categorías: <span className="font-semibold">{selectedCategory}</span></span>
                <ChevronDown className={`h-3 w-3 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {categoryDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 bg-card border rounded-lg shadow-lg z-50 min-w-48">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setCategoryDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${selectedCategory === cat
                        ? 'bg-muted font-semibold'
                        : 'hover:bg-muted/50'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card style={{ borderColor: invColorMid, overflow: 'hidden' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b" style={{ backgroundColor: invColorLight }}>
              <tr>
                <th className="text-left p-2 font-semibold text-xs">Imagen</th>
                <th className="text-left p-2 font-semibold text-xs">Producto</th>
                {activeVariants.map(v => (
                  <th key={v.id} className="text-left p-2 font-semibold text-xs">{v.name}</th>
                ))}
                <th className="text-right p-2 font-semibold text-xs">Precio</th>
                <th className="text-right p-2 font-semibold text-xs">Costo</th>
                <th className="text-left p-2 font-semibold text-xs">Categoría</th>
                <th className="text-left p-2 font-semibold text-xs">Código</th>
                <th className="text-center p-2 font-semibold text-xs">Stock</th>
                {pedidoMode && <th className="text-center p-2 font-semibold text-xs text-blue-600">Pedir</th>}
                <th className="text-center p-2 font-semibold text-xs">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {groupedProducts.map((group) => (
                <React.Fragment key={group.key}>
                  {group.products.map((p: Product, idx: number) => (
                    <tr key={p.id} className={`hover:bg-muted/30 ${idx === group.products.length - 1 ? 'border-b-4 border-muted' : ''}`}>
                      <td className="p-2">
                        {p.image
                          ? <img src={p.image} alt={p.name} className="w-10 h-10 object-cover rounded" />
                          : <Package className="h-6 w-6 text-muted-foreground/30" />
                        }
                      </td>
                      <td className="p-2">
                        <p className="font-medium text-xs">{p.name}</p>
                      </td>
                      {activeVariants.map(v => (
                        <td key={v.id} className="p-2 text-xs text-muted-foreground">
                          {idx === 0 && (p.variants?.[v.id] || '-')}
                        </td>
                      ))}
                      <td className="p-2 text-right font-semibold text-xs">{formatPrice(p.price)}</td>
                      <td className="p-2 text-right text-xs text-muted-foreground">{formatPrice(p.cost_price || 0)}</td>
                      <td className="p-2">
                        <Badge variant="secondary" className="text-[10px]" style={{ backgroundColor: invColorLight, color: invColor }}>
                          {p.category || '-'}
                        </Badge>
                      </td>
                      <td className="p-2 text-left text-muted-foreground text-[10px]">{p.barcode || '-'}</td>
                      <td className="p-2 text-center">
                        <span className={`text-xs font-bold ${p.stock < 4 ? 'text-red-500' : ''}`}>{p.stock}</span>
                      </td>
                      {pedidoMode && (
                        <td className="p-2 text-center">
                          <input
                            type="number" min="0"
                            value={pedidoCantidades[p.id] || ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setPedidoCantidades(prev => ({ ...prev, [p.id]: val }));
                            }}
                            placeholder="0"
                            className="w-12 h-8 border rounded text-center text-xs"
                          />
                        </td>
                      )}
                      <td className="p-2 text-center flex gap-1 justify-center">
                        <button onClick={() => openEditDialog(p)} className="p-1.5 hover:bg-muted rounded transition-colors">
                          <Edit2 className="h-3.5 w-3.5 text-blue-600" />
                        </button>
                        <button onClick={() => deleteProduct(p.id)} className="p-1.5 hover:bg-muted rounded transition-colors">
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar' : 'Nuevo'} Producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Nombre *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del producto" />
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
                  <div className="p-2 border rounded bg-muted text-sm text-muted-foreground">Sin categorías. Creá una arriba.</div>
                ) : (
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Selecciona una</option>
                    {categories.slice(1).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                )}
              </div>
              <div>
                <Label>Código Barras</Label>
                <div className="flex gap-2">
                  <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Código" />
                  <Button variant="outline" size="icon" onClick={() => setScannerOpen(true)}>
                    <ScanLine className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <Label>Costo</Label>
              <Input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Imagen (máx 1MB)</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium transition-colors hover:bg-muted"
                >
                  <Upload className="h-4 w-4" />
                  Subir imagen
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              {productImagePreview && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={productImagePreview} alt="Preview" className="h-16 w-16 object-cover rounded" />
                  <button
                    onClick={() => {
                      setProductImage(null);
                      setProductImagePreview('');
                    }}
                    className="p-1 hover:bg-muted rounded text-xs text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            {variants.map(v => (
              <div key={v.id}>
                <Label>{v.name}</Label>
                <select value={selectedVariantOptions[v.id] || ''} onChange={(e) => setSelectedVariantOptions(prev => ({ ...prev, [v.id]: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Sin {v.name}</option>
                  {v.options.map(opt => <option key={opt.id} value={opt.name}>{opt.name}</option>)}
                </select>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={saveProduct} style={{ backgroundColor: invColor }}>
              {editingProduct ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gestionar Categorías</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Nueva categoría" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCategory(newCategory)} />
              <Button onClick={() => addCategory(newCategory)} style={{ backgroundColor: invColor }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {categories.slice(1).map(cat => (
                <div key={cat} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="text-sm">{cat}</span>
                  <button onClick={() => deleteCategory(cat)} className="p-1 hover:bg-background rounded">
                    <X className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {scannerSearchOpen && <ScannerDialog onScan={(c) => { setSearch(c); setScannerSearchOpen(false); toast.success('Código escaneado'); }} onClose={() => setScannerSearchOpen(false)} />}
      {scannerOpen && <ScannerDialog onScan={(c) => { setBarcode(c); setScannerOpen(false); toast.success('Código escaneado'); }} onClose={() => setScannerOpen(false)} />}
    </div>
  );
}
