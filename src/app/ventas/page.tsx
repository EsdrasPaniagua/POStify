"use client";

import { useState, useEffect } from 'react';
import { getOwnerId } from '@/src/lib/userId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Search, Trash2, User, TrendingUp, ShoppingCart, Store } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs, query, where, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';
import { toast } from 'sonner';

interface Sale {
  id: string;
  total: number;
  items: number;
  paymentMethod: string;
  products: string;
  productsList?: {
    name: string;
    qty: number;
    price: number;
    costPrice: number;
    category: string;
  }[];
  createdAt: string;
  employeeId?: string;
  employeeName?: string;
  employeeCommissionPercent?: number;
}

type Period = 'today' | 'week' | 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy',
  week: 'Semana',
  month: 'Mes',
  year: 'Año',
};

const formatPrice = (price: number) =>
  price.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).replace('ARS', '$');

const calcProfit = (sale: Sale): number => {
  if (!sale.productsList?.length) return 0;
  const cost = sale.productsList.reduce((sum, i) => sum + (i.costPrice || 0) * i.qty, 0);
  return sale.total - cost;
};

const calcCommission = (sale: Sale): number => {
  if (!sale.employeeId || sale.employeeId === 'owner') return 0;
  const profit = calcProfit(sale);
  if (profit <= 0) return 0;
  return profit * ((sale.employeeCommissionPercent || 10) / 100);
};

const getPeriodStart = (period: Period): Date => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === 'today') return start;
  if (period === 'week') { start.setDate(start.getDate() - 6); return start; }
  if (period === 'month') { start.setDate(1); return start; }
  if (period === 'year') { start.setMonth(0, 1); return start; }
  return start;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const getPaymentLabel = (method: string) => {
  switch (method) {
    case 'cash': return 'Efectivo';
    case 'card': return 'Tarjeta';
    case 'transfer': return 'Transferencia';
    default: return method;
  }
};

