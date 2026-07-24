import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText, type Message } from "ai";

/**
 * Endpoint de chat de "Ñom AI" (Vercel AI SDK).
 *
 * Requiere la variable de entorno OPENAI_API_KEY. Si no está configurada,
 * la petición devolverá un error (400/500) que el frontend mostrará.
 *
 * Cuando conectemos el menú real, aquí se puede inyectar el catálogo del
 * restaurante en el `system` prompt (o vía herramientas / RAG).
 */

export const maxDuration = 30;

const SYSTEM_PROMPT = `Eres Ñom AI, el asistente virtual experto del restaurante. \
Ayudas a los clientes a elegir platillos basándote en el menú. \
Responde en español, de forma breve, cálida y apetitosa. \
Si te preguntan por alergias o restricciones, tenlas en cuenta en tus recomendaciones.`;

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "Falta la variable de entorno OPENAI_API_KEY. Configúrala para activar Ñom AI.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { messages }: { messages: Message[] } = await req.json();

  const result = await streamText({
    model: openai("gpt-4o-mini"),
    system: SYSTEM_PROMPT,
    messages: convertToCoreMessages(messages),
  });

  return result.toDataStreamResponse();
}
