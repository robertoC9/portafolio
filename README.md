# Portafolio de Roberto Carbone Ríos

Portafolio web personal de **Roberto Carbone Ríos**, desarrollador web con experiencia en proyectos digitales de frontend y backend. La página incluye una presentación, la sección de proyectos, datos de contacto y un sistema de comentarios que se guardan en el servidor.

---

## ✨ Características

- **Diseño responsive** con Bootstrap 5.3.
- **Hero** de bienvenida con imagen de fondo fija.
- **Sección "Sobre mí"** con retrato animado.
- **Sección de proyectos** con tarjetas estilo *neumorfismo* que muestran 4 trabajos (Tattoo & Art, Gato Enjaulao, Publicidad y Blog).
- **Reloj en vivo** en el footer (actualizado cada segundo).
- **Animaciones**:
  - Sombras ondulantes en los títulos.
  - Rotación y rebote del logo.
  - Rebote del retrato.
- **Sistema de comentarios**:
  - Envío de comentarios al backend.
  - Carga de comentarios guardados.
  - Aviso/diálogo flotante de notificaciones.
- **Iconos de contacto**: correo, LinkedIn y X.

---

## 🛠️ Tecnologías

| Tecnología | Descripción |
|-----------|-------------|
| **HTML5** | Estructura de la página |
| **CSS3** | Estilos, animaciones y neumorfismo |
| **JavaScript** | Interactividad del frontend |
| **Bootstrap 5.3** | Framework de estilos y componentes |
| **Node.js** | Entorno de ejecución del servidor |
| **Express** | Servidor web y API |
| **CORS** | Permite peticiones entre orígenes |
| **Render** | Plataforma de despliegue |

---

## 📁 Estructura del proyecto

```
portafolio ultimo 2/
├── index.html          # Página principal (frontend)
├── style.css           # Hoja de estilos
├── script.js           # Lógica del frontend (reloj, animaciones, comentarios)
├── server.js           # Servidor Express (backend)
├── package.json        # Dependencias y scripts
├── package-lock.json   # Bloqueo de versiones de dependencias
├── render.yaml         # Configuración de despliegue en Render
├── comentarios.txt     # Archivo donde se guardan los comentarios
├── TODO.md             # Lista de tareas del proyecto
└── imágenes/           # Recursos visuales
    ├── bandera-chile.png
    ├── blog.png
    ├── fondo.jpg
    ├── gato-enjaulao.jpg
    ├── logo.png
    ├── publicidad.jpg
    ├── retrato.JPG
    ├── tattoo1.jpg
    ├── th.png
    └── tt.png
```

---

## 🚀 Instalación y ejecución

### Requisitos previos

- **Node.js** versión 18 o superior.
- **npm** (incluido con Node.js).

### Pasos

1. **Clonar o descargar** el repositorio en tu máquina.

2. **Instalar las dependencias**:

   ```bash
   npm install
   ```

3. **Iniciar el servidor**:

   ```bash
   npm start
   ```

   Para desarrollo con recarga automática (si tienes `nodemon`):

   ```bash
   npm run dev
   ```

4. **Abrir el sitio** en el navegador:

   ```
   http://localhost:3000
   ```

---

## ⚙️ Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm start` | Inicia el servidor con Node.js |
| `npm run dev` | Inicia el servidor con `nodemon` (recarga automática) |

---

## 🔌 Endpoints del backend

| Método | Ruta                  | Descripción |
|--------|-----------------------|-------------|
| `POST` | `/guardar-comentario` | Recibe y guarda un comentario en `comentarios.txt` |
| `GET`  | `/comentarios`        | Devuelve la lista de comentarios guardados en JSON |
| `GET`  | `/`                   | Sirve la página principal `index.html` |

---

## 🌐 Despliegue

El proyecto está preparado para desplegarse en **Render** mediante el archivo `render.yaml`. El servidor usa la variable de entorno `PORT` que proporciona la plataforma, con puerto `3000` como valor por defecto.

---

## 📬 Contacto

- **Correo**: `robertoangelcarbone@gmail.com`
- **LinkedIn**: [Roberto Carbone](https://www.linkedin.com/in/roberto-angel)
- **X**: [@RobertoACarbone](https://x.com/RobertoACarbone)

---

## 📄 Licencia

Sin licencia específica. Proyecto de uso personal/educativo.
