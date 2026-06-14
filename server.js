const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta principal
app.use(express.static(__dirname));

// Ruta raíz: mostrar tu index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Asegurar carpeta de comentarios
const carpetaComentarios = path.join(__dirname, "comentarios");
try {
  if (!fs.existsSync(carpetaComentarios)) {
    fs.mkdirSync(carpetaComentarios, { recursive: true });
    console.log("✅ Carpeta de comentarios creada");
  }
} catch (err) {
  console.error("❌ Error al crear carpeta de comentarios:", err);
}

const rutaArchivoComentarios = path.join(carpetaComentarios, "comentarios.txt");

// Rutas de comentarios
app.post("/guardar-comentario", (req, res) => {
  const comentario = req.body.comentario;
  console.log("📝 Intentando guardar comentario:", comentario);
  
  if (!comentario) {
    return res.status(400).json({ error: "Comentario vacío" });
  }

  fs.appendFile(rutaArchivoComentarios, comentario + "\n", (err) => {
    if (err) {
      console.error("❌ Error al guardar:", err);
      return res.status(500).json({ error: "Error al guardar comentario" });
    }
    console.log("✅ Comentario guardado exitosamente");
    res.json({ mensaje: "Comentario guardado correctamente" });
  });
});

app.get("/comentarios", (req, res) => {
  fs.readFile(rutaArchivoComentarios, "utf8", (err, data) => {
    if (err) {
      console.log("📄 Archivo de comentarios no existe aún, retornando lista vacía");
      return res.json({ comentarios: [] });
    }
    const comentarios = data.split("\n").filter(c => c.trim() !== "");
    console.log("✅ Comentarios cargados:", comentarios.length);
    res.json({ comentarios });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});

