"use client";

import { useEffect, useState } from "react";
import { UtensilsCrossed } from "lucide-react";

interface MediaPlatilloProps {
  nombre: string;
  imagenUrl?: string;
  videoUrl?: string;
  /** Clases del elemento visual. Las MISMAS para video, imagen y respaldo. */
  className?: string;
  /** Color de marca, para el degradado del respaldo. */
  brand?: string;
  /** Tamaño del icono del respaldo (varía entre el modal y la tarjeta). */
  tamanoIcono?: string;
}

/**
 * MEDIA DEL PLATILLO — video si existe, imagen si no.
 *
 * Centraliza la decisión en un solo componente en lugar de repetir el
 * `if (video) … else if (imagen) …` en cada sitio donde se muestra un platillo.
 * Así el modal, la tarjeta y cualquier vista futura se comportan igual y reciben
 * las mismas clases.
 *
 * CASCADA DE RESPALDOS (tres niveles, cada uno cubre un fallo real):
 *   1. video_url  — lo que se quiere mostrar.
 *   2. imagen_url — si no hay video, si el navegador no lo soporta o si el
 *                   archivo falla al cargar. También es el `poster`, para que no
 *                   se vea un cuadro negro mientras el video descarga.
 *   3. Degradado con icono — si tampoco hay foto o también falla.
 *
 * ACCESIBILIDAD Y DATOS: el video va `muted` (obligatorio para que los
 * navegadores permitan la reproducción automática), `loop`, `playsInline` (sin
 * esto iOS lo abre a pantalla completa y saca al comensal del menú) y
 * `preload="metadata"` para no descargar el archivo completo de entrada.
 */
export function MediaPlatillo({
  nombre,
  imagenUrl,
  videoUrl,
  className = "",
  brand = "var(--brand, #DC2626)",
  tamanoIcono = "h-16 w-16",
}: MediaPlatilloProps) {
  const [videoFallo, setVideoFallo] = useState(false);
  const [imagenFallo, setImagenFallo] = useState(false);
  /**
   * Se respeta el ahorro de datos del sistema: reproducir video en bucle con
   * "Data Saver" activado es justo lo que el usuario pidió evitar.
   */
  const [ahorroDatos, setAhorroDatos] = useState(false);

  useEffect(() => {
    // `connection` no está en el tipado estándar de Navigator.
    const conexion = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (conexion?.saveData) setAhorroDatos(true);
  }, []);

  // Al cambiar de platillo se reinician los fallos: el error de uno no debe
  // arrastrarse al siguiente.
  useEffect(() => {
    setVideoFallo(false);
    setImagenFallo(false);
  }, [videoUrl, imagenUrl]);

  const mostrarVideo = Boolean(videoUrl) && !videoFallo && !ahorroDatos;
  const mostrarImagen = !mostrarVideo && Boolean(imagenUrl) && !imagenFallo;

  // --- 1) VIDEO ---
  if (mostrarVideo) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        // `key` fuerza a recrear el elemento al cambiar de platillo: sin esto el
        // navegador puede seguir mostrando el fotograma del video anterior.
        key={videoUrl}
        src={videoUrl}
        // La foto como poster: evita el cuadro negro mientras carga.
        poster={imagenUrl}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-label={nombre}
        onError={() => setVideoFallo(true)}
        className={className}
      />
    );
  }

  // --- 2) IMAGEN ---
  if (mostrarImagen) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imagenUrl}
        alt={nombre}
        onError={() => setImagenFallo(true)}
        className={className}
      />
    );
  }

  // --- 3) RESPALDO ---
  return (
    <div className={`relative ${className}`}>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 40%, color-mix(in srgb, ${brand} 32%, #18181b), #0a0a0a 78%)`,
        }}
      />
      <div className="absolute inset-0 grid place-items-center">
        <UtensilsCrossed className={`${tamanoIcono} text-white/25`} />
      </div>
    </div>
  );
}
