const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const rutaArchivoComentarios = path.join(__dirname, "comentarios.txt");

app.use(cors());
app.use(express.json({ limit: "20kb" }));

function asegurarArchivoComentarios() {
  if (!fs.existsSync(rutaArchivoComentarios)) {
    fs.writeFileSync(rutaArchivoComentarios, "", "utf8");
  }
}

asegurarArchivoComentarios();

app.post("/guardar-comentario", (req, res) => {
  const comentario = String(req.body?.comentario || "").trim();

  if (!comentario) {
    return res.status(400).json({ error: "Comentario vacio" });
  }

  if (comentario.length > 1000) {
    return res.status(400).json({ error: "Comentario demasiado largo" });
  }

  fs.appendFile(rutaArchivoComentarios, `${comentario}\n`, "utf8", (err) => {
    if (err) {
      console.error("Error al guardar comentario:", err);
      return res.status(500).json({ error: "Error al guardar comentario" });
    }

    res.json({ mensaje: "Comentario guardado correctamente" });
  });
});

app.get("/comentarios", (req, res) => {
  fs.readFile(rutaArchivoComentarios, "utf8", (err, data) => {
    if (err) {
      console.error("Error al leer comentarios:", err);
      return res.status(500).json({ error: "Error al leer comentarios" });
    }

    const comentarios = data
      .split(/\r?\n/)
      .map((comentario) => comentario.trim())
      .filter(Boolean);

    res.json({ comentarios });
  });
});

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  console.log(`Comentarios guardados en: ${rutaArchivoComentarios}`);
});
