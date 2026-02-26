"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, ShoppingCart, Package, Calendar } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

interface Sale {
  id: string;
  total: number;
  items: number;
  paymentMethod: string;
  products: string;
  productsList?: any[];
  createdAt: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export default function DashboardPage() {
  const [user, loading] = useAuthState(auth);
  const [stats, setStats] = useState({
    salesToday: 0,
    salesWeek: 0,
    salesMonth: 0,
    transactionsToday: 0,
    totalProducts: 0,
    lowStock: 0
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      const q = query(collection(db, 'sales'), where('userId', '==', user?.uid));
      const snapshot = await getDocs(q);
      const allSales = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sale[];
      
      allSales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Fechas
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      // Filtrar
      const salesToday = allSales.filter(s => new Date(s.createdAt) >= today);
      const salesWeek = allSales.filter(s => new Date(s.createdAt) >= weekAgo);
      const salesMonth = allSales.filter(s => new Date(s.createdAt) >= monthAgo);

      // Stats
      const statsSalesToday = salesToday.reduce((sum, s) => sum + s.total, 0);
      const statsSalesWeek = salesWeek.reduce((sum, s) => sum + s.total, 0);
      const statsSalesMonth = salesMonth.reduce((sum, s) => sum + s.total, 0);

      // Productos
      const qProducts = query(collection(db, 'products'), where('userId', '==', user?.uid));
      const snapProducts = await getDocs(qProducts);
      const products = snapProducts.docs.map(doc => doc.data());
      const totalProducts = products.length;
      const lowStock = products.filter((p: any) => p.stock < 10).length;

      // Últimas 5 ventas
      setRecentSales(allSales.slice(0, 5));

      // Productos más vendidos
      const productSales: { [key: string]: { name: string; qty: number } } = {};
      allSales.forEach(sale => {
        if (sale.productsList) {
          sale.productsList.forEach((p: any) => {
            const key = p.name;
            if (productSales[key]) {
              productSales[key].qty += p.qty;
            } else {
              productSales[key] = { name: p.name, qty: p.qty };
            }
          });
        }
      });
      
      const top = Object.values(productSales)
        .sort((a: any, b: any) => b.qty - a.qty)
        .slice(0, 5);
      console.log('Top products:', top);
      setTopProducts(top);

      // Ventas por categoría
      const categorySales: { [key: string]: number } = {};
      allSales.forEach(sale => {
        if (sale.productsList) {
          sale.productsList.forEach((p: any) => {
            const cat = p.category || 'Sin categoría';
            categorySales[cat] = (categorySales[cat] || 0) + (p.price * p.qty);
          });
        }
      });
      const catData = Object.entries(categorySales).map(([name, value]) => ({ name, value }));
      console.log('Category data:', catData);
      setCategoryData(catData);

      // Datos semanales
      const weekData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const daySales = allSales.filter(s => {
          const saleDate = new Date(s.createdAt);
          return saleDate >= date && saleDate < nextDate;
        });
        
        weekData.push({
          day: date.toLocaleDateString('es-ES', { weekday: 'short' }),
          ventas: daySales.reduce((sum, s) => sum + s.total, 0),
        });
      }
      setWeeklyData(weekData);

      // Datos mensuales (6 meses)
      const monthData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        date.setDate(1);
        
        const nextDate = new Date(date);
        nextDate.setMonth(nextDate.getMonth() + 1);
        
        const monthSales = allSales.filter(s => {
          const saleDate = new Date(s.createdAt);
          return saleDate >= date && saleDate < nextDate;
        });
        
        monthData.push({
          mes: date.toLocaleDateString('es-ES', { month: 'short' }),
          ventas: monthSales.reduce((sum, s) => sum + s.total, 0),
        });
      }
      console.log('Monthly data:', monthData);
      setMonthlyData(monthData);

      setStats({
        salesToday: statsSalesToday,
        salesWeek: statsSalesWeek,
        salesMonth: statsSalesMonth,
        transactionsToday: salesToday.length,
        totalProducts,
        lowStock
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-xl font-semibold mb-2">Inicia sesión</h2>
        <p className="text-muted-foreground">Necesitas iniciar sesión para ver el dashboard</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6"><h1>Cargando...</h1></div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Día Neto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">${stats.salesToday.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Hoy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Semana Neta</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">${stats.salesWeek.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Últimos 7 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mes Neto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">${stats.salesMonth.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Últimos 30 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transacciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.transactionsToday}</p>
                <p className="text-xs text-muted-foreground mt-1">Hoy</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Ventas Semanales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                <Bar dataKey="ventas" fill="#22c55e" name="Ventas $" radius={[4, 4, 0, 0]} />
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
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                <Bar dataKey="ventas" fill="#8b5cf6" name="Ventas $" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Ventas por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No hay datos de categorías
              </div>
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
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
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
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No hay productos vendidos
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="qty" fill="#f59e0b" name="Cantidad" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Últimas Ventas */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay ventas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted rounded-lg gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg">${sale.total?.toFixed(2)}</span>
                      <Badge variant="outline">{sale.paymentMethod}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {sale.items} items • {formatDate(sale.createdAt)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {sale.products}
                    </p>
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