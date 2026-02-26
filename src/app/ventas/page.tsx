"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Search, Trash2 } from 'lucide-react';
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
  createdAt: string;
}

export default function VentasPage() {
  const [user, loading] = useAuthState(auth);
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user) {
      loadSales();
    }
  }, [user]);

  const loadSales = async () => {
    try {
      const q = query(
        collection(db, 'sales'),
        where('userId', '==', user?.uid),
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

  const filteredSales = sales.filter(sale => 
    sale.products.toLowerCase().includes(search.toLowerCase()) ||
    sale.paymentMethod.toLowerCase().includes(search.toLowerCase())
  );

  if (!user) {
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
      <h1 className="text-2xl font-bold mb-6">Historial de Ventas</h1>

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

      <Card>
        <CardHeader>
          <CardTitle>Ventas ({filteredSales.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No hay ventas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-semibold text-lg">${sale.total.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{sale.items} items</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(sale.createdAt)}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate max-w-[300px]">
                      {sale.products}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{getPaymentLabel(sale.paymentMethod)}</Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(sale.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}