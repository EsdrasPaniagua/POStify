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
import { Store, Tag, Plus, X, Check, Trash2, Users, UserPlus } from 'lucide-react';

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
  settings: false
};

export default function ConfiguracionPage() {
  const [user, loading] = useAuthState(auth);
  const [storeName, setStoreName] = useState('');
  const [variants, setVariants] = useState<Variant[]>(DEFAULT_VARIANTS);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [saving, setSaving] = useState(false);
  const [newVariantName, setNewVariantName] = useState('');
  const [newOptionName, setNewOptionName] = useState('');
  
  // Employee form states
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [employeeSalaryType, setEmployeeSalaryType] = useState<'commission' | 'salary' | 'both'>('commission');
  const [employeeCommission, setEmployeeCommission] = useState('');
  const [employeeMonthlySalary, setEmployeeMonthlySalary] = useState('');
  const [employeePermissions, setEmployeePermissions] = useState(DEFAULT_PERMISSIONS);
  const [employeeActive, setEmployeeActive] = useState(true);

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
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      setEmployees(data);
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

  // Variant functions
  const addVariant = () => {
    if (!newVariantName.trim()) { toast.error('Escribe un nombre'); return; }
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
    if (!newOptionName.trim()) { toast.error('Escribe una opción'); return; }
    setVariants(prev => prev.map(v => {
      if (v.id === variantId) {
        const newOption = { id: Date.now().toString(), name: newOptionName.trim() };
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

  // Employee functions
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
  if (!employeeName.trim() || !employeeEmail.trim()) {
    toast.error('Completa todos los campos');
    return;
  }

  try {
    const employeeData = {
      name: employeeName.trim(),
      email: employeeEmail.trim().toLowerCase(),
      userId: user.uid,
      ownerEmail: user.email, // <-- AGREGAR ESTO
      active: employeeActive,
      salaryType: employeeSalaryType,
      commissionPercent: parseFloat(employeeCommission) || 0,
      monthlySalary: parseFloat(employeeMonthlySalary) || 0,
      permissions: employeePermissions
    };

    if (editingEmployee) {
      await updateDoc(doc(db, 'employees', editingEmployee.id), employeeData);
      toast.success('Empleado actualizado');
    } else {
      await addDoc(collection(db, 'employees'), employeeData);
      toast.success('Empleado agregado');
    }

    setIsEmployeeDialogOpen(false);
    loadEmployees();
  } catch (error) {
    console.error('Error:', error);
    toast.error('Error al guardar');
  }
};

  const deleteEmployee = async (id: string) => {
    if (!confirm('¿Eliminar este empleado?')) return;
    try {
      await deleteDoc(doc(db, 'employees', id));
      toast.success('Empleado eliminado');
      loadEmployees();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar');
    }
  };

  const togglePermission = (key: keyof typeof employeePermissions) => {
    setEmployeePermissions(prev => ({ ...prev, [key]: !prev[key] }));
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
            <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Mi Tienda" />
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </CardContent>
      </Card>

      {/* Employees */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Empleados
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
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" onClick={() => openEmployeeDialog(emp)}>
                      <X className="h-4 w-4" />
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

      {/* Variants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Variantes de Productos
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
                    value={newOptionName}
                    onChange={(e) => setNewOptionName(e.target.value)}
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
            {saving ? 'Guardando...' : 'Guardar Variantes'}
          </Button>
        </CardContent>
      </Card>

      {/* Employee Dialog */}
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
                <input 
                  type="checkbox" 
                  checked={employeeActive} 
                  onChange={(e) => setEmployeeActive(e.target.checked)} 
                  id="active"
                />
                <Label htmlFor="active">Empleado activo</Label>
              </div>

              <div className="border-t pt-4">
                <Label className="mb-2 block">Tipo de pago</Label>
                <div className="flex gap-2">
                  <Button 
                    variant={employeeSalaryType === 'commission' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setEmployeeSalaryType('commission')}
                  >
                    Comisión
                  </Button>
                  <Button 
                    variant={employeeSalaryType === 'salary' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setEmployeeSalaryType('salary')}
                  >
                    Salario
                  </Button>
                  <Button 
                    variant={employeeSalaryType === 'both' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setEmployeeSalaryType('both')}
                  >
                    Ambos
                  </Button>
                </div>
              </div>

              {(employeeSalaryType === 'commission' || employeeSalaryType === 'both') && (
                <div>
                  <Label>Porcentaje de comisión (%)</Label>
                  <Input 
                    type="number" 
                    value={employeeCommission} 
                    onChange={(e) => setEmployeeCommission(e.target.value)} 
                    placeholder="10" 
                  />
                </div>
              )}

              {(employeeSalaryType === 'salary' || employeeSalaryType === 'both') && (
                <div>
                  <Label>Salario mensual ($)</Label>
                  <Input 
                    type="number" 
                    value={employeeMonthlySalary} 
                    onChange={(e) => setEmployeeMonthlySalary(e.target.value)} 
                    placeholder="50000" 
                  />
                </div>
              )}

              <div className="border-t pt-4">
                <Label className="mb-2 block">Permisos</Label>
                <div className="space-y-2">
                  {Object.entries(employeePermissions).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() => togglePermission(key as keyof typeof employeePermissions)}
                        id={key}
                      />
                      <Label htmlFor={key} className="capitalize"> {key === 'viewSales' && 'Ver ventas'} {key === 'editProducts' && 'Editar productos'} {key === 'deleteProducts' && 'Eliminar productos'} {key === 'viewDashboard' && 'Ver dashboard'} {key === 'manageCategories' && 'Gestionar categorías'} {key === 'manageEmployees' && 'Gestionar empleados'} {key === 'settings' && 'Configuración'} </Label> </div> ))} </div> </div> </div>

                              <div className="flex gap-2 mt-6">
                                <Button variant="outline" onClick={() => setIsEmployeeDialogOpen(false)}>
                                  Cancelar
                                </Button>
                                <Button onClick={saveEmployee}>
                                  Guardar
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      ); }