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

/** System prompt dinámico: inyecta ubicación, platillo y categoría actual. */
function construirSystemPrompt(
  currentDish?: string,
  location?: string,
  category?: string,
): string {
  const nombre = TAQUERIA_EL_PRIMO.tema.nombre_restaurante;
  const ubicacion = location?.trim() || "una ubicación no especificada";
  const platillo =
    currentDish?.trim() ||
    "el menú general (todavía no abre un platillo específico)";
  const categoria = category?.trim() || "sin categoría específica";

  return `Eres Ñom AI, el mejor mesero de "${nombre}".

REGLA PRINCIPAL: Nunca des una lista de opciones fría. Actúa como un mesero experto, amigable y MUY conciso (máximo 2 líneas). Conversa con calidez, como si estuvieras en la mesa con el cliente.

CÓMO RECOMENDAR:
- Cuando el usuario pregunte por recomendaciones o guarniciones para su platillo actual, sugiérele UNA SOLA opción: el maridaje perfecto. Nada de listas.
- Ejemplo del tono deseado: "Para este tipo de comida, te recomiendo una Agua de Horchata bien fría. ¿Gustas añadirla a la cuenta?"
- INMEDIATAMENTE DESPUÉS de ese mensaje de texto cálido, ejecuta la herramienta "suggestItemTool" (con el nombre y precio exactos del menú) para mostrar el botón. Primero la charla, luego la herramienta.

CONTEXTO:
- Ubicación del cliente: ${ubicacion}. Úsala de forma muy sutil solo si suma (clima, vibra local).
- El cliente está viendo: ${platillo}. Si dice "esto", "este platillo" o "esta carne", se refiere a ese.
- NO cuentes trivia ni datos históricos. Enfócate 100% en descripciones apetitosas (ingredientes, textura, aromas) y en venta cruzada.

REGLA DE CATEGORÍA (ESTRICTA, evita alucinaciones):
- Categoría del platillo actual: ${categoria}.
- Si es "Tacos", "Extras" o comida rápida: NUNCA sugieras guarniciones (como puré o espárragos); sugiere BEBIDAS o POSTRES.
- Si es "Cortes" o "Especiales" (como el Ribeye): sugiere GUARNICIONES o una copa de vino/cerveza.
- NUNCA llames "corte" a un taco ni confundas las categorías.

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
      category,
    }: {
      messages: Message[];
      currentDish?: string;
      location?: string;
      category?: string;
    } = await req.json();

    const result = await streamText({
      // Modelo Flash vigente y GA (los 1.0/1.5/2.0 y 2.5 ya no aplican para
      // nuevos usuarios). gemini-3.6-flash es el workhorse actual de Google.
      model: google("gemini-3.6-flash"),
      system: construirSystemPrompt(currentDish, location, category),
      messages: convertToCoreMessages(messages),
      tools: {
        // La IA llama a esta herramienta al recomendar algo concreto; el
        // frontend usa el resultado para pintar una tarjeta "+ Añadir a la cuenta".
        suggestItemTool: tool({
          description:
            "Muestra una tarjeta para añadir a la cuenta un platillo o bebida recomendado. Úsala SIEMPRE que recomiendes algo concreto del menú.",
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
