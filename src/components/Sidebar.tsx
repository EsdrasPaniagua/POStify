"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, Settings, Store, Menu, X, LogIn, LogOut, Users, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, db } from '@/src/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { useTheme } from "next-themes";

interface Employee {
  id: string;
  name: string;
  email: string;
  userId: string;
  active: boolean;
  salaryType: 'commission' | 'salary' | 'both';
  commissionPercent: number;
  monthlySalary: number;
  permissions: {
    viewSales: boolean;
    editProducts: boolean;
    deleteProducts: boolean;
    viewDashboard: boolean;
    manageCategories: boolean;
    manageEmployees: boolean;
    settings: boolean;
  };
}

const navItems = [
  { href: '/', label: 'Punto de Venta', icon: ShoppingCart, permission: null },
  { href: '/inventario', label: 'Inventario', icon: Package, permission: null },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'viewDashboard' },
  { href: '/ventas', label: 'Ventas', icon: Store, permission: 'viewSales' },
  { href: '/configuracion', label: 'Configuración', icon: Settings, permission: 'settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [user, loading] = useAuthState(auth);
  const [mounted, setMounted] = useState(false);
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  
  // Login selector states
  const [showLoginType, setShowLoginType] = useState(false);
  const [loginType, setLoginType] = useState<'owner' | 'employee' | null>(null);
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [employeeApps, setEmployeeApps] = useState<Employee[]>([]);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('employeeData');
    if (stored) {
      setEmployeeData(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email?.toLowerCase() || '';
      
      // Buscar empleados con este email
      const employeesQuery = query(collection(db, 'employees'), where('email', '==', email));
      const employeesSnapshot = await getDocs(employeesQuery);
      const employeeAppsData = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      const activeEmployeeApps = employeeAppsData.filter(emp => emp.active);
      
      // Buscar si es propietario
      const settingsQuery = query(collection(db, 'settings'), where('userId', '==', result.user.uid));
      const settingsSnapshot = await getDocs(settingsQuery);
      const isOwner = !settingsSnapshot.empty;
      
      // Lógica según el tipo de login
      if (loginType === 'employee') {
        if (activeEmployeeApps.length === 0) {
          await signOut(auth);
          toast.error('No trabajas en ninguna tienda');
          return;
        }
        
        if (activeEmployeeApps.length === 1) {
          localStorage.setItem('employeeData', JSON.stringify(activeEmployeeApps[0]));
          setEmployeeData(activeEmployeeApps[0]);
          toast.success(`Bienvenido, ${activeEmployeeApps[0].name}!`);
        } else {
          setEmployeeApps(activeEmployeeApps);
          setShowStoreSelector(true);
        }
      } else {
        // Owner
        if (!isOwner) {
          await signOut(auth);
          toast.error('No tienes una tienda registrada');
          return;
        }
        
        if (activeEmployeeApps.length > 0) {
          setEmployeeApps(activeEmployeeApps);
          setShowStoreSelector(true);
        } else {
          localStorage.removeItem('employeeData');
          setEmployeeData(null);
          toast.success('Bienvenido!');
        }
      }
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request') {
        console.error('Error:', error);
        toast.error('Error al iniciar sesión');
      }
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    localStorage.removeItem('employeeData');
    setEmployeeData(null);
    setShowLoginType(false);
    setLoginType(null);
  };

  const canAccess = (permission: string | null) => {
    if (!permission) return true;
    if (!employeeData) return true;
    return employeeData.permissions[permission as keyof typeof employeeData.permissions];
  };

  const startLogin = async (type: 'owner' | 'employee') => {
    setShowLoginType(false);
    setLoginType(type);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = (result.user.email || '').toLowerCase().trim();
      
      if (type === 'employee') {
        const allEmployeesQuery = query(collection(db, 'employees'));
        const allEmployeesSnapshot = await getDocs(allEmployeesQuery);
        
        const employeeAppsData = allEmployeesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Employee))
          .filter(emp => emp.email && emp.email.toLowerCase() === email);
        
        const activeEmployeeApps = employeeAppsData.filter(emp => emp.active);
        
        if (activeEmployeeApps.length === 0) {
          await signOut(auth);
          toast.error('Tu email no está registrado como empleado');
          setLoginType(null);
          return;
        }
        
        if (activeEmployeeApps.length === 1) {
          const employeeWithOwner = {
            ...activeEmployeeApps[0],
            ownerUserId: activeEmployeeApps[0].userId
          };
          localStorage.setItem('employeeData', JSON.stringify(employeeWithOwner));
          localStorage.setItem('ownerUserId', activeEmployeeApps[0].userId);
          setEmployeeData(employeeWithOwner);
          toast.success(`Bienvenido, ${activeEmployeeApps[0].name}!`);
        } else {
          setEmployeeApps(activeEmployeeApps);
          setShowStoreSelector(true);
        }
      } else {
        const settingsQuery = query(collection(db, 'settings'), where('userId', '==', result.user.uid));
        const settingsSnapshot = await getDocs(settingsQuery);
        const isOwner = !settingsSnapshot.empty;
        
        if (!isOwner) {
          await setDoc(doc(db, 'settings', result.user.uid), {
            businessName: 'Mi Tienda',
            createdAt: new Date().toISOString(),
            userId: result.user.uid
          });
          toast.success('Tienda creada correctamente!');
        }
        
        localStorage.removeItem('employeeData');
        localStorage.setItem('ownerUserId', result.user.uid);
        setEmployeeData(null);
        toast.success('Bienvenido!');
      }
    } catch (error: any) {
      console.error('Error:', error);
      if (error.code !== 'auth/cancelled-popup-request') {
        toast.error('Error al iniciar sesión');
      }
      setLoginType(null);
    }
  };

  const selectStore = (isEmployee: boolean, data?: Employee) => {
    if (isEmployee && data) {
      const employeeWithOwner = {
        ...data,
        ownerUserId: data.userId
      };
      localStorage.setItem('employeeData', JSON.stringify(employeeWithOwner));
      localStorage.setItem('ownerUserId', data.userId);
      setEmployeeData(employeeWithOwner);
      toast.success(`Bienvenido, ${data.name}!`);
    } else {
      const ownerId = user?.uid;
      if (ownerId) {
        localStorage.setItem('ownerUserId', ownerId);
      }
      localStorage.removeItem('employeeData');
      setEmployeeData(null);
      toast.success('Bienvenido!');
    }
    setShowStoreSelector(false);
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50 bg-background border shadow-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {isOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setIsOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-card border-r flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold text-primary">POStify</h1>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : user ? (
            <div>
              <p className="text-sm text-muted-foreground truncate">{employeeData ? employeeData.name : user.displayName}</p>
              {employeeData && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded mt-1 inline-block">
                  Empleado
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Inicia sesión</p>
          )}
        </div>
        
        {/* Dark Mode Button */}
        <div className="p-4 border-b">
          <Button
            variant="outline"
            className="w-full flex items-center gap-2"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{theme === "dark" ? "Modo Claro" : "Modo Oscuro"}</span>
          </Button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            if (!canAccess(item.permission)) return null;
            
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : user ? (
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          ) : (
            <Button className="w-full" onClick={() => setShowLoginType(true)}>
              <LogIn className="h-4 w-4 mr-2" />
              Iniciar Sesión
            </Button>
          )}
        </div>
      </aside>

      {/* Login Type Selector */}
      {showLoginType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2 text-center">¿Cómo vas a entrar?</h2>
            <p className="text-sm text-muted-foreground mb-4 text-center">Selecciona una opción:</p>
            
            <div className="space-y-3">
              <Button variant="outline" className="w-full h-14 justify-start text-left" onClick={() => startLogin('owner')}>
                <Store className="h-5 w-5 mr-3" />
                <div>
                  <div className="font-medium">Soy el dueño</div>
                  <div className="text-xs text-muted-foreground">Tengo mi propia tienda</div>
                </div>
              </Button>
              
              <Button variant="outline" className="w-full h-14 justify-start text-left" onClick={() => startLogin('employee')}>
                <Users className="h-5 w-5 mr-3" />
                <div>
                  <div className="font-medium">Soy empleado</div>
                  <div className="text-xs text-muted-foreground">Trabajo en una tienda</div>
                </div>
              </Button>
            </div>
            
            <Button variant="ghost" className="w-full mt-4" onClick={() => setShowLoginType(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Store Selector Modal */}
      {showStoreSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">¿A qué tienda quieres entrar?</h2>
            <p className="text-sm text-muted-foreground mb-4">Selecciona una:</p>
            
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => selectStore(false)}>
                <Store className="h-4 w-4 mr-2" />
                Mi tienda (Propia)
              </Button>
              
              <div className="border-t my-2" />
              
              <p className="text-xs font-medium text-muted-foreground">Tiendas donde trabajas:</p>
              {employeeApps.map((emp) => (
                <Button key={emp.id} variant="outline" className="w-full justify-start" onClick={() => selectStore(true, emp)}>
                  <Users className="h-4 w-4 mr-2" />
                  {emp.name}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {emp.salaryType === 'commission' ? `${emp.commissionPercent}%` : `$${emp.monthlySalary}`}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}