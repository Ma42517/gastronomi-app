import { google } from "@ai-sdk/google";
import { convertToCoreMessages, streamText, tool, type Message } from "ai";
import { z } from "zod";
import { TAQUERIA_EL_PRIMO } from "@/lib/mock-data";

/**
 * Endpoint de chat de "Ñom AI" (Vercel AI SDK + Google Gemini).
 *
 * Requiere la variable de entorno GOOGLE_GENERATIVE_AI_API_KEY
 * (tu llave de Google AI Studio). Si no está configurada, la petición
 * devuelve un error que el frontend muestra de forma controlada.
 */

export const maxDuration = 30;

/** Construye el menú real (desde el mock) para inyectarlo en el system prompt. */
function construirMenuTexto(): string {
  const r = TAQUERIA_EL_PRIMO;
  const heroItem = r.menu.find((m) => m.id === r.hero.item_id);

  const platillos = r.menu
    .filter((m) => m.disponible)
    .map(
      (m) =>
        `- ${m.nombre} (${m.categoria}): ${m.descripcion} — $${m.precio}`,
    );

  const guarniciones = r.hero.guarniciones.map(
    (g) => `- ${g.nombre}: +$${g.precio_extra}`,
  );

  return [
    `MENÚ DE ${r.tema.nombre_restaurante.toUpperCase()}`,
    ...platillos,
    "",
    `Guarniciones para el ${heroItem?.nombre ?? "platillo principal"}:`,
    ...guarniciones,
    "",
    `Programa de lealtad: obtén "${r.lealtad.descripcion_recompensa}" al completar ${r.lealtad.sellos_para_recompensa} visitas.`,
  ].join("\n");
}

/** System prompt dinámico: inyecta ubicación y platillo actual del cliente. */
function construirSystemPrompt(currentDish?: string, location?: string): string {
  const nombre = TAQUERIA_EL_PRIMO.tema.nombre_restaurante;
  const ubicacion = location?.trim() || "una ubicación no especificada";
  const platillo =
    currentDish?.trim() ||
    "el menú general (todavía no abre un platillo específico)";

  return `Eres Ñom AI, el mejor mesero de "${nombre}".

REGLAS DE ORO:
1. Habla de forma MUY concisa, directa y súper natural. Cero formalismos robóticos. Máximo 1 o 2 oraciones.
2. UBICACIÓN: El cliente está en ${ubicacion}. Usa este dato de forma muy sutil si tiene sentido (ej. mencionar el clima local o la vibra de la ciudad al recomendar bebidas o comida).
3. CONTEXTO: El cliente está viendo actualmente: ${platillo}. Si el cliente dice "esto", "esta carne" o "este platillo", se refiere a ese en específico. Dale un dato curioso o útil y breve sobre ese platillo.
4. VENTA: Siempre busca sugerir inteligentemente una guarnición o bebida. Cuando recomiendes un platillo o bebida concretos del menú, llama a la herramienta "suggestItem" con su nombre y precio exactos.

MENÚ DISPONIBLE:
${construirMenuTexto()}`;
}

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "Falta la variable de entorno GOOGLE_GENERATIVE_AI_API_KEY (llave de Google AI Studio). Configúrala para activar Ñom AI.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    // Contexto dinámico enviado desde el frontend (useChat body).
    const {
      messages,
      currentDish,
      location,
    }: { messages: Message[]; currentDish?: string; location?: string } =
      await req.json();

    const result = await streamText({
      // Modelo Flash vigente y GA (los 1.0/1.5/2.0 y 2.5 ya no aplican para
      // nuevos usuarios). gemini-3.6-flash es el workhorse actual de Google.
      model: google("gemini-3.6-flash"),
      system: construirSystemPrompt(currentDish, location),
      messages: convertToCoreMessages(messages),
      tools: {
        // La IA llama a esta herramienta al recomendar algo concreto; el
        // frontend usa el resultado para pintar un botón "+ Agregar".
        suggestItem: tool({
          description:
            "Muestra un botón para agregar al carrito un platillo o bebida recomendado. Úsala SIEMPRE que recomiendes algo concreto del menú.",
          parameters: z.object({
            itemName: z
              .string()
              .describe("Nombre exacto del platillo o bebida del menú"),
            price: z.number().describe("Precio en pesos (MXN) del item"),
          }),
          execute: async ({ itemName, price }) => ({ itemName, price }),
        }),
      },
    });

    // Loguea y reenvía el mensaje de error REAL (en lugar de ocultarlo).
    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        const mensaje = error instanceof Error ? error.message : String(error);
        console.error("[Ñom AI] Error durante el streaming:", mensaje);
        return mensaje;
      },
    });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error desconocido";
    console.error("[Ñom AI] Error en POST /api/chat:", error);
    return new Response(JSON.stringify({ error: mensaje }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
