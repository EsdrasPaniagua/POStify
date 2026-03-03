"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, db } from '@/src/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function LandingPage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [user] = useAuthState(auth);
  const [loggingIn, setLoggingIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  // Si ya tiene sesión, redirigir directo al pos
  useEffect(() => {
    if (user) router.push('/pos');
  }, [user]);

  const handleLogin = () => setShowLoginModal(true);

  const loginAs = async (type: 'owner' | 'employee') => {
    setShowLoginModal(false);
    setLoggingIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = (result.user.email || '').toLowerCase().trim();

      if (type === 'employee') {
        const allSnap = await getDocs(collection(db, 'employees'));
        const matched = allSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter((emp: any) => emp.email?.toLowerCase() === email && emp.active);

        if (matched.length === 0) {
          await signOut(auth);
          alert('Tu email no está registrado como empleado activo');
          setLoggingIn(false);
          return;
        }

        const emp = matched[0];
        localStorage.setItem('employeeData', JSON.stringify({ ...emp, ownerUserId: emp.userId }));
        localStorage.setItem('ownerUserId', emp.userId);
      } else {
        const settingsSnap = await getDocs(query(collection(db, 'settings'), where('userId', '==', result.user.uid)));
        if (settingsSnap.empty) {
          await setDoc(doc(db, 'settings', result.user.uid), {
            storeName: 'Mi Tienda',
            createdAt: new Date().toISOString(),
            userId: result.user.uid,
          });
        }
        localStorage.setItem('ownerUserId', result.user.uid);
        localStorage.removeItem('employeeData');
      }
      router.push('/pos');
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request') {
        console.error(error);
      }
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      color: '#f0f0f5',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .glow-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }

        .feature-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 28px;
          transition: all 0.3s ease;
          cursor: default;
        }
        .feature-card:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(139,92,246,0.3);
          transform: translateY(-2px);
        }

        .btn-primary {
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: white;
          border: none;
          padding: 14px 36px;
          border-radius: 100px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          letter-spacing: 0.02em;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(124,58,237,0.4);
        }

        .btn-secondary {
          background: transparent;
          color: rgba(255,255,255,0.6);
          border: 1px solid rgba(255,255,255,0.15);
          padding: 14px 36px;
          border-radius: 100px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .btn-secondary:hover {
          color: white;
          border-color: rgba(255,255,255,0.3);
        }

        .stat-num {
          font-family: 'Syne', sans-serif;
          font-size: 42px;
          font-weight: 800;
          background: linear-gradient(135deg, #a78bfa, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .fade-in {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .fade-in.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(124,58,237,0.15);
          border: 1px solid rgba(124,58,237,0.3);
          border-radius: 100px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 500;
          color: #a78bfa;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .divider {
          width: 1px;
          height: 40px;
          background: rgba(255,255,255,0.1);
        }

        @media (max-width: 768px) {
          .hero-title { font-size: 48px !important; }
          .stats-row { flex-direction: column; gap: 24px !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .cta-buttons { flex-direction: column; align-items: stretch !important; }
          .cta-buttons button { text-align: center; }
        }
      `}</style>

      {/* Orbs decorativos */}
      <div className="glow-orb" style={{ width: 500, height: 500, background: 'rgba(124,58,237,0.15)', top: -100, right: -100 }} />
      <div className="glow-orb" style={{ width: 400, height: 400, background: 'rgba(79,70,229,0.1)', bottom: 100, left: -150 }} />

      {/* NAV */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 48px',
        position: 'relative',
        zIndex: 10,
      }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
          POS<span style={{ color: '#7c3aed' }}>tify</span>
        </span>
        <button className="btn-primary" style={{ padding: '10px 24px', fontSize: 14 }} onClick={handleLogin}>
          Iniciar sesión
        </button>
      </nav>

      {/* HERO */}
      <div style={{
        maxWidth: 860,
        margin: '0 auto',
        padding: '80px 24px 60px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 10,
      }}>
        <div className={`fade-in ${visible ? 'visible' : ''}`} style={{ transitionDelay: '0ms' }}>
          <span className="badge">🚀 Sistema de punto de venta</span>
        </div>

        <h1
          className={`fade-in ${visible ? 'visible' : ''} hero-title`}
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            margin: '28px 0 20px',
            transitionDelay: '100ms',
          }}
        >
          Tu negocio,<br />
          <span style={{ background: 'linear-gradient(135deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            bajo control
          </span>
        </h1>

        <p className={`fade-in ${visible ? 'visible' : ''}`} style={{
          fontSize: 18,
          color: 'rgba(255,255,255,0.5)',
          lineHeight: 1.7,
          maxWidth: 520,
          margin: '0 auto 40px',
          transitionDelay: '200ms',
          fontWeight: 300,
        }}>
          Gestioná ventas, inventario y empleados desde cualquier dispositivo. Simple, rápido y sin complicaciones.
        </p>

        <div className={`fade-in ${visible ? 'visible' : ''} cta-buttons`} style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          transitionDelay: '300ms',
        }}>
          <button className="btn-primary" onClick={handleLogin}>
            Empezar gratis →
          </button>

        </div>
      </div>

      {/* STATS */}
      <div className={`fade-in ${visible ? 'visible' : ''}`} style={{
        maxWidth: 700,
        margin: '0 auto 80px',
        padding: '0 24px',
        transitionDelay: '400ms',
      }}>
        <div className="stats-row" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 48,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20,
          padding: '32px 48px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div className="stat-num">∞</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Productos</div>
          </div>
          <div className="divider" />
          <div style={{ textAlign: 'center' }}>
            <div className="stat-num">3</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Inventarios</div>
          </div>
          <div className="divider" />
          <div style={{ textAlign: 'center' }}>
            <div className="stat-num">24/7</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Disponible</div>
          </div>
          <div className="divider" />
          <div style={{ textAlign: 'center' }}>
            <div className="stat-num">0$</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Para empezar</div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 100px' }}>
        <div className={`fade-in ${visible ? 'visible' : ''} features-grid`} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          transitionDelay: '500ms',
        }}>
          {[
            { icon: '🛒', title: 'Punto de venta', desc: 'Procesá ventas rápido con búsqueda, escáner de código de barras y múltiples métodos de pago.' },
            { icon: '📦', title: 'Inventario múltiple', desc: 'Manejá varios inventarios separados — depósito, camioneta, local — con colores para identificarlos.' },
            { icon: '📊', title: 'Estadísticas', desc: 'Dashboards con ganancia neta, ventas por período, métricas por empleado y más.' },
            { icon: '👥', title: 'Empleados', desc: 'Creá empleados con permisos específicos, comisiones y seguimiento de sus ventas.' },
            { icon: '🎨', title: 'Variantes', desc: 'Configurá variantes de productos como color, talle, peso. Filtros multi-select incluidos.' },
            { icon: '📱', title: 'Responsive', desc: 'Funciona perfecto en celular, tablet y desktop. Modo oscuro incluido.' },
          ].map((f, i) => (
            <div key={i} className="feature-card" style={{ transitionDelay: `${500 + i * 50}ms` }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, fontFamily: 'Syne, sans-serif' }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, fontWeight: 300 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA FINAL */}
      <div style={{
        textAlign: 'center',
        padding: '60px 24px 100px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        zIndex: 10,
      }}>
        <h2 style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 36,
          fontWeight: 800,
          marginBottom: 16,
          letterSpacing: '-0.02em',
        }}>
          Empezá hoy, es gratis
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, marginBottom: 32, fontWeight: 300 }}>
          Solo necesitás una cuenta de Google para comenzar.
        </p>
        <button className="btn-primary" style={{ fontSize: 16, padding: '16px 44px' }} onClick={handleLogin}>
          Crear mi tienda →
        </button>
      </div>

      {/* FOOTER */}
      <div style={{
        textAlign: 'center',
        padding: '20px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        fontSize: 12,
        color: 'rgba(255,255,255,0.2)',
      }}>
        © 2025 POStify — Sistema de punto de venta
      </div>

      {/* MODAL LOGIN */}
      {showLoginModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            background: '#13131a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20,
            padding: 32,
            width: '100%',
            maxWidth: 360,
          }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, marginBottom: 6, textAlign: 'center' }}>
              ¿Cómo vas a entrar?
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 24 }}>
              Seleccioná una opción
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => loginAs('owner')}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  cursor: 'pointer', color: '#f0f0f5', fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                <span style={{ fontSize: 28 }}>🏪</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Soy el dueño</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Tengo mi propia tienda</div>
                </div>
              </button>
              <button
                onClick={() => loginAs('employee')}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  cursor: 'pointer', color: '#f0f0f5', fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                <span style={{ fontSize: 28 }}>👤</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Soy empleado</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Trabajo en una tienda</div>
                </div>
              </button>
              <button
                onClick={() => setShowLoginModal(false)}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'rgba(255,255,255,0.3)', fontSize: 13,
                  cursor: 'pointer', padding: '8px', fontFamily: 'inherit',
                  marginTop: 4,
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}