"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';
import { toast } from 'sonner';

export default function ConfiguracionPage() {
  const [user, loading] = useAuthState(auth);
  const [shopName, setShopName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadConfig();
    }
  }, [user]);

  const loadConfig = async () => {
    try {
      const docRef = doc(db, 'users', user!.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setShopName(docSnap.data().shopName || '');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        shopName: shopName
      });
      toast.success('Configuración guardada');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-xl font-semibold mb-2">Inicia sesión</h2>
        <p className="text-muted-foreground">Necesitas iniciar sesión para ver la configuración</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6"><h1>Cargando...</h1></div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Configuración</h1>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Información de la Tienda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre de la Tienda</label>
              <Input
                placeholder="Mi Tienda"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cuenta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm font-medium">Email</p>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acerca de</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              POStify v1.0.0
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Sistema de punto de venta desarrollado con Next.js y Firebase.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}