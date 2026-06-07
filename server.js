// Importar dependencias
const express = require("express");
const cors = require("cors");   // ← IMPORTANTE: aquí cargas cors
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());                // ← ahora sí puedes usarlo
app.use(express.json());


// Rutas de tu aplicación aquí...

// 🔑 Puerto dinámico
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});



// Activar CORS para permitir peticiones desde tu frontend
app.use(cors());

// Permitir recibir datos en formato JSON
app.use(express.json());

// Ruta POST para guardar comentarios
app.post("/guardar-comentario", (req, res) => {
  console.log("Petición recibida:", req.body); // 👀 ver qué llega

  const comentario = req.body.comentario;

  // Validar que no esté vacío
  if (!comentario) {
    return res.status(400).send("Comentario vacío");
  }

  // Archivo donde se guardarán los comentarios
  const rutaArchivo = path.join(__dirname, "comentarios.txt");

  // Guardar comentario en el archivo
  fs.appendFile(rutaArchivo, comentario + "\n", (err) => {
    if (err) {
      console.error("Error al guardar comentario:", err);
      return res.status(500).send("Error al guardar comentario");
    }
    res.send("Comentario guardado correctamente");
  });
});

// Ruta GET para listar comentarios
app.get("/comentarios", (req, res) => {
  const rutaArchivo = path.join(__dirname, "comentarios.txt");

  fs.readFile(rutaArchivo, "utf8", (err, data) => {
    if (err) {
      console.error("Error al leer comentarios:", err);
      return res.json({ comentarios: [] });
    }
    // Convertir archivo en array de comentarios
    const comentarios = data.split("\n").filter(c => c.trim() !== "");
    res.json({ comentarios });
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
