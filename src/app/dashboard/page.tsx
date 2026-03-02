"use client";

import { useState, useEffect } from 'react';
import { getOwnerId } from '@/src/lib/userId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, ShoppingCart, Package, Calendar } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

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
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

const formatPrice = (value: number) => `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// Calcula la ganancia neta de una venta
const calcProfit = (sale: Sale): number => {
  if (!sale.productsList || sale.productsList.length === 0) return 0;
  const cost = sale.productsList.reduce((sum, item) => sum + ((item.costPrice || 0) * item.qty), 0);
  return sale.total - cost;
};

// Calcula unidades vendidas de una venta
const calcUnits = (sale: Sale): number => {
  if (!sale.productsList || sale.productsList.length === 0) return sale.items || 0;
  return sale.productsList.reduce((sum, item) => sum + item.qty, 0);
};

export default function DashboardPage() {
  const [user, loading] = useAuthState(auth);
  const [stats, setStats] = useState({
    profitToday: 0,
    profitWeek: 0,
    profitMonth: 0,
    revenueToday: 0,
    revenueWeek: 0,
    revenueMonth: 0,
    transactionsToday: 0,
    totalProducts: 0,
    lowStock: 0,
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  useEffect(() => {
    if (user || getOwnerId()) loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      const ownerId = getOwnerId() || user?.uid;
      if (!ownerId) return;

      const q = query(collection(db, 'sales'), where('userId', '==', ownerId));
      const snapshot = await getDocs(q);
      const allSales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[];
      allSales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1);

      const salesToday = allSales.filter(s => new Date(s.createdAt) >= today);
      const salesWeek = allSales.filter(s => new Date(s.createdAt) >= weekAgo);
      const salesMonth = allSales.filter(s => new Date(s.createdAt) >= monthAgo);

      // Productos
      const qProducts = query(collection(db, 'products'), where('userId', '==', ownerId));
      const snapProducts = await getDocs(qProducts);
      const products = snapProducts.docs.map(doc => doc.data());

      setRecentSales(allSales.slice(0, 5));

      // Top productos
      const productSales: { [key: string]: { name: string; qty: number } } = {};
      allSales.forEach(sale => {
        sale.productsList?.forEach((p) => {
          if (productSales[p.name]) productSales[p.name].qty += p.qty;
          else productSales[p.name] = { name: p.name, qty: p.qty };
        });
      });
      setTopProducts(Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5));

      // Categorías por ganancia
      const categorySales: { [key: string]: number } = {};
      allSales.forEach(sale => {
        sale.productsList?.forEach((p) => {
          const cat = p.category || 'Sin categoría';
          const itemProfit = (p.price - (p.costPrice || 0)) * p.qty;
          categorySales[cat] = (categorySales[cat] || 0) + itemProfit;
        });
      });
      setCategoryData(Object.entries(categorySales).map(([name, value]) => ({ name, value })));

      // Datos semanales: bruto, neto, unidades
      const weekData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today); date.setDate(date.getDate() - i);
        const nextDate = new Date(date); nextDate.setDate(nextDate.getDate() + 1);
        const daySales = allSales.filter(s => {
          const d = new Date(s.createdAt);
          return d >= date && d < nextDate;
        });
        weekData.push({
          day: date.toLocaleDateString('es-ES', { weekday: 'short' }),
          bruto: daySales.reduce((sum, s) => sum + s.total, 0),
          neto: daySales.reduce((sum, s) => sum + calcProfit(s), 0),
          unidades: daySales.reduce((sum, s) => sum + calcUnits(s), 0),
        });
      }
      setWeeklyData(weekData);

      // Datos mensuales: bruto, neto, unidades
      const monthData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(today); date.setMonth(date.getMonth() - i); date.setDate(1);
        const nextDate = new Date(date); nextDate.setMonth(nextDate.getMonth() + 1);
        const monthSales = allSales.filter(s => {
          const d = new Date(s.createdAt);
          return d >= date && d < nextDate;
        });
        monthData.push({
          mes: date.toLocaleDateString('es-ES', { month: 'short' }),
          bruto: monthSales.reduce((sum, s) => sum + s.total, 0),
          neto: monthSales.reduce((sum, s) => sum + calcProfit(s), 0),
          unidades: monthSales.reduce((sum, s) => sum + calcUnits(s), 0),
        });
      }
      setMonthlyData(monthData);

      setStats({
        profitToday: salesToday.reduce((sum, s) => sum + calcProfit(s), 0),
        profitWeek: salesWeek.reduce((sum, s) => sum + calcProfit(s), 0),
        profitMonth: salesMonth.reduce((sum, s) => sum + calcProfit(s), 0),
        revenueToday: salesToday.reduce((sum, s) => sum + s.total, 0),
        revenueWeek: salesWeek.reduce((sum, s) => sum + s.total, 0),
        revenueMonth: salesMonth.reduce((sum, s) => sum + s.total, 0),
        transactionsToday: salesToday.length,
        totalProducts: products.length,
        lowStock: products.filter((p: any) => p.stock < 10).length,
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border rounded-lg p-3 shadow-lg text-xs space-y-1">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name === 'unidades' ? `${entry.value} uds` : formatPrice(entry.value)}
            {' '}
            <span className="text-muted-foreground">({entry.name})</span>
          </p>
        ))}
      </div>
    );
  };

  if (!user && !getOwnerId()) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-xl font-semibold mb-2">Inicia sesión</h2>
      </div>
    );
  }

  if (loading) return <div className="p-6"><h1>Cargando...</h1></div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Cards de ganancia */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Ganancia Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl lg:text-3xl font-bold text-green-600">{formatPrice(stats.profitToday)}</p>
            <p className="text-xs text-muted-foreground mt-1">Bruto: {formatPrice(stats.revenueToday)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Ganancia Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl lg:text-3xl font-bold text-blue-600">{formatPrice(stats.profitWeek)}</p>
            <p className="text-xs text-muted-foreground mt-1">Bruto: {formatPrice(stats.revenueWeek)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Ganancia Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl lg:text-3xl font-bold text-purple-600">{formatPrice(stats.profitMonth)}</p>
            <p className="text-xs text-muted-foreground mt-1">Bruto: {formatPrice(stats.revenueMonth)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <ShoppingCart className="h-3.5 w-3.5" /> Transacciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl lg:text-3xl font-bold">{stats.transactionsToday}</p>
            <p className="text-xs text-muted-foreground mt-1">Hoy</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos semanales y mensuales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Ventas Semanales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="money" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="units" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="money" dataKey="bruto" name="bruto" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="money" dataKey="neto" name="neto" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="units" dataKey="unidades" name="unidades" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Ventas Mensuales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="money" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="units" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="money" dataKey="bruto" name="bruto" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="money" dataKey="neto" name="neto" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="units" dataKey="unidades" name="unidades" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Categorías y top productos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Ganancia por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">No hay datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatPrice(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Productos Más Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">No hay datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="qty" fill="#f59e0b" name="Unidades" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Últimas ventas */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay ventas</div>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale) => {
                const profit = calcProfit(sale);
                return (
                  <div key={sale.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted rounded-lg gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-lg">{formatPrice(sale.total)}</span>
                        <Badge variant="outline">{sale.paymentMethod}</Badge>
                        <span className="text-sm text-green-600 font-medium">+{formatPrice(profit)} ganancia</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {sale.items} items • {formatDate(sale.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{sale.products}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}