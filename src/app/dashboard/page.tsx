"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Package, TrendingUp, TrendingDown, Users, CreditCard, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Datos de ejemplo
const stats = {
  salesToday: 125.50,
  salesYesterday: 112.00,
  transactionsToday: 24,
  transactionsYesterday: 19,
  products: 156,
  lowStock: 3,
  totalClients: 89,
  newClientsToday: 5,
};

const weeklySales = [
  { day: 'Lun', sales: 450, transactions: 32 },
  { day: 'Mar', sales: 520, transactions: 41 },
  { day: 'Mié', sales: 380, transactions: 28 },
  { day: 'Jue', sales: 610, transactions: 48 },
  { day: 'Vie', sales: 720, transactions: 56 },
  { day: 'Sáb', sales: 890, transactions: 67 },
  { day: 'Dom', sales: 340, transactions: 25 },
];

const topProducts = [
  { name: 'Coca Cola 600ml', sales: 45, revenue: 67.50 },
  { name: 'Galletas Oreo', sales: 32, revenue: 40.00 },
  { name: 'Papas Sabritas', sales: 28, revenue: 28.00 },
  { name: 'Agua Natural 500ml', sales: 25, revenue: 18.75 },
  { name: 'Cerveza Corona', sales: 18, revenue: 36.00 },
];

const recentSales = [
  { id: '1', time: '14:32', total: 25.50, items: 3, payment: 'cash' },
  { id: '2', time: '13:15', total: 12.00, items: 2, payment: 'card' },
  { id: '3', time: '12:00', total: 45.75, items: 5, payment: 'transfer' },
  { id: '4', time: '10:45', total: 8.50, items: 1, payment: 'cash' },
  { id: '5', time: '09:30', total: 33.25, items: 4, payment: 'card' },
];

export default function DashboardPage() {
  const salesChange = ((stats.salesToday - stats.salesYesterday) / stats.salesYesterday * 100).toFixed(1);
  const transactionsChange = ((stats.transactionsToday - stats.transactionsYesterday) / stats.transactionsYesterday * 100).toFixed(1);
  const maxSales = Math.max(...weeklySales.map(s => s.sales));

  const getPaymentLabel = (payment: string) => {
    switch (payment) {
      case 'cash': return 'Efectivo';
      case 'card': return 'Tarjeta';
      case 'transfer': return 'Transferencia';
      default: return payment;
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Tarjetas de estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-green-400 to-green-600" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ventas Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">${stats.salesToday.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  {parseFloat(salesChange) >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                  )}
                  <span className={parseFloat(salesChange) >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {salesChange}%
                  </span>
                  vs ayer
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-blue-400 to-blue-600" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transacciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.transactionsToday}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  {parseFloat(transactionsChange) >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                  )}
                  <span className={parseFloat(transactionsChange) >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {transactionsChange}%
                  </span>
                  vs ayer
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-purple-400 to-purple-600" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.products}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.lowStock} bajo stock
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-orange-400 to-orange-600" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.totalClients}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  +{stats.newClientsToday} nuevos hoy
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segunda fila: Gráfico y Productos top */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gráfico de ventas semanal */}
        <Card>
          <CardHeader>
            <CardTitle>Ventas de la Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-around gap-2">
              {weeklySales.map((day, i) => (
                <div key={i} className="flex flex-col items-center gap-2 flex-1">
                  <div 
                    className="w-full bg-gradient-to-t from-primary to-primary/50 rounded-t-lg transition-all hover:opacity-80"
                    style={{ height: `${(day.sales / maxSales) * 100}%`, minHeight: '20px' }}
                    title={`$${day.sales}`}
                  />
                  <span className="text-xs text-muted-foreground">{day.day}</span>
                  <span className="text-xs font-medium">${day.sales}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Productos más vendidos */}
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sales} ventas</p>
                    </div>
                  </div>
                  <span className="font-bold text-primary">${product.revenue.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tercera fila: Ventas recientes y Métodos de pago */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Ventas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Venta #{sale.id}</p>
                      <p className="text-xs text-muted-foreground">{sale.time} • {sale.items} items</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${sale.total.toFixed(2)}</p>
                    <Badge variant="outline" className="text-xs">
                      {getPaymentLabel(sale.payment)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Métodos de pago */}
        <Card>
          <CardHeader>
            <CardTitle>Métodos de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Efectivo</p>
                    <p className="text-xs text-muted-foreground">12 transacciones</p>
                  </div>
                </div>
                <p className="font-bold text-green-600">$520.00</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Tarjeta</p>
                    <p className="text-xs text-muted-foreground">8 transacciones</p>
                  </div>
                </div>
                <p className="font-bold text-blue-600">$340.50</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Wallet className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Transferencia</p>
                    <p className="text-xs text-muted-foreground">4 transacciones</p>
                  </div>
                </div>
                <p className="font-bold text-purple-600">$180.00</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}