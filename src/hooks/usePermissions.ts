"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Permissions {
  viewSales: boolean;
  editProducts: boolean;
  deleteProducts: boolean;
  viewDashboard: boolean;
  manageCategories: boolean;
  manageEmployees: boolean;
  settings: boolean;
}

interface EmployeeData {
  id: string;
  name: string;
  permissions: Permissions;
}

export function usePermissions(requiredPermission?: keyof Permissions) {
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('employeeData');
    if (!stored) {
      setIsOwner(true);
      setChecked(true);
      return;
    }

    const emp: EmployeeData = JSON.parse(stored);
    setEmployeeData(emp);
    setIsOwner(false);

    if (requiredPermission && !emp.permissions[requiredPermission]) {
      toast.error('No tenés permiso para acceder a esta sección');
      router.push('/');
    }

    setChecked(true);
  }, [requiredPermission]);

  const can = (permission: keyof Permissions): boolean => {
    if (isOwner) return true;
    if (!employeeData) return false;
    return employeeData.permissions[permission] === true;
  };

  return { isOwner, employeeData, can, checked };
}