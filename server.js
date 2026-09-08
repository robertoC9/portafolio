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

// Creación de la aplicación Express
const app = express();

// Puerto del servidor: usa la variable de entorno PORT (Render) o 3000 por defecto
const PORT = process.env.PORT || 3000;

// Ruta del archivo donde se guardan los comentarios (en la misma carpeta del servidor)
const rutaArchivoComentarios = path.join(__dirname, "comentarios.txt");

// Middlewares globales
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
// CHATBOT DE WHATSAPP: ENDPOINT GENÉRICO /send
// ============================================================
// El número de WhatsApp de destino se lee SOLO de la variable de entorno
// WHATSAPP_TO y nunca se envía al navegador ni se escribe en el repositorio,
// así que no queda expuesto en el código fuente público del sitio.
//
// Variables de entorno (se configuran en el panel de Render, no en el código):
//   WHATSAPP_TO        Número de destino en formato internacional, con el
//                      prefijo del país (se configura en el panel del hosting)
//   WHATSAPP_PROVIDER  "callmebot" | "twilio" | vacío (guarda en archivo)
//   CALLMEBOT_APIKEY   Clave de CallMeBot (si el proveedor es callmebot)
//   TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM  (si es twilio)
// ============================================================

// Configuración leída del entorno
const WHATSAPP_TO = String(process.env.WHATSAPP_TO || "").trim();
const WHATSAPP_PROVIDER = String(process.env.WHATSAPP_PROVIDER || "").trim().toLowerCase();

// Archivo de respaldo: si no hay proveedor configurado, los mensajes se guardan
// aquí para no perderlos (útil en desarrollo local)
const rutaArchivoMensajes = path.join(__dirname, "mensajes-whatsapp.txt");

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

// ===== Envío del mensaje al WhatsApp de destino =====
// Cada proveedor recibe el mismo texto ya armado. Si no hay proveedor
// configurado, el mensaje se guarda en un archivo local.
async function entregarEnWhatsapp(texto) {
  // --- CallMeBot: servicio gratuito para enviarse mensajes a uno mismo ---
  if (WHATSAPP_PROVIDER === "callmebot") {
    const url =
      "https://api.callmebot.com/whatsapp.php" +
      `?phone=${encodeURIComponent(WHATSAPP_TO)}` +
      `&text=${encodeURIComponent(texto)}` +
      `&apikey=${encodeURIComponent(process.env.CALLMEBOT_APIKEY || "")}`;

    const respuesta = await fetch(url);
    if (!respuesta.ok) {
      throw new Error(`CallMeBot respondio ${respuesta.status}`);
    }
    return;
  }

  // --- Twilio: número virtual de WhatsApp (uso profesional) ---
  if (WHATSAPP_PROVIDER === "twilio") {
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

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      throw new Error(`Twilio respondio ${respuesta.status}: ${detalle}`);
    }
    return;
  }

  // --- Sin proveedor: se guarda en un archivo para no perder el mensaje ---
  console.warn(
    "WHATSAPP_PROVIDER no configurado: el mensaje se guarda en mensajes-whatsapp.txt"
  );
  await fs.promises.appendFile(
    rutaArchivoMensajes,
    `${texto}\n${"-".repeat(50)}\n`,
    "utf8"
  );
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
    return res.json({ mensaje: "Mensaje enviado" });
  }

  // ----- Filtro 2: velocidad de envío -----
  // Enviar en menos de MS_MINIMO_HUMANO es propio de un script automatizado.
  // Es un filtro complementario: el dato lo aporta el navegador y podría
  // falsearse, por eso no sustituye al honeypot ni al límite por IP.
  if (msDesdeCarga > 0 && msDesdeCarga < MS_MINIMO_HUMANO) {
    console.warn(`Envio descartado: demasiado rapido (${msDesdeCarga} ms)`);
    return res.json({ mensaje: "Mensaje enviado" });
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

  // Sin número de destino configurado no se puede entregar nada
  if (!WHATSAPP_TO) {
    console.error("Falta la variable de entorno WHATSAPP_TO");
    return res.status(500).json({ error: "Servicio no disponible" });
  }

  // Texto que llega al WhatsApp de destino
  const texto =
    "Nuevo mensaje desde el portafolio\n" +
    `Nombre: ${nombre}\n` +
    `Mensaje: ${mensaje}\n` +
    `Fecha: ${new Date().toLocaleString("es-CL")}`;

  try {
    await entregarEnWhatsapp(texto);
    res.json({ mensaje: "Mensaje enviado" });
  } catch (err) {
    console.error("Error al enviar el mensaje a WhatsApp:", err);
    res.status(502).json({ error: "No se pudo enviar el mensaje" });
  }
});

// ===== Archivos estáticos =====
// Sirve todos los archivos de la carpeta del proyecto (index.html, css, js, imágenes)
app.use(express.static(__dirname));

// ===== Ruta raíz "/" =====
// Envía el index.html como página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ===== Inicio del servidor =====
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  console.log(`Comentarios guardados en: ${rutaArchivoComentarios}`);
});

