import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { TAQUERIA_EL_PRIMO } from "@/lib/mock-data";
import type { CopilotoPayload } from "@/lib/copiloto";

/**
 * Endpoint del COPILOTO DE IA del detalle del platillo.
 *
 * A diferencia de `/api/chat` (conversacional y en streaming), este endpoint es
 * de UN SOLO DISPARO y NO hace streaming: el cliente necesita un texto corto y
 * completo para hacer el crossfade de una sola vez. Un texto que se escribe
 * letra por letra produciría exactamente el "glitcheo" que queremos evitar.
 *
 * Contrato: POST { CopilotoPayload } -> 200 { texto } | 4xx/5xx { error }
 * El frontend degrada a `copilotoLocal()` ante cualquier fallo, así que este
 * endpoint nunca es un punto único de falla para la UX.
 */

export const maxDuration = 15;

/** Máximo de caracteres del texto: ~3 líneas en un móvil de 390px de ancho. */
const MAX_CARACTERES = 240;

/** Describe las elecciones del cliente en lenguaje natural para el prompt. */
function describirSelecciones(payload: CopilotoPayload): string {
  if (payload.grupos.length === 0) {
    return "El cliente TODAVÍA NO ha elegido ninguna opción.";
  }
  return payload.grupos
    .map((g) => `- ${g.titulo}: ${g.opciones.map((o) => o.nombre).join(", ")}`)
    .join("\n");
}

/**
 * PROMPT INTERNO DEL COPILOTO.
 *
 * Objetivo: textos cortos, provocativos y descriptivos que nombren las
 * elecciones del cliente y las justifiquen sensorialmente. Los ejemplos van
 * como few-shot para fijar el tono sin que el modelo se ponga a listar.
 */
function construirSystemPrompt(payload: CopilotoPayload): string {
  const restaurante = TAQUERIA_EL_PRIMO.tema.nombre_restaurante;

  return `Eres Ñom AI, el mejor mesero de "${restaurante}". Estás parado junto al cliente mientras él arma su platillo en la pantalla.

TU ÚNICA TAREA
Escribir UN texto corto que describa el platillo según lo que el cliente acaba de elegir. Ese texto reemplaza la descripción del menú, así que debe informar Y provocar antojo.

REGLAS DURAS
1. Máximo 3 líneas. Máximo ${MAX_CARACTERES} caracteres. Sin saltos de línea.
2. Devuelve SOLO el texto. Sin comillas externas, sin prefijos, sin "Ñom AI:".
3. Si el cliente no ha elegido nada: describe el platillo de forma apetitosa y cierra con UNA pregunta que lo invite a elegir el primer grupo pendiente.
4. Si ya eligió: NOMBRA cada opción elegida entre comillas dobles y justifica sensorialmente por qué mejora su experiencia (sabor, textura, aroma, intensidad).
5. NUNCA menciones opciones que NO eligió. Nunca lo regañes por lo que quitó.
6. NUNCA inventes ingredientes que no estén en la descripción del platillo.
7. Máximo 1 emoji, y solo si suma. Cero listas, cero viñetas.
8. Tono: cálido, mexicano neutro, cómplice. Habla de "tú".
9. Si aún falta un grupo obligatorio, cierra empujando suavemente a completarlo.

EJEMPLOS DEL TONO EXACTO QUE QUIERO
[Nada elegido]
"Un clásico sabroso, marinado al punto. ¿Con qué salsa vas a armar tu experiencia hoy?"

[Eligió "Roja" + "Sin cebolla"]
"¡Excelente! Va "Roja" picante para darle power, y sin cebolla para que nada se interponga entre tú y el pastor ahumado."

[Eligió "Verde" + "Sencillo"]
"Directo al grano: nuestra "Verde" balanceada y tu pastor sin verduras, para el sabor más puro y rápido."

PLATILLO QUE ESTÁ ARMANDO
- Nombre: ${payload.platillo}
- Categoría: ${payload.categoria}
- Descripción del menú (única fuente de ingredientes): ${payload.descripcion}

LO QUE EL CLIENTE YA ELIGIÓ
${describirSelecciones(payload)}

GRUPOS OBLIGATORIOS QUE AÚN LE FALTAN
${
    payload.pendientes.length > 0
      ? payload.pendientes.map((p) => `- ${p.titulo}`).join("\n")
      : "- Ninguno: ya completó su platillo."
  }`;
}

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    // 503 = el frontend usa su generador local sin marcarlo como bug.
    return Response.json(
      { error: "Falta GOOGLE_GENERATIVE_AI_API_KEY: copiloto en modo local." },
      { status: 503 },
    );
  }

  try {
    const payload: CopilotoPayload = await req.json();

    if (!payload?.platillo) {
      return Response.json({ error: "Payload inválido." }, { status: 400 });
    }

    const { text } = await generateText({
      model: google("gemini-3.6-flash"),
      system: construirSystemPrompt(payload),
      prompt:
        "Escribe ahora el texto para el estado actual de las elecciones del cliente.",
      // Temperatura alta-media: queremos variedad persuasiva, no creatividad
      // desbocada que invente ingredientes.
      temperature: 0.85,
      maxTokens: 140,
    });

    // Saneado: el modelo a veces envuelve el texto en comillas o mete saltos.
    const texto = text
      .trim()
      .replace(/\s*\n+\s*/g, " ")
      .replace(/^["“']+|["”']+$/g, "")
      .slice(0, MAX_CARACTERES)
      .trim();

    if (!texto) {
      return Response.json({ error: "Respuesta vacía." }, { status: 502 });
    }

    return Response.json({ texto });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error desconocido";
    console.error("[Ñom AI · Copiloto] Error:", mensaje);
    return Response.json({ error: mensaje }, { status: 500 });
  }
}
