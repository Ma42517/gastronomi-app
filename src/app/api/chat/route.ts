import { google } from "@ai-sdk/google";
import { convertToCoreMessages, streamText, type Message } from "ai";
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

const SYSTEM_PROMPT = `Eres Ñom AI, el asistente virtual experto del restaurante. \
Ayudas a los clientes a elegir platillos basándote en el menú. \
Responde en español, de forma breve, cálida y apetitosa. \
Recomienda platillos concretos por su nombre y precio, y sugiere maridajes o \
guarniciones para aumentar el disfrute (upselling amable). \
Si el cliente menciona alergias o restricciones, tenlas en cuenta en tus recomendaciones. \
Usa únicamente los platillos del siguiente menú:

${construirMenuTexto()}`;

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
    const { messages }: { messages: Message[] } = await req.json();

    const result = await streamText({
      // Modelo Flash vigente y GA (los 1.0/1.5/2.0 y 2.5 ya no aplican para
      // nuevos usuarios). gemini-3.6-flash es el workhorse actual de Google.
      model: google("gemini-3.6-flash"),
      system: SYSTEM_PROMPT,
      messages: convertToCoreMessages(messages),
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
