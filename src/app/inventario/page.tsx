"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/src/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getOwnerId } from '@/src/lib/userId';
import { Warehouse, ArrowRight } from 'lucide-react';

interface Inventory {
  id: string;
  name: string;
  color: string;
}

export default function InventarioSelectorPage() {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const ownerId = getOwnerId() || user?.uid;
      if (!ownerId) { setLoading(false); return; }
      try {
        const snap = await getDoc(doc(db, 'settings', ownerId));
        if (snap.exists()) setInventories(snap.data().inventories || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="p-6 text-muted-foreground">Cargando...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Warehouse className="h-6 w-6" /> Inventario
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Elegí un inventario para ver sus productos
        </p>
      </div>

      <div className="space-y-3">
        {inventories.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Warehouse className="h-14 w-14 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-base">No hay inventarios creados</p>
            <p className="text-sm mt-1">
              Creá uno en <span className="font-semibold">Configuración → Inventarios</span>
            </p>
          </div>
        ) : (
          inventories.map((inv) => (
            <button
              key={inv.id}
              onClick={() => router.push(`/inventario/${inv.id}`)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 hover:bg-muted/30 transition-all group"
              style={{ borderColor: inv.color + '60' }}
            >
              {/* Ícono con color del inventario */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: inv.color + '25' }}
              >
                <Warehouse className="h-6 w-6" style={{ color: inv.color }} />
              </div>

              <div className="flex-1 text-left">
                <p className="font-semibold text-base" style={{ color: inv.color }}>{inv.name}</p>
                <p className="text-xs text-muted-foreground">Ver productos de este inventario</p>
              </div>

              <ArrowRight
                className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform flex-shrink-0"
                style={{ color: inv.color }}
              />
            </button>
          ))
        )}
      </div>
    </div>
  );
}