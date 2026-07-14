# Portafolio - Roberto Carbone Ríos

Portafolio personal que incluye proyectos con interfaz web (frontend en HTML/CSS/JS) y un backend en **Node.js + Express** para gestionar comentarios.

## Demo
- Tattoo & Art: https://tatto-art.onrender.com
- Gato Enjaulao: https://cmf-gato-enjaulao.onrender.com

## Stack
- Frontend: HTML, CSS, JavaScript, Bootstrap (CDN)
- Backend: Node.js + Express, CORS
- Persistencia: `comentarios.txt` (archivo de texto en el servidor)

## Estructura del proyecto
- `index.html`: Página principal del portafolio
- `script.js`: Lógica del frontend (envío/recepción de comentarios)
- `style.css`: Estilos
- `server.js`: Servidor Express y endpoints
- `comentarios.txt`: Almacenamiento de comentarios
- `render.yaml`: Configuración para despliegue en Render (si aplica)

## Instalación y ejecución local
1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Ejecutar el servidor:
   ```bash
   npm start
   ```
3. Abrir en el navegador:
   - `http://localhost:3000`

## Endpoints (API de comentarios)
### Guardar comentario
- **POST** `/guardar-comentario`
- Body JSON:
  - `comentario` (string)

Validaciones:
- No puede estar vacío
- Máximo: 1000 caracteres

Respuesta:
- `{ "mensaje": "Comentario guardado correctamente" }`

### Obtener comentarios
- **GET** `/comentarios`

Respuesta:
- `{ "comentarios": ["...", "..."] }`

## Deploy
Pensado para ejecutarse en Render con **Node**.

