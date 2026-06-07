// Importar librerías necesarias
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Ruta principal (puedes personalizarla con tu portafolio)
app.get("/", (req, res) => {
  res.send("Bienvenido al Portafolio de R. Carbone 🚀");
});

// Ruta POST para guardar comentarios
app.post("/guardar-comentario", (req, res) => {
  const comentario = req.body.comentario;
  if (!comentario) {
    return res.status(400).send("Comentario vacío");
  }
  const rutaArchivo = path.join(__dirname, "comentarios.txt");
  fs.appendFile(rutaArchivo, comentario + "\n", (err) => {
    if (err) return res.status(500).send("Error al guardar comentario");
    res.send("Comentario guardado correctamente");
  });
});

// Ruta GET para leer comentarios
app.get("/comentarios", (req, res) => {
  const rutaArchivo = path.join(__dirname, "comentarios.txt");
  fs.readFile(rutaArchivo, "utf8", (err, data) => {
    if (err) return res.status(500).send("Error al leer comentarios");
    const comentarios = data.split("\n").filter(c => c.trim() !== "");
    res.json({ comentarios });
  });
});

// Puerto dinámico para Render
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
