"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Store, User, Bell, Save } from 'lucide-react';

export default function ConfiguracionPage() {
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Configuración</h1>

      <div className="space-y-6">
        {/* Información de la tienda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Información de la Tienda
            </CardTitle>
            <CardDescription>
              Actualiza los datos de tu comercio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre de la tienda</Label>
              <Input id="name" defaultValue="Mi Tienda Demo" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" placeholder="Calle principal #123" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" placeholder="+52 123 456 7890" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tax">Impuesto (%)</Label>
              <Input id="tax" type="number" defaultValue="16" />
            </div>
            <Button className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </Button>
          </CardContent>
        </Card>

        {/* Perfil de usuario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Perfil de Usuario
            </CardTitle>
            <CardDescription>
              Configura tu información personal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" defaultValue="admin@demo.com" disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="current-password">Contraseña actual</Label>
              <Input id="current-password" type="password" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input id="new-password" type="password" />
            </div>
            <Button className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Actualizar Contraseña
            </Button>
          </CardContent>
        </Card>

        {/* Notificaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones
            </CardTitle>
            <CardDescription>
              Configura cómo recibes notificaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Stock bajo</p>
                <p className="text-sm text-muted-foreground">Recibe alertas cuando un producto tenga poco stock</p>
              </div>
              <Button variant="outline">Activar</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Resumen diario</p>
                <p className="text-sm text-muted-foreground">Recibe un resumen de ventas cada día</p>
              </div>
              <Button variant="outline">Activar</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Nuevas funcionalidades</p>
                <p className="text-sm text-muted-foreground">Sé el primero en conocer nuevas características</p>
              </div>
              <Button variant="outline">Activar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Información de la app */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Acerca de POStify
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              POStify v1.0.0
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Sistema de punto de venta desarrollado con Next.js y Supabase
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}