"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, Settings, Store, Menu, X, LogIn, LogOut, Users, Sun, Moon, Warehouse } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, db } from '@/src/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { useTheme } from "next-themes";

interface Permissions {
  viewSales: boolean;
  editProducts: boolean;
  deleteProducts: boolean;
  viewDashboard: boolean;
  manageCategories: boolean;
  manageEmployees: boolean;
  settings: boolean;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  userId: string;
  active: boolean;
  salaryType: 'commission' | 'salary' | 'both';
  commissionPercent: number;
  monthlySalary: number;
  permissions: Permissions;
}

interface Inventory {
  id: string;
  name: string;
  color: string;
}

const navItems = [
  { href: '/pos',           label: 'Ventas',              icon: ShoppingCart,    permission: null },
  { href: '/inventario',    label: 'Inventario',     icon: Package,         permission: null },
  { href: '/dashboard',     label: 'Estadísticas',      icon: LayoutDashboard, permission: 'viewDashboard' },
  { href: '/ventas',        label: 'Historial de Ventas',         icon: Store,           permission: 'viewSales' },
  { href: '/configuracion', label: 'Configuración',  icon: Settings,        permission: 'settings' },
];

const pageTitle: Record<string, string> = {
  '/pos':           'Ventas',
  '/inventario':    'Inventario',
  '/dashboard':     'Estadísticas',
  '/ventas':        'Historial de Ventas',
  '/configuracion': 'Configuración',
};

