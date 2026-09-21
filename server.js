// ============================================================
// SERVIDOR DEL PORTAFOLIO DE ROBERTO CARBONE RÍOS
// ============================================================
// Servidor Node.js con Express que:
//  - Sirve los archivos estáticos (HTML, CSS, JS, imágenes)
//  - Recibe y guarda comentarios en un archivo de texto
//  - Entrega la lista de comentarios guardados
// ============================================================

// Importación de dependencias
const express = require("express"); // Framework web para Node.js
const cors = require("cors"); // Middleware que permite peticiones de otros orígenes (CORS)
const fs = require("fs"); // Módulo nativo para trabajar con archivos
const path = require("path"); // Módulo nativo para manejar rutas
const crypto = require("crypto"); // Comparación segura de tokens e identificadores

// Creación de la aplicación Express
const app = express();

// Puerto del servidor: usa la variable de entorno PORT (Render) o 3000 por defecto
const PORT = process.env.PORT || 3000;

// Ruta del archivo donde se guardan los comentarios (en la misma carpeta del servidor)
const rutaArchivoComentarios = path.join(__dirname, "comentarios.txt");

// Middlewares globales
app.disable("x-powered-by"); // No revela que el servidor usa Express
app.use(cors()); // Habilita CORS para permitir peticiones desde otros dominios
app.use(express.json({ limit: "20kb" })); // Permite recibir JSON con un límite de 20 KB

// ===== Asegurar archivo de comentarios =====
// Si el archivo de comentarios no existe, lo crea vacío
function asegurarArchivoComentarios() {
  if (!fs.existsSync(rutaArchivoComentarios)) {
    fs.writeFileSync(rutaArchivoComentarios, "", "utf8");
  }
}

// Se ejecuta una vez al iniciar el servidor
asegurarArchivoComentarios();

// ===== Ruta POST /guardar-comentario =====
// Recibe un comentario del frontend y lo agrega al archivo de texto
app.post("/guardar-comentario", (req, res) => {
  // Se obtiene el comentario del cuerpo de la petición y se limpia
  const comentario = String(req.body?.comentario || "").trim();

  // Validación: el comentario no puede estar vacío
  if (!comentario) {
    return res.status(400).json({ error: "Comentario vacio" });
  }

  // Validación: el comentario no puede superar los 1000 caracteres
  if (comentario.length > 1000) {
    return res.status(400).json({ error: "Comentario demasiado largo" });
  }

  // Agrega el comentario (con salto de línea) al final del archivo
  fs.appendFile(rutaArchivoComentarios, `${comentario}\n`, "utf8", (err) => {
    // Si ocurre un error al escribir, responde con error 500
    if (err) {
      console.error("Error al guardar comentario:", err);
      return res.status(500).json({ error: "Error al guardar comentario" });
    }

    // Respuesta exitosa al frontend
    res.json({ mensaje: "Comentario guardado correctamente" });
  });
});

// ===== Ruta GET /comentarios =====
// Lee el archivo y devuelve la lista de comentarios en formato JSON
app.get("/comentarios", (req, res) => {
  fs.readFile(rutaArchivoComentarios, "utf8", (err, data) => {
    // Si ocurre un error al leer, responde con error 500
    if (err) {
      console.error("Error al leer comentarios:", err);
      return res.status(500).json({ error: "Error al leer comentarios" });
    }

    // Se separan las líneas, se limpian y se descartan las vacías
    const comentarios = data
      .split(/\r?\n/) // Divide el texto por saltos de línea (Windows o Unix)
      .map((comentario) => comentario.trim()) // Elimina espacios extra
      .filter(Boolean); // Elimina líneas vacías

    // Respuesta con la lista de comentarios
    res.json({ comentarios });
  });
});

