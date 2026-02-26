"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, Settings, Store, Menu, X, LogIn, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/src/lib/firebase';

const navItems = [
  { href: '/', label: 'Punto de Venta', icon: ShoppingCart },
  { href: '/inventario', label: 'Inventario', icon: Package },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ventas', label: 'Ventas', icon: Store },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [user, loading] = useAuthState(auth);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  // Evitar hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={`
        w-64 bg-card border-r h-screen p-4 fixed lg:static z-40 
        transition-transform duration-300 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="mb-8 mt-12 lg:mt-0">
          <h1 className="text-2xl font-bold text-primary">POStify</h1>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : user ? (
            <p className="text-sm text-muted-foreground truncate">{user.displayName}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Inicia sesión</p>
          )}
        </div>
        
        <nav className="space-y-2 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t pt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : user ? (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          ) : (
            <Button 
              className="w-full bg-primary hover:bg-primary/90"
              onClick={handleSignIn}
            >
              <LogIn className="h-4 w-4 mr-2" />
              Iniciar Sesión
            </Button>
          )}
        </div>
      </div>
    </>
  );
}