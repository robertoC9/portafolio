const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// Servir archivos estáticos
app.use(express.static(path.join(__dirname )));

// Ruta principal opcional
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Rutas de comentarios
app.post("/guardar-comentario", (req, res) => {
  const comentario = req.body.comentario;
  if (!comentario) return res.status(400).send("Comentario vacío");
  const rutaArchivo = path.join(__dirname, "comentarios.txt");
  fs.appendFile(rutaArchivo, comentario + "\n", (err) => {
    if (err) return res.status(500).send("Error al guardar comentario");
    res.send("Comentario guardado correctamente");
  });
});

app.get("/comentarios", (req, res) => {
  const rutaArchivo = path.join(__dirname, "comentarios.txt");
  fs.readFile(rutaArchivo, "utf8", (err, data) => {
    if (err) return res.json({ comentarios: [] });
    const comentarios = data.split("\n").filter(c => c.trim() !== "");
    res.json({ comentarios });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