// ============================================================
// CHATBOT: ENDPOINT /send, AVISO SIN CONTENIDO Y BANDEJA PRIVADA
// ============================================================
// PRIVACIDAD DEL CONTENIDO
// WhatsApp solo cifra de extremo a extremo entre aplicaciones WhatsApp. En
// cuanto un servidor envía por API, el proveedor procesa el texto en claro.
// Para que nadie más lea los mensajes, aquí se separan las dos cosas:
//
//   1. El AVISO que viaja a WhatsApp es un texto fijo, sin nombre, sin el
//      mensaje y sin enlaces con credenciales. El proveedor solo se entera de
//      que llegó "un mensaje nuevo", nada más.
//   2. El CONTENIDO se guarda únicamente en este servidor y se lee en la
//      bandeja privada /bandeja, protegida por un token secreto.
//
// El número de destino también vive solo aquí, en WHATSAPP_TO: nunca se envía
// al navegador ni se escribe en el repositorio.
//
// Variables de entorno (se configuran en el panel de Render, no en el código):
//   WHATSAPP_TO        Número de destino en formato internacional, con el
//                      prefijo del país
//   WHATSAPP_PROVIDER  "callmebot" | "twilio" | vacío (solo guarda, sin aviso)
//   CALLMEBOT_APIKEY   Clave de CallMeBot (si el proveedor es callmebot)
//   TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM  (si es twilio)
//   BANDEJA_TOKEN      Clave secreta para abrir /bandeja (invéntala larga)
// ============================================================

// Configuración leída del entorno
const WHATSAPP_TO = String(process.env.WHATSAPP_TO || "").trim();
const WHATSAPP_PROVIDER = String(process.env.WHATSAPP_PROVIDER || "").trim().toLowerCase();
const BANDEJA_TOKEN = String(process.env.BANDEJA_TOKEN || "").trim();

// Aviso que llega a WhatsApp. Es deliberadamente genérico: no lleva el nombre,
// ni el mensaje, ni un enlace con el token, porque cualquier dato que se ponga
// aquí sí lo vería el proveedor de envío.
const TEXTO_DEL_AVISO =
  "Portafolio: tienes un mensaje nuevo. Revisa tu bandeja privada.";

// Archivo donde se guarda el contenido de los mensajes (formato JSON por
// líneas: una línea por mensaje, fácil de agregar sin releer todo el archivo)
const rutaArchivoBandeja = path.join(__dirname, "mensajes-chatbot.jsonl");

// Límites de validación (deben coincidir con los del frontend)
const LARGO_MAXIMO_NOMBRE = 60;
const LARGO_MAXIMO_MENSAJE = 600;

// Tiempo mínimo, en milisegundos, entre abrir el chat y enviar el primer
// mensaje. Una persona tarda segundos en leer y escribir; un bot, casi nada.
const MS_MINIMO_HUMANO = 1500;

// Límite de envíos por IP: 5 mensajes cada 10 minutos
const LIMITE_ENVIOS = 5;
const VENTANA_LIMITE_MS = 10 * 60 * 1000;
const enviosPorIp = new Map(); // IP -> array de marcas de tiempo

// Render y otros hosting sirven detrás de un proxy: sin esto req.ip devolvería
// siempre la IP interna del proxy y el límite por IP no serviría de nada
app.set("trust proxy", 1);

