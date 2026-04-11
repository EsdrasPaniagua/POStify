"use client";

// src/components/StoreSelector.tsx
// Full-screen overlay shown when a user is logged in but has no active store selected,
// or when they explicitly want to switch stores.

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { setActiveStore } from "@/src/lib/userId";
import { Plus, Store, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StoreDoc {
  id: string;
  name: string;
  createdAt?: string;
}

interface Props {
  userId: string;
  onStoreSelected: (storeId: string, storeName: string) => void;
}

const COLORS = [
  "#7c3aed",
  "#2563eb",
  "#059669",
  "#d97706",
  "#dc2626",
  "#0891b2",
];

export function StoreSelector({ userId, onStoreSelected }: Props) {
  const [stores, setStores] = useState<StoreDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadStores();
  }, [userId]);

  const loadStores = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "settings"),
        where("userId", "==", userId)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().storeName || d.data().businessName || "Mi Tienda",
        createdAt: d.data().createdAt,
      }));
      setStores(list);

      // If only one store exists, auto-select it
      if (list.length === 1) {
        handleSelect(list[0]);
        return;
      }

      // If zero stores, show creation form immediately
      if (list.length === 0) {
        setShowNewForm(true);
      }
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar tiendas");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (store: StoreDoc) => {
    setSelectedId(store.id);
    setActiveStore(store.id);
    onStoreSelected(store.id, store.name);
  };

  const createStore = async () => {
    if (!newStoreName.trim()) {
      toast.error("Escribí un nombre para la tienda");
      return;
    }
    setCreating(true);
    try {
      // Use a unique ID: userId + timestamp
      const storeId = `${userId}_${Date.now()}`;
      await setDoc(doc(db, "settings", storeId), {
        storeName: newStoreName.trim(),
        userId,
        createdAt: new Date().toISOString(),
        inventories: [],
        variants: [],
      });
      toast.success("¡Tienda creada!");
      setActiveStore(storeId);
      onStoreSelected(storeId, newStoreName.trim());
    } catch (e) {
      console.error(e);
      toast.error("Error al crear la tienda");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0f] p-6">
      {/* Decorative orbs */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: 400,
          height: 400,
          top: -80,
          right: -80,
          borderRadius: "50%",
          background: "rgba(124,58,237,0.12)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          width: 320,
          height: 320,
          bottom: 60,
          left: -120,
          borderRadius: "50%",
          background: "rgba(79,70,229,0.08)",
          filter: "blur(80px)",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <span
            style={{
              fontFamily: "system-ui, sans-serif",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#f0f0f5",
            }}
          >
            POS
            <span style={{ color: "#7c3aed" }}>tify</span>
          </span>
          <p className="mt-2 text-sm text-white/40">
            {stores.length > 0
              ? "Seleccioná una tienda para continuar"
              : "Creá tu primera tienda"}
          </p>
        </div>

        {/* Existing stores */}
        {stores.length > 0 && !showNewForm && (
          <div className="space-y-3 mb-4">
            {stores.map((store, i) => (
              <button
                key={store.id}
                onClick={() => handleSelect(store)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left"
                style={{
                  background:
                    selectedId === store.id
                      ? "rgba(124,58,237,0.15)"
                      : "rgba(255,255,255,0.04)",
                  borderColor:
                    selectedId === store.id
                      ? "rgba(124,58,237,0.5)"
                      : "rgba(255,255,255,0.08)",
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: COLORS[i % COLORS.length] + "30" }}
                >
                  <Store
                    className="h-5 w-5"
                    style={{ color: COLORS[i % COLORS.length] }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-sm truncate"
                    style={{ color: "#f0f0f5" }}
                  >
                    {store.name}
                  </p>
                  {store.createdAt && (
                    <p className="text-xs text-white/30 mt-0.5">
                      Creada{" "}
                      {new Date(store.createdAt).toLocaleDateString("es-AR")}
                    </p>
                  )}
                </div>
                {selectedId === store.id && (
                  <CheckCircle2 className="h-5 w-5 text-violet-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* New store form */}
        {showNewForm ? (
          <div
            className="p-5 rounded-2xl border space-y-4"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            <p className="text-sm font-semibold text-white/80">
              Nueva tienda
            </p>
            <input
              autoFocus
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createStore()}
              placeholder="Nombre de la tienda..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-500/60 transition-colors"
            />
            <div className="flex gap-2">
              {stores.length > 0 && (
                <button
                  onClick={() => {
                    setShowNewForm(false);
                    setNewStoreName("");
                  }}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors"
                  style={{
                    borderColor: "rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.5)",
                    background: "transparent",
                  }}
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={createStore}
                disabled={creating || !newStoreName.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                style={{
                  background:
                    creating || !newStoreName.trim()
                      ? "rgba(124,58,237,0.3)"
                      : "linear-gradient(135deg,#7c3aed,#4f46e5)",
                  color: "white",
                  cursor:
                    creating || !newStoreName.trim()
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creando...
                  </>
                ) : (
                  "Crear tienda"
                )}
              </button>
            </div>
          </div>
        ) : (
          // "Add new store" button
          stores.length > 0 && (
            <button
              onClick={() => setShowNewForm(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium transition-all"
              style={{
                background: "rgba(255,255,255,0.02)",
                borderColor: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.5)",
                borderStyle: "dashed",
              }}
            >
              <Plus className="h-4 w-4" />
              Crear nueva tienda
            </button>
          )
        )}
      </div>
    </div>
  );
}