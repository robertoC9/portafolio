// ============================================================
// CHATBOT: ENDPOINT /send COMO FUNCIÓN SERVERLESS DE NETLIFY
// ============================================================
// El sitio está desplegado en Netlify (estático), así que el Express de
// server.js no corre allá. Esta función atiende el POST /send (la ruta se
// reescribe con netlify.toml) y entrega el mensaje en el chat de Telegram
// del dueño del sitio.
//
// PRIVACIDAD DEL NÚMERO TELEFÓNICO
// Ni el token del bot ni el chat de destino aparecen en el repositorio ni
// llegan al navegador: viven en las variables de entorno de Netlify y solo
// esta función los lee. El chat_id de un chat privado de Telegram es un
// interno de la plataforma, no un número de teléfono.
//
// Variables de entorno (se configuran en Netlify: Site configuration →
// Environment variables, nunca en el código):
//   TELEGRAM_BOT_TOKEN  Token que entrega @BotFather al crear el bot
//   TELEGRAM_CHAT_ID    Identificador del chat donde llegan los mensajes
//
// Mismas validaciones y mismo contrato de respuesta que server.js, para que
// el frontend (script.js) no distinga dónde corre el backend:
//   - Honeypot relleno  → éxito falso (no se delata al bot)
//   - Envío < 1500 ms   → éxito falso (los bots no tardan en escribir)
//   - Nombre < 2 letras → 400 { error }
//   - Mensaje vacío     → 400 { error }
//   - > 5 envíos / 10 min por IP → 429 { error }
//   - Éxito             → 200 { mensaje, entregado: true, via: "telegram" }
// ============================================================

// Límites de validación (deben coincidir con los del frontend)
const LARGO_MAXIMO_NOMBRE = 60;
const LARGO_MAXIMO_MENSAJE = 600;

// Tiempo mínimo, en milisegundos, entre abrir el chat y enviar el primer
// mensaje. Una persona tarda segundos en leer y escribir; un bot, casi nada.
const MS_MINIMO_HUMANO = 1500;

// Límite de envíos por IP: 5 mensajes cada 10 minutos.
// NOTA: en funciones serverless la memoria no persiste entre instancias, así
// que este límite es "best effort" (sirve mientras la instancia siga viva).
// Las defensas principales siguen siendo el honeypot y el filtro de tiempo.
const LIMITE_ENVIOS = 5;
const VENTANA_LIMITE_MS = 10 * 60 * 1000;
const enviosPorIp = new Map(); // IP -> array de marcas de tiempo

const ERROR_NO_CONFIGURADO =
  "Servidor del chatbot sin configurar: faltan variables de entorno de Telegram";

// ===== Respuesta JSON estándar =====
function json(statusCode, cuerpo) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(cuerpo),
  };
}

// ===== IP del cliente =====
// Netlify pone la IP real en x-nf-client-connection-ip; se miran también las
// cabeceras habituales por si la función se prueba fuera de Netlify.
function ipDe(event) {
  const cabeceras = event.headers || {};
  const encadenada = String(cabeceras["x-forwarded-for"] || "").split(",")[0].trim();
  return (
    String(cabeceras["x-nf-client-connection-ip"] || "").trim() ||
    String(cabeceras["client-ip"] || "").trim() ||
    encadenada ||
    String(event.ip || "").trim() ||
    "desconocida"
  );
}

// ===== Control de frecuencia por IP =====
// Devuelve true si la IP ya superó el límite de envíos de la ventana actual
function superaLimiteDeEnvios(ip) {
  const ahora = Date.now();
  const recientes = (enviosPorIp.get(ip) || []).filter(
    (marca) => ahora - marca < VENTANA_LIMITE_MS
  );

  if (recientes.length >= LIMITE_ENVIOS) {
    enviosPorIp.set(ip, recientes);
    return true;
  }

  recientes.push(ahora);
  enviosPorIp.set(ip, recientes);
  return false;
}