const getPageTitle = (pathname: string, inventories: Inventory[]): string => {
  if (pageTitle[pathname]) return pageTitle[pathname];
  // Rutas dinámicas de inventario: /inventario/[id] y /ventas/[id]
  const invMatch = pathname.match(/^\/inventario\/(.+)$/);
  if (invMatch) {
    const inv = inventories.find(i => i.id === invMatch[1]);
    return inv ? `Inventario · ${inv.name}` : 'Inventario';
  }
  const ventasMatch = pathname.match(/^\/ventas\/(.+)$/);
  if (ventasMatch) {
    const inv = inventories.find(i => i.id === ventasMatch[1]);
    return inv ? `Ventas · ${inv.name}` : 'Ventas';
  }
  return 'POStify';
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [user, loading] = useAuthState(auth);
  const [mounted, setMounted] = useState(false);
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);

  const [showLoginType, setShowLoginType] = useState(false);
  const [loginType, setLoginType] = useState<'owner' | 'employee' | null>(null);
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [employeeApps, setEmployeeApps] = useState<Employee[]>([]);
  const [storeName, setStoreName] = useState('');
  const [inventories, setInventories] = useState<Inventory[]>([]);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('employeeData');
    if (stored) setEmployeeData(JSON.parse(stored));
  }, []);

  useEffect(() => {
    const loadStoreName = async () => {
      const ownerId = localStorage.getItem('ownerUserId');
      if (!ownerId) return;
      try {
        const snap = await getDoc(doc(db, 'settings', ownerId));
        if (snap.exists()) setStoreName(snap.data().storeName || '');
      } catch {}
    };
    if (mounted) loadStoreName();
  }, [mounted, user]);

  // Cargar inventarios
  useEffect(() => {
    const loadInventories = async () => {
      const ownerId = localStorage.getItem('ownerUserId');
      if (!ownerId) return;
      try {
        const snap = await getDoc(doc(db, 'settings', ownerId));
        if (snap.exists()) setInventories(snap.data().inventories || []);
      } catch {}
    };
    if (mounted) loadInventories();
  }, [mounted, user]);

  useEffect(() => { setIsOpen(false); }, [pathname]);

  // Chequear si la ruta actual está permitida, redirigir si no
  useEffect(() => {
    if (!mounted || loading) return;
    const stored = localStorage.getItem('employeeData');
    if (!stored) return; // Es dueño, puede ir a cualquier lado

    const emp: Employee = JSON.parse(stored);
    const currentItem = navItems.find(item => item.href === pathname);
    if (currentItem?.permission && !emp.permissions[currentItem.permission as keyof Permissions]) {
      toast.error('No tenés permiso para acceder a esta sección');
      router.push('/pos');
    }
  }, [pathname, mounted, loading]);

  const canAccess = (permission: string | null): boolean => {
    if (!permission) return true;       // Sin restricción → siempre visible
    if (!employeeData) return true;     // Es dueño → acceso total
    return employeeData.permissions[permission as keyof Permissions] === true;
  };

  const saveEmployeeSession = (emp: Employee) => {
    const data = {
      ...emp,
      ownerUserId: emp.userId,
    };
    localStorage.setItem('employeeData', JSON.stringify(data));
    localStorage.setItem('ownerUserId', emp.userId);
    setEmployeeData(data);
  };

  const startLogin = async (type: 'owner' | 'employee') => {
    setShowLoginType(false);
    setLoginType(type);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = (result.user.email || '').toLowerCase().trim();

      if (type === 'employee') {
        const allEmployeesSnapshot = await getDocs(query(collection(db, 'employees')));
        const matched = allEmployeesSnapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as Employee))
          .filter(emp => emp.email?.toLowerCase() === email && emp.active);

        if (matched.length === 0) {
          await signOut(auth);
          toast.error('Tu email no está registrado como empleado activo');
          setLoginType(null);
          return;
        }

        if (matched.length === 1) {
          saveEmployeeSession(matched[0]);
          toast.success(`Bienvenido, ${matched[0].name}!`);
        } else {
          setEmployeeApps(matched);
          setShowStoreSelector(true);
        }

      } else {
        // Owner
        const settingsSnap = await getDocs(query(collection(db, 'settings'), where('userId', '==', result.user.uid)));
        if (settingsSnap.empty) {
          await setDoc(doc(db, 'settings', result.user.uid), {
            businessName: 'Mi Tienda',
            createdAt: new Date().toISOString(),
            userId: result.user.uid,
          });
          toast.success('¡Tienda creada!');
        }
        localStorage.removeItem('employeeData');
        localStorage.setItem('ownerUserId', result.user.uid);
        setEmployeeData(null);
        toast.success('Bienvenido!');
      }
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request') {
        toast.error('Error al iniciar sesión');
      }
      setLoginType(null);
    }
  };

  const selectStore = (isEmployee: boolean, emp?: Employee) => {
    if (isEmployee && emp) {
      saveEmployeeSession(emp);
      toast.success(`Bienvenido, ${emp.name}!`);
    } else {
      localStorage.removeItem('employeeData');
      localStorage.setItem('ownerUserId', user?.uid || '');
      setEmployeeData(null);
      toast.success('Bienvenido!');
    }
    setShowStoreSelector(false);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    localStorage.removeItem('employeeData');
    localStorage.removeItem('ownerUserId');
    setEmployeeData(null);
    setShowLoginType(false);
    setLoginType(null);
    router.push('/');
  };

  if (!mounted) return null;

  return (
    <>
      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b flex items-center gap-3 px-4 h-14">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base leading-tight truncate">
            {getPageTitle(pathname, inventories)}
          </p>
          {user && storeName && (
            <p className="text-[11px] text-muted-foreground truncate">{storeName}</p>
          )}
        </div>
      </div>
      {/* Spacer para que el contenido no quede detrás del header mobile */}
      <div className="lg:hidden h-14" />

      {isOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setIsOpen(false)} />}

      <aside className={`fixed lg:static top-14 lg:top-0 bottom-0 lg:inset-y-0 left-0 z-40 w-64 bg-card border-r flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* Header */}
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity" onClick={() => router.push('/')}>POStify</h1>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : user ? (
            <div className="mt-1 space-y-0.5">
              {storeName && (
                <p className="text-xs text-muted-foreground truncate">
                  <span className="font-semibold text-foreground">Tienda:</span> {storeName}
                </p>
              )}
              {employeeData ? (
                <p className="text-xs text-muted-foreground truncate">
                  <span className="font-semibold text-foreground">Empleado:</span> {employeeData.name}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground truncate">{user.displayName}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Inicia sesión</p>
          )}
        </div>

        {/* Dark mode */}
        <div className="p-4 border-b">
          <Button
            variant="outline"
            className="w-full flex items-center gap-2"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const accessible = canAccess(item.permission);
            if (!accessible) return null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* Inventarios dinámicos */}
          {inventories.length > 0 && (
            <>
              <div className="pt-3 pb-1 px-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Inventarios</p>
              </div>
              {inventories.map((inv) => {
                const isActiveVentas = pathname === `/pos` && false; // handled by query
                const isActiveInv = pathname === `/inventario/${inv.id}`;
                return (
                  <div key={inv.id} className="space-y-0.5">
                    {/* Label del inventario con color */}
                    <div className="flex items-center gap-2 px-4 py-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: inv.color }} />
                      <span className="text-xs font-semibold truncate" style={{ color: inv.color }}>{inv.name}</span>
                    </div>
                    {/* Ventas del inventario */}
                    <Link
                      href={`/pos?inventory=${inv.id}`}
                      className={`flex items-center gap-3 pl-8 pr-4 py-2 rounded-lg transition-all duration-200 text-sm ${
                        isActiveVentas ? 'text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                      style={isActiveVentas ? { backgroundColor: inv.color } : {}}
                    >
                      <ShoppingCart className="h-4 w-4 flex-shrink-0" />
                      <span>Ventas</span>
                    </Link>
                    {/* Inventario del inventario */}
                    <Link
                      href={`/inventario/${inv.id}`}
                      className={`flex items-center gap-3 pl-8 pr-4 py-2 rounded-lg transition-all duration-200 text-sm ${
                        isActiveInv ? 'text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                      style={isActiveInv ? { backgroundColor: inv.color } : {}}
                    >
                      <Warehouse className="h-4 w-4 flex-shrink-0" />
                      <span>Inventario</span>
                    </Link>
                  </div>
                );
              })}
            </>
          )}
        </nav>

        {/* Login / Logout */}
        <div className="p-4 border-t">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : user ? (
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" /> Cerrar Sesión
            </Button>
          ) : (
            <Button className="w-full" onClick={() => setShowLoginType(true)}>
              <LogIn className="h-4 w-4 mr-2" /> Iniciar Sesión
            </Button>
          )}
        </div>
      </aside>

      {/* Modal: tipo de login */}
      {showLoginType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2 text-center">¿Cómo vas a entrar?</h2>
            <p className="text-sm text-muted-foreground mb-4 text-center">Seleccioná una opción:</p>
            <div className="space-y-3">
              <Button variant="outline" className="w-full h-14 justify-start" onClick={() => startLogin('owner')}>
                <Store className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Soy el dueño</div>
                  <div className="text-xs text-muted-foreground">Tengo mi propia tienda</div>
                </div>
              </Button>
              <Button variant="outline" className="w-full h-14 justify-start" onClick={() => startLogin('employee')}>
                <Users className="h-5 w-5 mr-3" />
                <div className="text-left">
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

      {/* Modal: selector de tienda */}
      {showStoreSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">¿A qué tienda querés entrar?</h2>
            <p className="text-sm text-muted-foreground mb-4">Seleccioná una:</p>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => selectStore(false)}>
                <Store className="h-4 w-4 mr-2" /> Mi tienda (Propia)
              </Button>
              <div className="border-t my-2" />
              <p className="text-xs font-medium text-muted-foreground">Tiendas donde trabajás:</p>
              {employeeApps.map(emp => (
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