// ===== Control de frecuencia por IP =====
// Devuelve true si la IP ya superó el límite de envíos de la ventana actual
function superaLimiteDeEnvios(ip) {
  const ahora = Date.now();
  // Se conservan solo los envíos que siguen dentro de la ventana de tiempo
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

// ===== Estado de la configuración =====
// Indica si hay proveedor y credenciales suficientes para entregar en WhatsApp.
// No devuelve el número ni las claves: solo si están presentes o no.
function revisarConfiguracion() {
  const faltantes = [];

  if (!WHATSAPP_TO) faltantes.push("WHATSAPP_TO");
  if (!BANDEJA_TOKEN) faltantes.push("BANDEJA_TOKEN");

  if (WHATSAPP_PROVIDER === "callmebot") {
    if (!process.env.CALLMEBOT_APIKEY) faltantes.push("CALLMEBOT_APIKEY");
  } else if (WHATSAPP_PROVIDER === "twilio") {
    if (!process.env.TWILIO_ACCOUNT_SID) faltantes.push("TWILIO_ACCOUNT_SID");
    if (!process.env.TWILIO_AUTH_TOKEN) faltantes.push("TWILIO_AUTH_TOKEN");
    if (!process.env.TWILIO_FROM) faltantes.push("TWILIO_FROM");
  } else {
    faltantes.push("WHATSAPP_PROVIDER");
  }

  return {
    proveedor: WHATSAPP_PROVIDER || "(sin configurar)",
    listo: faltantes.length === 0,
    faltantes,
  };
}

// ===== Guardar el mensaje en la bandeja privada =====
// El contenido se queda SOLO aquí. Se guarda antes de mandar el aviso, para
// que ningún mensaje se pierda aunque el proveedor de avisos falle.
async function guardarEnBandeja(nombre, mensaje) {
  const registro = {
    id: crypto.randomUUID(),
    fecha: new Date().toISOString(),
    nombre,
    mensaje,
    leido: false,
  };

  // JSON en una sola línea: se agrega al final sin releer el archivo completo
  await fs.promises.appendFile(
    rutaArchivoBandeja,
    `${JSON.stringify(registro)}\n`,
    "utf8"
  );

  return registro;
}

// ===== Leer la bandeja privada =====
// Devuelve los mensajes del más reciente al más antiguo. Las líneas corruptas
// se ignoran para que un archivo dañado no tumbe la bandeja entera.
async function leerBandeja() {
  let contenido = "";

  try {
    contenido = await fs.promises.readFile(rutaArchivoBandeja, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return []; // Todavía no hay mensajes
    throw err;
  }

  return contenido
    .split(/\r?\n/)
    .filter(Boolean)
    .map((linea) => {
      try {
        return JSON.parse(linea);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .reverse();
}

// ===== Envío por CallMeBot =====
// Ojo: CallMeBot responde HTTP 200 incluso cuando falla (clave inválida, API
// sin activar, número no autorizado) y explica el problema en el cuerpo de la
// respuesta. Por eso no basta con mirar el código de estado: hay que leer el
// texto, o los errores pasarían por envíos correctos y se perderían mensajes.
async function enviarPorCallmebot(texto) {
  const url =
    "https://api.callmebot.com/whatsapp.php" +
    `?phone=${encodeURIComponent(WHATSAPP_TO)}` +
    `&text=${encodeURIComponent(texto)}` +
    `&apikey=${encodeURIComponent(process.env.CALLMEBOT_APIKEY || "")}`;

  const respuesta = await fetch(url);
  const cuerpo = (await respuesta.text()).trim();

  if (!respuesta.ok) {
    throw new Error(`CallMeBot respondio ${respuesta.status}: ${cuerpo.slice(0, 200)}`);
  }

  // Señales de fallo que CallMeBot devuelve con estado 200
  const cuerpoMinuscula = cuerpo.toLowerCase();
  const señalesDeError = [
    "error",
    "apikey",
    "api key",
    "not authorized",
    "no autorizado",
    "invalid",
    "you need to",
    "activate",
  ];

  // "queued" o "sent" confirman que el mensaje entró en la cola de envío
  const pareceExito =
    cuerpoMinuscula.includes("queued") || cuerpoMinuscula.includes("sent");

  if (!pareceExito && señalesDeError.some((s) => cuerpoMinuscula.includes(s))) {
    throw new Error(`CallMeBot rechazo el envio: ${cuerpo.slice(0, 200)}`);
  }
}

// ===== Envío por Twilio =====
async function enviarPorTwilio(texto) {
  const sid = process.env.TWILIO_ACCOUNT_SID || "";
  const token = process.env.TWILIO_AUTH_TOKEN || "";
  // Número virtual de Twilio, con el formato whatsapp:<numero>
  const desde = process.env.TWILIO_FROM || "";

  const respuesta = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        // Twilio se autentica con HTTP Basic: sid como usuario, token como clave
        Authorization:
          "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: desde,
        To: `whatsapp:${WHATSAPP_TO}`,
        Body: texto,
      }),
    }
  );

  const cuerpo = await respuesta.text();

  if (!respuesta.ok) {
    throw new Error(`Twilio respondio ${respuesta.status}: ${cuerpo.slice(0, 200)}`);
  }
}

// ===== Aviso a WhatsApp, sin contenido =====
// Manda SIEMPRE el mismo texto fijo: el proveedor no recibe el nombre ni el
// mensaje, así que no hay nada que pueda leer. Devuelve "whatsapp" si el aviso
// salió, o "bandeja" si el mensaje solo quedó guardado.
async function enviarAviso() {
  const configuracion = revisarConfiguracion();

  // Sin credenciales completas no se intenta el aviso: el mensaje ya quedó
  // guardado en la bandeja por quien llama a esta función.
  if (!configuracion.listo) {
    console.warn(
      `Avisos de WhatsApp sin configurar (faltan: ${configuracion.faltantes.join(", ")}). ` +
        "El mensaje quedo guardado en la bandeja privada"
    );
    return "bandeja";
  }

  if (WHATSAPP_PROVIDER === "callmebot") {
    await enviarPorCallmebot(TEXTO_DEL_AVISO);
  } else if (WHATSAPP_PROVIDER === "twilio") {
    await enviarPorTwilio(TEXTO_DEL_AVISO);
  }

  return "whatsapp";
}

// ===== Ruta GET /send/estado =====
// Diagnóstico del chatbot: dice si el envío a WhatsApp está listo y qué
// variables de entorno faltan. Nunca revela el número ni las claves.
app.get("/send/estado", (req, res) => {
  res.json(revisarConfiguracion());
});

// ===== Respuesta para los envíos descartados =====
// A los bots detectados se les contesta un éxito normal, para no darles pistas
// de que fueron filtrados. La respuesta imita exactamente la de un envío real
// en la configuración actual: si tuviera otra forma, un bot podría comparar
// ambas respuestas y darse cuenta de que se le está descartando.
function respuestaSimulada() {
  const listo = revisarConfiguracion().listo;
  return {
    mensaje: "Mensaje recibido",
    entregado: listo,
    via: listo ? "whatsapp" : "bandeja",
  };
}

// ===== Ruta POST /send =====
// Recibe el mensaje del chatbot, filtra bots y lo reenvía a WhatsApp
app.post("/send", async (req, res) => {
  // Se limpian y recortan los datos recibidos
  const nombre = String(req.body?.nombre || "").trim().slice(0, LARGO_MAXIMO_NOMBRE);
  const mensaje = String(req.body?.mensaje || "").trim().slice(0, LARGO_MAXIMO_MENSAJE);
  const honeypot = String(req.body?.website || "").trim();
  const msDesdeCarga = Number(req.body?.msDesdeCarga) || 0;

  // ----- Filtro 1: honeypot -----
  // El campo "website" está oculto fuera de la pantalla: si llega con
  // contenido, quien envió el formulario es un bot. Se responde un éxito
  // normal a propósito, para no darle pistas de que fue detectado.
  if (honeypot) {
    console.warn("Envio descartado: honeypot relleno");
    return res.json(respuestaSimulada());
  }

  // ----- Filtro 2: velocidad de envío -----
  // Enviar en menos de MS_MINIMO_HUMANO es propio de un script automatizado.
  // Es un filtro complementario: el dato lo aporta el navegador y podría
  // falsearse, por eso no sustituye al honeypot ni al límite por IP.
  if (msDesdeCarga > 0 && msDesdeCarga < MS_MINIMO_HUMANO) {
    console.warn(`Envio descartado: demasiado rapido (${msDesdeCarga} ms)`);
    return res.json(respuestaSimulada());
  }

  // ----- Validaciones normales -----
  if (!nombre || nombre.length < 2) {
    return res.status(400).json({ error: "Nombre invalido" });
  }

  if (!mensaje) {
    return res.status(400).json({ error: "Mensaje vacio" });
  }

  // ----- Filtro 3: demasiados envíos desde la misma IP -----
  if (superaLimiteDeEnvios(req.ip)) {
    return res
      .status(429)
      .json({ error: "Demasiados mensajes seguidos, intenta mas tarde" });
  }

  // El contenido se guarda en la bandeja privada de este servidor. Si esto
  // falla, no hay nada que avisar: se corta aquí para no anunciar un mensaje
  // que en realidad no quedó registrado en ninguna parte.
  try {
    await guardarEnBandeja(nombre, mensaje);
  } catch (err) {
    console.error("Error al guardar el mensaje en la bandeja:", err);
    return res.status(500).json({ error: "No se pudo registrar el mensaje" });
  }

  try {
    const via = await enviarAviso();
    // "via" distingue si el aviso salió a WhatsApp o si el mensaje solo quedó
    // en la bandeja, para que el chatbot no prometa algo que no ocurrió.
    res.json({ mensaje: "Mensaje recibido", entregado: via === "whatsapp", via });
  } catch (err) {
    console.error("Error al enviar el aviso a WhatsApp:", err);
    // El mensaje ya está guardado, así que no es un fallo total
    res.json({ mensaje: "Mensaje recibido", entregado: false, via: "bandeja" });
  }
});

// ============================================================
// BANDEJA PRIVADA: AQUÍ SE LEEN LOS MENSAJES
// ============================================================

// ===== Verificación del token =====
// Se comparan los bytes en tiempo constante con timingSafeEqual: una
// comparación normal con === corta en el primer byte distinto, y ese pequeño
// cambio de tiempo permitiría adivinar el token carácter por carácter.
function tokenValido(tokenRecibido) {
  if (!BANDEJA_TOKEN) return false; // Sin token configurado, no se abre nada

  const esperado = Buffer.from(BANDEJA_TOKEN, "utf8");
  const recibido = Buffer.from(String(tokenRecibido || ""), "utf8");

  // timingSafeEqual exige la misma longitud, así que se compara aparte. La
  // longitud del token no es un secreto útil por sí sola.
  if (esperado.length !== recibido.length) return false;

  return crypto.timingSafeEqual(esperado, recibido);
}

// ===== Middleware de acceso a la bandeja =====
function exigirToken(req, res, next) {
  // Cabeceras para que la bandeja no se guarde en cachés ni la indexen
  res.set("Cache-Control", "no-store, max-age=0");
  res.set("X-Robots-Tag", "noindex, nofollow");

  // El token se acepta por cabecera o por parámetro de la URL. La cabecera es
  // más discreta; el parámetro permite guardar la bandeja como favorito.
  const token = req.get("X-Bandeja-Token") || req.query.token;

  if (!tokenValido(token)) {
    console.warn(`Acceso rechazado a la bandeja desde ${req.ip}`);
    // 404 en lugar de 401: así la bandeja no se delata como algo que existe
    return res.status(404).send("No encontrado");
  }

  next();
}

// ===== Escapado de HTML =====
// El contenido lo escribe cualquier visitante del sitio, así que hay que
// neutralizarlo antes de insertarlo en la página de la bandeja.
function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ===== Ruta GET /bandeja =====
// Página privada con los mensajes. Se genera aquí en lugar de servir un
// archivo estático, porque cualquier archivo de la carpeta es público.
app.get("/bandeja", exigirToken, async (req, res) => {
  let mensajes = [];

  try {
    mensajes = await leerBandeja();
  } catch (err) {
    console.error("Error al leer la bandeja:", err);
    return res.status(500).send("Error al leer la bandeja");
  }

  const sinLeer = mensajes.filter((m) => !m.leido).length;

  // Tarjeta por mensaje, con el contenido ya escapado
  const tarjetas = mensajes
    .map((m) => {
      const fecha = new Date(m.fecha).toLocaleString("es-CL");
      const claseNuevo = m.leido ? "" : " nuevo";
      const etiqueta = m.leido ? "" : '<span class="etiqueta">nuevo</span>';

      return `
      <article class="mensaje${claseNuevo}">
        <header>
          <strong>${escaparHtml(m.nombre)}</strong>${etiqueta}
          <time>${escaparHtml(fecha)}</time>
        </header>
        <p>${escaparHtml(m.mensaje)}</p>
      </article>`;
    })
    .join("");

  const vacia = '<p class="vacia">Todavía no hay mensajes.</p>';

  res.type("html").send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Bandeja privada</title>
  <style>
    body { margin: 0; padding: 24px; background: #14171a; color: #fff;
           font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .caja { max-width: 720px; margin: 0 auto; }
    h1 { font-size: 1.5rem; color: #9c9163; margin: 0 0 4px; }
    .resumen { color: rgba(255,255,255,0.6); font-size: 0.9rem; margin: 0 0 20px; }
    .mensaje { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15);
               border-radius: 14px; padding: 14px 16px; margin-bottom: 12px; }
    .mensaje.nuevo { border-color: rgba(156,145,99,0.8); }
    .mensaje header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .mensaje time { margin-left: auto; font-size: 0.8rem; color: rgba(255,255,255,0.5); }
    .mensaje p { margin: 0; white-space: pre-wrap; word-break: break-word; line-height: 1.5; }
    .etiqueta { background: #9c9163; color: #fff; font-size: 0.7rem; padding: 2px 8px;
                border-radius: 10px; text-transform: uppercase; }
    .vacia { color: rgba(255,255,255,0.5); }
    button { background: #9c9163; color: #fff; border: none; border-radius: 20px;
             padding: 9px 18px; font: inherit; cursor: pointer; }
    button:hover { background: #857a4f; }
    .aviso { margin-top: 24px; font-size: 0.8rem; color: rgba(255,255,255,0.45);
             line-height: 1.5; }
  </style>
</head>
<body>
  <div class="caja">
    <h1>Bandeja privada</h1>
    <p class="resumen">${mensajes.length} mensaje(s), ${sinLeer} sin leer</p>
    ${sinLeer > 0 ? '<p><button id="marcar">Marcar todos como leidos</button></p>' : ""}
    ${mensajes.length ? tarjetas : vacia}
    <p class="aviso">
      El contenido de estos mensajes nunca sale de este servidor: a WhatsApp
      solo viaja un aviso fijo, sin nombre ni texto.
    </p>
  </div>
  <script>
    // El token viaja en la URL de esta página; se reutiliza para marcar leidos
    const boton = document.getElementById("marcar");
    if (boton) {
      boton.addEventListener("click", async () => {
        boton.disabled = true;
        const token = new URLSearchParams(location.search).get("token") || "";
        await fetch("/bandeja/leidos?token=" + encodeURIComponent(token), { method: "POST" });
        location.reload();
      });
    }
  </script>
</body>
</html>`);
});

// ===== Ruta POST /bandeja/leidos =====
// Marca todos los mensajes como leídos reescribiendo el archivo
app.post("/bandeja/leidos", exigirToken, async (req, res) => {
  try {
    const mensajes = await leerBandeja();
    // leerBandeja devuelve del más nuevo al más viejo: se invierte para
    // guardar el archivo en su orden original
    const lineas = mensajes
      .slice()
      .reverse()
      .map((m) => JSON.stringify({ ...m, leido: true }))
      .join("\n");

    await fs.promises.writeFile(
      rutaArchivoBandeja,
      lineas ? `${lineas}\n` : "",
      "utf8"
    );

    res.json({ mensaje: "Mensajes marcados como leidos" });
  } catch (err) {
    console.error("Error al marcar los mensajes como leidos:", err);
    res.status(500).json({ error: "No se pudo actualizar la bandeja" });
  }
});

// ===== Protección de los archivos con datos =====
// express.static sirve TODA la carpeta del proyecto, así que sin este filtro
// cualquiera podría descargar el archivo de mensajes escribiendo su nombre en
// la barra de direcciones, y la bandeja privada no serviría de nada. Este
// middleware va antes de express.static para cortar esas peticiones.
const ARCHIVOS_PRIVADOS = [
  "mensajes-chatbot.jsonl", // Contenido de los mensajes del chatbot
  "mensajes-whatsapp.txt", // Respaldo de versiones anteriores
  ".env", // Credenciales y número de WhatsApp
  ".env.local",
  "server.js", // Código del servidor: no es un archivo del sitio
  "package.json", // Dependencias y metadatos del proyecto
  "package-lock.json",
  "render.yaml", // Configuración de despliegue
];

app.use((req, res, next) => {
  // Se compara solo el nombre del archivo, sin la ruta, para que no sirva
  // pedirlo con rodeos como /./mensajes-chatbot.jsonl
  const archivo = path.basename(decodeURIComponent(req.path)).toLowerCase();

  if (ARCHIVOS_PRIVADOS.some((privado) => privado.toLowerCase() === archivo)) {
    console.warn(`Intento de descarga de archivo privado desde ${req.ip}: ${req.path}`);
    return res.status(404).send("No encontrado");
  }

  next();
});

// ===== node_modules fuera del alcance público =====
// express.static(__dirname) sirve TODA la carpeta del proyecto, incluidas las
// dependencias instaladas. Sin este filtro, cualquiera podría descargar
// /node_modules/express/... y recorrer el árbol completo. Las únicas librerías
// que sí se publican son las del navegador, y se sirven aparte bajo /vendor.
app.use((req, res, next) => {
  const ruta = req.path.toLowerCase();

  if (ruta === "/node_modules" || ruta.startsWith("/node_modules/")) {
    return res.status(404).send("No encontrado");
  }

  next();
});

// ===== Librerías del navegador (vendor) =====
// GSAP y Three.js se sirven desde node_modules en vez de un CDN: la página no
// depende de un tercero, funciona sin conexión y la versión queda fijada por
// package-lock.json. Solo se expone la carpeta compilada de cada librería,
// nunca el paquete completo (ni su código fuente ni sus pruebas).
app.use(
  "/vendor/gsap",
  express.static(path.join(__dirname, "node_modules", "gsap", "dist"), {
    index: false,
    immutable: true,
    maxAge: "30d",
  })
);

app.use(
  "/vendor/three",
  express.static(path.join(__dirname, "node_modules", "three", "build"), {
    index: false,
    immutable: true,
    maxAge: "30d",
  })
);

// ===== Archivos estáticos =====
// Sirve todos los archivos de la carpeta del proyecto (index.html, css, js, imágenes)
app.use(express.static(__dirname));

// ===== Ruta raíz "/" =====
// Envía el index.html como página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ===== Manejo de errores =====
// Express responde por defecto con el stack trace completo, que incluye rutas
// absolutas del disco del servidor. En producción eso es información filtrada,
// así que aquí se responde siempre con un JSON breve. Va después de todas las
// rutas, que es donde Express busca los manejadores de error.
app.use((err, req, res, next) => {
  // JSON mal formado o demasiado grande: es culpa de quien envía, no del servidor
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "JSON invalido" });
  }

  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Peticion demasiado grande" });
  }

  console.error("Error no controlado:", err);

  // Si ya se empezó a responder, solo Express puede cerrar la petición
  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({ error: "Error interno del servidor" });
});

// ===== Inicio del servidor =====
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  console.log(`Comentarios guardados en: ${rutaArchivoComentarios}`);

  // Estado del chatbot de WhatsApp, visible en los logs del hosting.
  // Nunca se imprime el número ni las claves, solo qué variables faltan.
  const configuracion = revisarConfiguracion();
  if (configuracion.listo) {
    console.log(`Chatbot listo: avisos por ${configuracion.proveedor}, contenido en /bandeja`);
  } else {
    console.warn(
      "Chatbot SIN AVISOS: faltan las variables de entorno " +
        `${configuracion.faltantes.join(", ")}. ` +
        "Los mensajes se siguen guardando en la bandeja privada"
    );
  }
  console.log(`Bandeja privada del chatbot: ${rutaArchivoBandeja}`);
});