// ===== Configuración de Telegram =====
// Solo informa si las variables están presentes: nunca devuelve sus valores.
function revisarConfiguracion() {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = String(process.env.TELEGRAM_CHAT_ID || "").trim();
  const faltantes = [];
  if (!token) faltantes.push("TELEGRAM_BOT_TOKEN");
  if (!chatId) faltantes.push("TELEGRAM_CHAT_ID");
  return { token, chatId, listo: faltantes.length === 0, faltantes };
}

// ===== Respuesta para los envíos descartados =====
// A los bots detectados se les contesta exactamente lo que vería un envío
// real en la configuración actual, para no darles pistas de que se filtraron.
function respuestaSimulada(configuracion) {
  if (!configuracion.listo) {
    return json(500, { error: ERROR_NO_CONFIGURADO });
  }
  return json(200, {
    mensaje: "Mensaje recibido",
    entregado: true,
    via: "telegram",
  });
}

// ===== Entrega en Telegram =====
// Sin parse_mode: el texto viaja tal cual, así que nada de lo que escriba la
// visita puede interpretarse como formato o comandos dentro del mensaje.
async function enviarATelegram(token, chatId, texto) {
  const respuesta = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: texto }),
    }
  );

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok || !datos || datos.ok !== true) {
    throw new Error(
      `Telegram respondio ${respuesta.status}: ${JSON.stringify(datos).slice(0, 200)}`
    );
  }
}

// ===== Punto de entrada de Netlify Functions =====
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Metodo no permitido" });
  }

  let cuerpo = {};
  try {
    cuerpo = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Cuerpo invalido" });
  }

  const nombre = String(cuerpo.nombre || "")
    .trim()
    .slice(0, LARGO_MAXIMO_NOMBRE);
  const mensaje = String(cuerpo.mensaje || "")
    .trim()
    .slice(0, LARGO_MAXIMO_MENSAJE);
  const honeypot = String(cuerpo.website || "").trim();
  const msDesdeCarga = Number(cuerpo.msDesdeCarga) || 0;

  const configuracion = revisarConfiguracion();

  // ----- Filtro 1: honeypot -----
  // El campo "website" está oculto fuera de la pantalla: si llega con
  // contenido, quien envía es un bot. Se responde un éxito normal a propósito.
  if (honeypot) {
    console.warn("Envio descartado: honeypot relleno");
    return respuestaSimulada(configuracion);
  }

  // ----- Filtro 2: velocidad de envío -----
  // Enviar en menos de MS_MINIMO_HUMANO es propio de un script automatizado.
  // El dato lo aporta el navegador y podría falsearse, por eso es solo un
  // filtro complementario del honeypot.
  if (msDesdeCarga > 0 && msDesdeCarga < MS_MINIMO_HUMANO) {
    console.warn(`Envio descartado: demasiado rapido (${msDesdeCarga} ms)`);
    return respuestaSimulada(configuracion);
  }

  // ----- Validaciones normales -----
  if (!nombre || nombre.length < 2) {
    return json(400, { error: "Nombre invalido" });
  }

  if (!mensaje) {
    return json(400, { error: "Mensaje vacio" });
  }

  // ----- Filtro 3: demasiados envíos desde la misma IP -----
  if (superaLimiteDeEnvios(ipDe(event))) {
    return json(429, {
      error: "Demasiados mensajes seguidos, intenta mas tarde",
    });
  }

  // Sin variables de entorno no hay a dónde entregar: se contesta con error
  // para que el chat avise del fallo en lugar de prometer algo que no ocurrió.
  if (!configuracion.listo) {
    console.error(
      `Chatbot sin configurar (faltan: ${configuracion.faltantes.join(", ")})`
    );
    return json(500, { error: ERROR_NO_CONFIGURADO });
  }

  const texto =
    `Portafolio: mensaje nuevo\n` +
    `Fecha: ${new Date().toISOString()}\n` +
    `De: ${nombre}\n\n` +
    `${mensaje}`;

  try {
    await enviarATelegram(configuracion.token, configuracion.chatId, texto);
    return json(200, {
      mensaje: "Mensaje recibido",
      entregado: true,
      via: "telegram",
    });
  } catch (err) {
    console.error("Error al entregar el mensaje en Telegram:", err);
    return json(502, { error: "No se pudo entregar el mensaje" });
  }
};
