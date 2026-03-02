"use client";

import { useState, useEffect } from 'react';
import { getOwnerId } from '@/src/lib/userId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc, collection, addDoc, updateDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '@/src/lib/firebase';
import { toast } from 'sonner';
import { Store, Tag, Plus, X, Check, Trash2, Users, UserPlus, Edit2, ShieldOff } from 'lucide-react';
import { usePermissions } from '@/src/hooks/usePermissions';

interface StoreSettings {
  storeName: string;
  variants: Variant[];
}

interface Variant {
  id: string;
  name: string;
  options: { id: string; name: string }[];
}

interface Employee {
  id: string;
  name: string;
  email: string;
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

const DEFAULT_VARIANTS: Variant[] = [
  { id: 'color', name: 'Color', options: [] },
  { id: 'size', name: 'Talle', options: [] },
  { id: 'weight', name: 'Peso', options: [] },
  { id: 'volume', name: 'Volumen', options: [] },
];

const DEFAULT_PERMISSIONS = {
  viewSales: true,
  editProducts: false,
  deleteProducts: false,
  viewDashboard: false,
  manageCategories: false,
  manageEmployees: false,
  settings: false,
};

const PERMISSION_LABELS: Record<string, string> = {
  viewSales: 'Ver ventas',
  editProducts: 'Editar productos',
  deleteProducts: 'Eliminar productos',
  viewDashboard: 'Ver dashboard',
  manageCategories: 'Gestionar categorías',
  manageEmployees: 'Gestionar empleados',
  settings: 'Configuración',
};

export default function ConfiguracionPage() {
  const [user] = useAuthState(auth);
  const { isOwner, can, checked } = usePermissions('settings');

  const [storeName, setStoreName] = useState('');
  const [variants, setVariants] = useState<Variant[]>(DEFAULT_VARIANTS);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [saving, setSaving] = useState(false);
  const [newVariantName, setNewVariantName] = useState('');
  const [newOptionName, setNewOptionName] = useState<Record<string, string>>({});

  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [employeeSalaryType, setEmployeeSalaryType] = useState<'commission' | 'salary' | 'both'>('commission');
  const [employeeCommission, setEmployeeCommission] = useState('');
  const [employeeMonthlySalary, setEmployeeMonthlySalary] = useState('');
  const [employeePermissions, setEmployeePermissions] = useState(DEFAULT_PERMISSIONS);
  const [employeeActive, setEmployeeActive] = useState(true);
  const [savedStore, setSavedStore] = useState(false);
  const [savedVariants, setSavedVariants] = useState(false);

  useEffect(() => {
    if (user) {
      loadSettings();
      loadEmployees();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const docRef = doc(db, 'settings', getOwnerId()!);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as StoreSettings;
        setStoreName(data.storeName || '');
        setVariants(data.variants || DEFAULT_VARIANTS);
      }
    } catch (error) { console.error('Error:', error); }
  };

  const loadEmployees = async () => {
    try {
      const q = query(collection(db, 'employees'), where('userId', '==', user!.uid));
      const snapshot = await getDocs(q);
      setEmployees(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Employee)));
    } catch (error) { console.error('Error:', error); }
  };

  const saveSettings = async () => {
    const ownerId = getOwnerId() || user?.uid;
    if (!ownerId) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', ownerId), { storeName, variants, userId: ownerId }, { merge: true });
      toast.success('Guardado');
      setSavedStore(true); setSavedVariants(true);
      setTimeout(() => { setSavedStore(false); setSavedVariants(false); }, 2000);
    } catch (error) { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  };

  const addVariant = () => {
    if (!newVariantName.trim()) { toast.error('Escribe un nombre'); return; }
    setVariants(prev => [...prev, {
      id: newVariantName.toLowerCase().replace(/\s+/g, '_'),
      name: newVariantName.trim(),
      options: []
    }]);
    setNewVariantName('');
  };

  const deleteVariant = (variantId: string) => {
    if (!confirm('¿Eliminar esta variante?')) return;
    setVariants(prev => prev.filter(v => v.id !== variantId));
  };

  const addOption = async (variantId: string) => {
    const optName = newOptionName[variantId]?.trim();
    if (!optName) { toast.error('Escribe una opción'); return; }
    setVariants(prev => prev.map(v =>
      v.id === variantId
        ? { ...v, options: [...v.options, { id: Date.now().toString(), name: optName }] }
        : v
    ));
    setNewOptionName(prev => ({ ...prev, [variantId]: '' }));
    await saveSettings();
  };

  const deleteOption = (variantId: string, optionId: string) => {
    setVariants(prev => prev.map(v =>
      v.id === variantId ? { ...v, options: v.options.filter(o => o.id !== optionId) } : v
    ));
  };

  const openEmployeeDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setEmployeeName(employee.name);
      setEmployeeEmail(employee.email);
      setEmployeeSalaryType(employee.salaryType);
      setEmployeeCommission(employee.commissionPercent.toString());
      setEmployeeMonthlySalary(employee.monthlySalary.toString());
      setEmployeePermissions(employee.permissions);
      setEmployeeActive(employee.active);
    } else {
      setEditingEmployee(null);
      setEmployeeName('');
      setEmployeeEmail('');
      setEmployeeSalaryType('commission');
      setEmployeeCommission('');
      setEmployeeMonthlySalary('');
      setEmployeePermissions(DEFAULT_PERMISSIONS);
      setEmployeeActive(true);
    }
    setIsEmployeeDialogOpen(true);
  };

  const saveEmployee = async () => {
    if (!user) return;
    if (!employeeName.trim() || !employeeEmail.trim()) { toast.error('Completá todos los campos'); return; }
    try {
      const employeeData = {
        name: employeeName.trim(),
        email: employeeEmail.trim().toLowerCase(),
        userId: user.uid,
        ownerEmail: user.email,
        active: employeeActive,
        salaryType: employeeSalaryType,
        commissionPercent: parseFloat(employeeCommission) || 0,
        monthlySalary: parseFloat(employeeMonthlySalary) || 0,
        permissions: employeePermissions,
      };
      if (editingEmployee) {
        await updateDoc(doc(db, 'employees', editingEmployee.id), employeeData);
        toast.success('Empleado actualizado');
      } else {
        await addDoc(collection(db, 'employees'), employeeData);
        toast.success('Empleado guardado');
      }
      setIsEmployeeDialogOpen(false);
      loadEmployees();
    } catch (error) { toast.error('Error al guardar'); }
  };

  const deleteEmployee = async (id: string) => {
    if (!confirm('¿Eliminar este empleado?')) return;
    try {
      await deleteDoc(doc(db, 'employees', id));
      toast.success('Empleado eliminado');
      loadEmployees();
    } catch (error) { toast.error('Error al eliminar'); }
  };

  const togglePermission = (key: keyof typeof employeePermissions) => {
    setEmployeePermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!checked) return <div className="p-6">Cargando...</div>;

  if (!isOwner && !can('settings')) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
        <ShieldOff className="h-16 w-16 opacity-20 mb-4" />
        <h2 className="text-xl font-semibold">Sin acceso</h2>
        <p className="text-sm">No tenés permiso para ver esta sección</p>
      </div>
    );
  }

  if (!user) return <div className="p-6"><h1>Inicia sesión</h1></div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Configuración</h1>

      {/* Nombre de la tienda */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" /> Información de la Tienda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nombre de la tienda</Label>
            <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Mi Tienda" />
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            {savedStore ? <Check className="h-4 w-4 mr-2" /> : <Store className="h-4 w-4 mr-2" />}
            {saving ? 'Guardando...' : savedStore ? '¡Guardado!' : 'Guardar'}
          </Button>
        </CardContent>
      </Card>

      {/* Empleados — solo si tiene permiso */}
      {(isOwner || can('manageEmployees')) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Empleados
              </div>
              <Button size="sm" onClick={() => openEmployeeDialog()}>
                <UserPlus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay empleados</p>
            ) : (
              <div className="space-y-2">
                {employees.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{emp.name}</span>
                        <Badge variant={emp.active ? 'default' : 'secondary'}>
                          {emp.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{emp.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {emp.salaryType === 'commission' && `${emp.commissionPercent}% comisión`}
                        {emp.salaryType === 'salary' && `$${emp.monthlySalary}/mes`}
                        {emp.salaryType === 'both' && `${emp.commissionPercent}% + $${emp.monthlySalary}/mes`}
                      </p>
                      {/* Permisos activos como badges */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {Object.entries(emp.permissions)
                          .filter(([, v]) => v)
                          .map(([key]) => (
                            <Badge key={key} variant="outline" className="text-[10px] py-0">
                              {PERMISSION_LABELS[key]}
                            </Badge>
                          ))}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button variant="outline" size="icon" onClick={() => openEmployeeDialog(emp)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="text-red-500" onClick={() => deleteEmployee(emp.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Variantes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" /> Variantes de Productos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newVariantName}
              onChange={(e) => setNewVariantName(e.target.value)}
              placeholder="Nueva variante (ej: Material)"
              onKeyDown={(e) => e.key === 'Enter' && addVariant()}
            />
            <Button onClick={addVariant}><Plus className="h-4 w-4" /></Button>
          </div>

          <div className="space-y-4">
            {variants.map((variant) => (
              <div key={variant.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-lg">{variant.name}</span>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteVariant(variant.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {variant.options.map((option) => (
                    <Badge key={option.id} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                      {option.name}
                      <button onClick={() => deleteOption(variant.id, option.id)} className="ml-1 text-muted-foreground hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newOptionName[variant.id] || ''}
                    onChange={(e) => setNewOptionName(prev => ({ ...prev, [variant.id]: e.target.value }))}
                    placeholder={`Agregar ${variant.name}...`}
                    onKeyDown={(e) => e.key === 'Enter' && addOption(variant.id)}
                  />
                  <Button variant="outline" onClick={() => addOption(variant.id)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={saveSettings} disabled={saving} className="w-full">
            {savedVariants ? <Check className="h-4 w-4 mr-2" /> : null}
            {saving ? 'Guardando...' : savedVariants ? '¡Variantes guardadas!' : 'Guardar Variantes'}
          </Button>
        </CardContent>
      </Card>

      {/* Dialog empleado */}
      {isEmployeeDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editingEmployee ? 'Editar' : 'Nuevo'} Empleado</h2>

            <div className="space-y-4">
              <div>
                <Label>Nombre *</Label>
                <Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} placeholder="Nombre del empleado" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input value={employeeEmail} onChange={(e) => setEmployeeEmail(e.target.value)} placeholder="email@ejemplo.com" type="email" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={employeeActive} onChange={(e) => setEmployeeActive(e.target.checked)} id="active" />
                <Label htmlFor="active">Empleado activo</Label>
              </div>

              {/* Tipo de pago */}
              <div className="border-t pt-4">
                <Label className="mb-2 block">Tipo de pago</Label>
                <div className="flex gap-2">
                  {(['commission', 'salary', 'both'] as const).map(type => (
                    <Button
                      key={type}
                      variant={employeeSalaryType === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEmployeeSalaryType(type)}
                    >
                      {type === 'commission' ? 'Comisión' : type === 'salary' ? 'Salario' : 'Ambos'}
                    </Button>
                  ))}
                </div>
              </div>

              {(employeeSalaryType === 'commission' || employeeSalaryType === 'both') && (
                <div>
                  <Label>Porcentaje de comisión (%)</Label>
                  <Input type="number" value={employeeCommission} onChange={(e) => setEmployeeCommission(e.target.value)} placeholder="10" />
                </div>
              )}
              {(employeeSalaryType === 'salary' || employeeSalaryType === 'both') && (
                <div>
                  <Label>Salario mensual ($)</Label>
                  <Input type="number" value={employeeMonthlySalary} onChange={(e) => setEmployeeMonthlySalary(e.target.value)} placeholder="50000" />
                </div>
              )}

              {/* Permisos */}
              <div className="border-t pt-4">
                <Label className="mb-3 block font-semibold">Permisos</Label>
                <div className="space-y-2">
                  {Object.entries(employeePermissions).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                      <Label htmlFor={key} className="cursor-pointer flex-1">
                        {PERMISSION_LABELS[key]}
                      </Label>
                      <button
                        id={key}
                        onClick={() => togglePermission(key as keyof typeof employeePermissions)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          value ? 'bg-primary' : 'bg-muted-foreground/30'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          value ? 'translate-x-4' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setIsEmployeeDialogOpen(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={saveEmployee}>Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}