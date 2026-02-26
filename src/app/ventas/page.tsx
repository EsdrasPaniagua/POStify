"use client";

import { useState } from 'react';
import { Store, DollarSign, CreditCard, Wallet, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const demoSales = [
  { id: '1', date: '2024-01-15 14:30', total: 25.50, items: 3, payment: 'cash', seller: 'admin@demo.com' },
  { id: '2', date: '2024-01-15 13:15', total: 12.00, items: 2, payment: 'card', seller: 'admin@demo.com' },
  { id: '3', date: '2024-01-15 12:00', total: 45.75, items: 5, payment: 'transfer', seller: 'admin@demo.com' },
  { id: '4', date: '2024-01-15 10:45', total: 8.50, items: 1, payment: 'cash', seller: 'admin@demo.com' },
  { id: '5', date: '2024-01-14 18:30', total: 67.25, items: 8, payment: 'card', seller: 'admin@demo.com' },
];

export default function VentasPage() {
  const [search, setSearch] = useState('');

  const filteredSales = demoSales.filter(s => 
    s.id.includes(search) || 
    s.seller.toLowerCase().includes(search.toLowerCase())
  );

  const getPaymentIcon = (payment: string) => {
    switch (payment) {
      case 'cash': return <DollarSign className="h-4 w-4" />;
      case 'card': return <CreditCard className="h-4 w-4" />;
      case 'transfer': return <Wallet className="h-4 w-4" />;
      default: return null;
    }
  };

  const getPaymentLabel = (payment: string) => {
    switch (payment) {
      case 'cash': return 'Efectivo';
      case 'card': return 'Tarjeta';
      case 'transfer': return 'Transferencia';
      default: return payment;
    }
  };

  const getPaymentBadge = (payment: string) => {
    switch (payment) {
      case 'cash': return 'default';
      case 'card': return 'secondary';
      case 'transfer': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Historial de Ventas</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Todas las Ventas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar venta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">ID</th>
                  <th className="text-left p-3">Fecha</th>
                  <th className="text-left p-3">Items</th>
                  <th className="text-left p-3">Total</th>
                  <th className="text-left p-3">Método</th>
                  <th className="text-left p-3">Vendedor</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-mono text-sm">#{sale.id}</td>
                    <td className="p-3 text-sm">{sale.date}</td>
                    <td className="p-3">{sale.items}</td>
                    <td className="p-3 font-bold">${sale.total.toFixed(2)}</td>
                    <td className="p-3">
                      <Badge variant={getPaymentBadge(sale.payment) as any} className="flex items-center gap-1 w-fit">
                        {getPaymentIcon(sale.payment)}
                        {getPaymentLabel(sale.payment)}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{sale.seller}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}