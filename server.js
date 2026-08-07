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

