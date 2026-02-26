"use client";

import { useState, useEffect } from 'react';
import { getOwnerId } from '@/src/lib/userId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Search, Trash2, User, DollarSign } from 'lucide-react';
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
const formatPrice = (price: number) => {
  return price.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).replace('ARS', '$');
};

export default function VentasPage() {
  const [user, loading] = useAuthState(auth);
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user || getOwnerId()) {
      loadSales();
    }
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
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sale[];
      setSales(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta venta?')) return;
    
    try {
      await deleteDoc(doc(db, 'sales', id));
      toast.success('Venta eliminada');
      loadSales();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar');
    }
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Efectivo';
      case 'card': return 'Tarjeta';
      case 'transfer': return 'Transferencia';
      default: return method;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateCommission = (sale: Sale) => {
  if (!sale.employeeId) return 0;
  
  // Calcular costo total de los productos
  const totalCost = sale.productsList?.reduce((sum, item) => {
    return sum + ((item.costPrice || 0) * item.qty);
  }, 0) || 0;
  
  // Ganancia neta = Total - Costo
  const netProfit = sale.total - totalCost;
  
  // Si no hay ganancia, comisión = 0
  if (netProfit <= 0) return 0;
  
  const percent = sale.employeeCommissionPercent || 10;
  return netProfit * (percent / 100);
};

  const filteredSales = sales.filter(sale => 
    sale.products.toLowerCase().includes(search.toLowerCase()) ||
    sale.paymentMethod.toLowerCase().includes(search.toLowerCase()) ||
    sale.employeeName?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCommission = filteredSales.reduce((sum, sale) => sum + calculateCommission(sale), 0);

  if (!user && !getOwnerId()) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[60vh]">
        <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Inicia sesión</h2>
        <p className="text-muted-foreground">Necesitas iniciar sesión para ver las ventas</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6"><h1>Cargando...</h1></div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Historial de Ventas</h1>
        {totalCommission > 0 && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <DollarSign className="h-3 w-3 mr-1" />
            Comisiones: {formatPrice(totalCommission)}
          </Badge>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ventas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left p-3 font-semibold">Fecha</th>
              <th className="text-right p-3 font-semibold">Total</th>
              <th className="text-center p-3 font-semibold">Items</th>
              <th className="text-left p-3 font-semibold">Pago</th>
              <th className="text-left p-3 font-semibold">Vendedor</th>
              <th className="text-right p-3 font-semibold">Comisión</th>
              <th className="text-left p-3 font-semibold">Productos</th>
              <th className="text-center p-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((sale) => {
              const commission = calculateCommission(sale);
              return (
                <tr key={sale.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 text-xs">{formatDate(sale.createdAt)}</td>
                  <td className="p-3 text-right font-bold text-green-600">{formatPrice(sale.total)}</td>
                  <td className="p-3 text-center">{sale.items}</td>
                  <td className="p-3">
                    <Badge variant="outline">{getPaymentLabel(sale.paymentMethod)}</Badge>
                  </td>
                  <td className="p-3">
                    {sale.employeeName ? (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-blue-500" />
                        <span className="text-sm">{sale.employeeName}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {commission > 0 ? (
                      <div>
                        <span className="text-sm font-medium text-green-600">+{formatPrice(commission)}</span>
                        <span className="text-xs text-muted-foreground ml-1">({sale.employeeCommissionPercent || 10}%)</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">
                    {sale.products}
                  </td>
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
        
        {filteredSales.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>No hay ventas</p>
          </div>
        )}
      </div>
    </div>
  );
}