// ─── Tarjeta de métricas por vendedor ───────────────────────────────────────
const SellerCard = ({
  name, isOwner, sales,
}: {
  name: string;
  isOwner: boolean;
  sales: Sale[];
}) => {
  const bruto = sales.reduce((s, v) => s + v.total, 0);
  const neto = sales.reduce((s, v) => s + calcProfit(v), 0);
  const commission = sales.reduce((s, v) => s + calcCommission(v), 0);
  const units = sales.reduce((s, v) => s + (v.items || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          {isOwner
            ? <Store className="h-4 w-4 text-primary" />
            : <User className="h-4 w-4 text-blue-500" />
          }
          {name}
          <Badge variant={isOwner ? 'default' : 'secondary'} className="ml-auto text-[10px]">
            {isOwner ? 'Dueño' : 'Empleado'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground">Ventas</p>
          <p className="text-xl font-bold">{sales.length}</p>
          <p className="text-[10px] text-muted-foreground">{units} unidades</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Recaudado</p>
          <p className="text-xl font-bold text-foreground">{formatPrice(bruto)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Ganancia neta</p>
          <p className="text-xl font-bold text-green-600">{formatPrice(neto)}</p>
        </div>
        {!isOwner && (
          <div>
            <p className="text-[10px] text-muted-foreground">Comisión</p>
            <p className="text-xl font-bold text-blue-600">{formatPrice(commission)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function VentasPage() {
  const [user, loading] = useAuthState(auth);
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<Period>('today');

  useEffect(() => {
    if (user || getOwnerId()) loadSales();
  }, [user]);

  const loadSales = async () => {
    try {
      const ownerId = getOwnerId() || user?.uid;
      if (!ownerId) return;
      const q = query(
        collection(db, 'sales'),
        where('userId', '==', ownerId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
    } catch (error) { console.error('Error:', error); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta venta?')) return;
    try {
      await deleteDoc(doc(db, 'sales', id));
      toast.success('Venta eliminada');
      loadSales();
    } catch (error) { toast.error('Error al eliminar'); }
  };

  // Filtrar por período
  const periodStart = getPeriodStart(period);
  const salesInPeriod = sales.filter(s => new Date(s.createdAt) >= periodStart);

  // Filtrar por búsqueda dentro del período
  const filteredSales = salesInPeriod.filter(s =>
    !search ||
    s.products.toLowerCase().includes(search.toLowerCase()) ||
    s.paymentMethod.toLowerCase().includes(search.toLowerCase()) ||
    s.employeeName?.toLowerCase().includes(search.toLowerCase())
  );

  // Agrupar por vendedor para las métricas
  const sellerMap = new Map<string, { name: string; isOwner: boolean; sales: Sale[] }>();

  salesInPeriod.forEach(sale => {
    const key = sale.employeeId || 'owner';
    const name = sale.employeeName || 'Dueño';
    const isOwner = key === 'owner' || key === sale.employeeId && name === 'DUEÑO';
    if (!sellerMap.has(key)) sellerMap.set(key, { name, isOwner: name === 'DUEÑO' || !sale.employeeId || sale.employeeId === 'owner', sales: [] });
    sellerMap.get(key)!.sales.push(sale);
  });

  const sellers = Array.from(sellerMap.values()).sort((a, b) => Number(b.isOwner) - Number(a.isOwner));

  // Totales globales del período
  const totalBruto = salesInPeriod.reduce((s, v) => s + v.total, 0);
  const totalNeto = salesInPeriod.reduce((s, v) => s + calcProfit(v), 0);
  const totalComisiones = salesInPeriod.reduce((s, v) => s + calcCommission(v), 0);

  if (!user && !getOwnerId()) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[60vh]">
        <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Inicia sesión</h2>
      </div>
    );
  }

  if (loading) return <div className="p-6"><h1>Cargando...</h1></div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Historial de Ventas</h1>

      {/* Selector de período */}
      <div className="flex gap-2 mb-6">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <Button
            key={p}
            variant={period === p ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(p)}
          >
            {PERIOD_LABELS[p]}
          </Button>
        ))}
      </div>

      {/* Sin ventas en el período */}
      {salesInPeriod.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ShoppingCart className="h-16 w-16 opacity-20 mb-4" />
          <p className="text-lg font-medium">Sin ventas {PERIOD_LABELS[period].toLowerCase()}</p>
          <p className="text-sm">Las ventas aparecerán aquí cuando se registren</p>
        </div>
      ) : (
        <>
          {/* Resumen global del período */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Recaudado</p>
                <p className="text-xl font-bold">{formatPrice(totalBruto)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Ganancia neta</p>
                <p className="text-xl font-bold text-green-600">{formatPrice(totalNeto)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Comisiones</p>
                <p className="text-xl font-bold text-blue-600">{formatPrice(totalComisiones)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Métricas por vendedor */}
          {sellers.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Por vendedor
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sellers.map(seller => (
                  <SellerCard
                    key={seller.name}
                    name={seller.name === 'DUEÑO' ? 'Dueño' : seller.name}
                    isOwner={seller.isOwner}
                    sales={seller.sales}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Buscador */}
          <Card className="mb-4">
            <CardContent className="pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar en ventas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabla de ventas */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-semibold">Fecha</th>
                  <th className="text-right p-3 font-semibold">Total</th>
                  <th className="text-right p-3 font-semibold">Ganancia</th>
                  <th className="text-center p-3 font-semibold">Items</th>
                  <th className="text-left p-3 font-semibold">Pago</th>
                  <th className="text-left p-3 font-semibold">Vendedor</th>
                  <th className="text-right p-3 font-semibold">Comisión</th>
                  <th className="text-left p-3 font-semibold">Productos</th>
                  <th className="text-center p-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => {
                  const profit = calcProfit(sale);
                  const commission = calcCommission(sale);
                  const isOwner = !sale.employeeId || sale.employeeId === 'owner' || sale.employeeName === 'DUEÑO';
                  return (
                    <tr key={sale.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 text-xs">{formatDate(sale.createdAt)}</td>
                      <td className="p-3 text-right font-bold">{formatPrice(sale.total)}</td>
                      <td className="p-3 text-right font-medium text-green-600">{formatPrice(profit)}</td>
                      <td className="p-3 text-center">{sale.items}</td>
                      <td className="p-3">
                        <Badge variant="outline">{getPaymentLabel(sale.paymentMethod)}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {isOwner
                            ? <Store className="h-3 w-3 text-primary" />
                            : <User className="h-3 w-3 text-blue-500" />
                          }
                          <span className="text-sm">{isOwner ? 'Dueño' : sale.employeeName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        {commission > 0 ? (
                          <span className="text-sm font-medium text-blue-600">{formatPrice(commission)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground max-w-[180px] truncate">{sale.products}</td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(sale.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredSales.length === 0 && search && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay resultados para "{search}"</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}