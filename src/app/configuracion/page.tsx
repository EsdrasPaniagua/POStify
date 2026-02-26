"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';
import { toast } from 'sonner';
import { Store, Tag, Plus, X, Check, Trash2 } from 'lucide-react';

interface VariantOption {
  id: string;
  name: string;
}

interface Variant {
  id: string;
  name: string;
  options: VariantOption[];
}

interface StoreSettings {
  storeName: string;
  variants: Variant[];
}

const DEFAULT_VARIANTS: Variant[] = [
  { id: 'color', name: 'Color', options: [] },
  { id: 'size', name: 'Talle', options: [] },
  { id: 'weight', name: 'Peso', options: [] },
  { id: 'volume', name: 'Volumen', options: [] },
];

export default function ConfiguracionPage() {
  const [user, loading] = useAuthState(auth);
  const [storeName, setStoreName] = useState('');
  const [variants, setVariants] = useState<Variant[]>(DEFAULT_VARIANTS);
  const [saving, setSaving] = useState(false);
  const [newVariantName, setNewVariantName] = useState('');
  const [newOptionName, setNewOptionName] = useState('');

  useEffect(() => {
    if (user) loadSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      const docRef = doc(db, 'settings', user!.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as StoreSettings;
        setStoreName(data.storeName || '');
        setVariants(data.variants || DEFAULT_VARIANTS);
      }
    } catch (error) { console.error('Error:', error); }
  };

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', user.uid), {
        storeName,
        variants,
        userId: user.uid
      }, { merge: true });
      toast.success('Guardado');
    } catch (error) { console.error('Error:', error); toast.error('Error'); }
    finally { setSaving(false); }
  };

  const addVariant = () => {
    if (!newVariantName.trim()) {
      toast.error('Escribe un nombre');
      return;
    }
    const newVariant: Variant = {
      id: newVariantName.toLowerCase().replace(/\s+/g, '_'),
      name: newVariantName.trim(),
      options: []
    };
    setVariants(prev => [...prev, newVariant]);
    setNewVariantName('');
    toast.success('Variante agregada');
  };

  const deleteVariant = (variantId: string) => {
    if (!confirm('¿Eliminar esta variante?')) return;
    setVariants(prev => prev.filter(v => v.id !== variantId));
  };

  const addOption = (variantId: string) => {
    if (!newOptionName.trim()) {
      toast.error('Escribe una opción');
      return;
    }
    setVariants(prev => prev.map(v => {
      if (v.id === variantId) {
        const newOption: VariantOption = {
          id: Date.now().toString(),
          name: newOptionName.trim()
        };
        return { ...v, options: [...v.options, newOption] };
      }
      return v;
    }));
    setNewOptionName('');
  };

  const deleteOption = (variantId: string, optionId: string) => {
    setVariants(prev => prev.map(v => {
      if (v.id === variantId) {
        return { ...v, options: v.options.filter(o => o.id !== optionId) };
      }
      return v;
    }));
  };

  if (!user) return <div className="p-6"><h1>Inicia sesión</h1></div>;
  if (loading) return <div className="p-6"><h1>Cargando...</h1></div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Configuración</h1>

      {/* Store Name */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Información de la Tienda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nombre de la tienda</Label>
            <Input 
              value={storeName} 
              onChange={(e) => setStoreName(e.target.value)} 
              placeholder="Mi Tienda" 
            />
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </CardContent>
      </Card>

      {/* Variants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Variantes de Productos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Crea variantes como Color, Talle, Peso, etc. y agrega tus propias opciones
          </p>

          {/* Add new variant */}
          <div className="flex gap-2">
            <Input
              value={newVariantName}
              onChange={(e) => setNewVariantName(e.target.value)}
              placeholder="Nueva variante (ej: Material)"
              onKeyDown={(e) => e.key === 'Enter' && addVariant()}
            />
            <Button onClick={addVariant}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Variants list */}
          <div className="space-y-4">
            {variants.map((variant) => (
              <div key={variant.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-lg">{variant.name}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500"
                    onClick={() => deleteVariant(variant.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Options */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {variant.options.map((option) => (
                    <Badge key={option.id} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                      {option.name}
                      <button 
                        onClick={() => deleteOption(variant.id, option.id)}
                        className="ml-1 text-muted-foreground hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                {/* Add option */}
                <div className="flex gap-2">
                  <Input
                    value={newOptionName}
                    onChange={(e) => setNewOptionName(e.target.value)}
                    placeholder={`Agregar ${variant.name}...`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addOption(variant.id);
                      }
                    }}
                  />
                  <Button variant="outline" onClick={() => addOption(variant.id)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={saveSettings} disabled={saving} className="w-full">
            {saving ? 'Guardando...' : 'Guardar Variantes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}