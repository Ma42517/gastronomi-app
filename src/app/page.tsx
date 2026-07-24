"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pacifico } from "next/font/google";
import { LayoutDashboard, Smartphone, Store } from "lucide-react";

const pacifico = Pacifico({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pacifico",
  display: "swap",
});

const VISTAS = [
  {
    titulo: "Vista Cliente",
    descripcion: "Menú, pago y sellos de lealtad. Se abre al escanear el QR.",
    etiqueta: "Mobile-First",
    href: "/mesa/el-primo/4",
    icon: Smartphone,
    // Acento por tarjeta (glow en hover)
    accent: "245, 158, 11", // amber
  },
  {
    titulo: "Vista Restaurante",
    descripcion: "Mapa de mesas en tiempo real y alertas de cobro.",
    etiqueta: "Tablet / Caja",
    href: "/dashboard",
    icon: Store,
    accent: "16, 185, 129", // emerald
  },
  {
    titulo: "Panel Administrador",
    descripcion: "Menú, precios, QR por mesa y métricas de retención.",
    etiqueta: "B2B / Dueño",
    href: "/admin",
    icon: LayoutDashboard,
    accent: "139, 92, 246", // violet
  },
];

export default function Home() {
  const [mostrarEslogan, setMostrarEslogan] = useState(false);
  const [mostrarMenu, setMostrarMenu] = useState(false);

  useEffect(() => {
    // El eslogan aparece cuando el trazo casi termina; luego el menú.
    const t1 = setTimeout(() => setMostrarEslogan(true), 1900);
    const t2 = setTimeout(() => setMostrarMenu(true), 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <main
      className={`${pacifico.variable} relative min-h-screen overflow-hidden bg-[#0a0a0f] text-white`}
    >
      {/* --- Halos ambientales del fondo (glassmorphism necesita luz detrás) --- */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float-slow absolute -left-24 top-10 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl" />
        <div
          className="animate-float-slow absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-rose-500/20 blur-3xl"
          style={{ animationDelay: "1.5s" }}
        />
        <div
          className="animate-float-slow absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl"
          style={{ animationDelay: "3s" }}
        />
      </div>

      {/* --- Título "Ñom Ñom" (caligrafía dibujada a mano) --- */}
      <div
        className={`absolute left-0 right-0 z-20 flex justify-center transition-all duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          mostrarMenu
            ? "top-6 scale-[0.42] sm:top-8 sm:scale-50"
            : "top-1/2 -translate-y-1/2 scale-100"
        }`}
      >
        <div className="relative">
          {/* Resplandor detrás del texto */}
          <div className="animate-glow-pulse absolute inset-0 -z-10 blur-2xl">
            <div className="mx-auto h-full w-3/4 rounded-full bg-gradient-to-r from-amber-400/40 via-rose-500/40 to-violet-500/40" />
          </div>

          <svg
            viewBox="0 0 640 200"
            className="w-[86vw] max-w-[540px]"
            role="img"
            aria-label="Ñom Ñom"
          >
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              className="brush-text"
              style={{
                fontFamily: "var(--font-pacifico), cursive",
                fontSize: "110px",
              }}
            >
              Ñom Ñom
            </text>
          </svg>
        </div>
      </div>

      {/* --- Eslogan del splash (independiente para no escalar con el título) --- */}
      <p
        className={`absolute left-0 right-0 top-[62%] z-20 px-6 text-center font-sans text-base tracking-wide text-white/60 transition-all duration-700 ${
          mostrarEslogan && !mostrarMenu
            ? "opacity-100"
            : "translate-y-2 opacity-0"
        }`}
      >
        Escanea. Ordena. Paga. Así de fácil.
      </p>

      {/* --- Menú de las 3 vistas (glassmorphism) --- */}
      <section
        className={`relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 pb-16 pt-56 transition-opacity duration-500 ${
          mostrarMenu ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!mostrarMenu}
      >
        <div className="grid gap-5 sm:grid-cols-3">
          {VISTAS.map((vista, i) => {
            const Icon = vista.icon;
            return (
              <Link
                key={vista.href}
                href={vista.href}
                style={
                  {
                    animationDelay: `${i * 120}ms`,
                    "--accent": vista.accent,
                  } as React.CSSProperties
                }
                className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.37)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-white/25 hover:bg-white/[0.1] hover:shadow-[0_0_40px_-4px_rgba(var(--accent),0.55)] ${
                  mostrarMenu ? "animate-fade-in-up opacity-0" : "opacity-0"
                }`}
              >
                {/* Brillo superior (borde iluminado sutil) */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                {/* Resplandor radial en hover */}
                <div
                  className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(120px 80px at 30% 0%, rgba(var(--accent),0.25), transparent 70%)",
                  }}
                />

                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: "rgba(var(--accent), 0.15)",
                    color: "rgb(var(--accent))",
                  }}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <span className="mb-2 inline-block rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-white/60">
                  {vista.etiqueta}
                </span>

                <h2 className="text-lg font-semibold text-white">
                  {vista.titulo}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-white/55">
                  {vista.descripcion}
                </p>

                <span
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold transition-transform duration-300 group-hover:translate-x-1"
                  style={{ color: "rgb(var(--accent))" }}
                >
                  Entrar →
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <p className="font-sans text-sm tracking-wide text-white/45">
            Escanea. Ordena. Paga. Así de fácil.
          </p>
          <p className="mt-1.5 font-sans text-xs text-white/25">
            Ñom Ñom · Next.js + Supabase · Entorno de desarrollo
          </p>
        </div>
      </section>
    </main>
  );
}
