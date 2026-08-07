// ============================================================
// SCRIPT PRINCIPAL DEL PORTAFOLIO DE ROBERTO CARBONE RÍOS
// ============================================================
// Contiene:
//  - Reloj en vivo en el footer
//  - Animación de sombras ondulantes en los títulos
//  - Rotación del logo
//  - Rebote del retrato
//  - Envío y carga de comentarios (frontend)
//  - Diálogo flotante de notificaciones
// ============================================================

// ===== Hora en el footer =====
// Actualiza el <span id="hora"> con la hora actual (HH:MM:SS)
function mostrarHora() {
  const ahora = new Date(); // Fecha/hora actual
  // Se formatean horas, minutos y segundos con dos dígitos (ej: 09:05:03)
  const horas = String(ahora.getHours()).padStart(2, "0");
  const minutos = String(ahora.getMinutes()).padStart(2, "0");
  const segundos = String(ahora.getSeconds()).padStart(2, "0");
  const horaElemento = document.getElementById("hora"); // Elemento del footer

  // Solo se actualiza si el elemento existe
  if (horaElemento) {
    horaElemento.textContent = `${horas}:${minutos}:${segundos}`;
  }
}

// Se actualiza la hora cada segundo (1000 ms)
setInterval(mostrarHora, 1000);
// Se ejecuta una vez al cargar para no esperar el primer segundo
mostrarHora();

// ===== Sombras ondulantes en titulos =====
// Aplica la animación CSS "sombrasOndulantes" a todos los <h2>
function aplicarSombrasOndulantes() {
  const elementos = document.querySelectorAll("h2"); // Todos los títulos h2
  elementos.forEach((el) => {
    el.style.animation = "sombrasOndulantes 3s infinite ease-in-out";
  });
}

// Se ejecuta al cargar la página
aplicarSombrasOndulantes();

// ===== Logo girando hacia la izquierda con rebote =====
let anguloLogo = 0; // Ángulo actual de rotación del logo

function girarLogo() {
  anguloLogo -= 0.3; // Rota hacia la izquierda (ángulo negativo)
  const logo = document.getElementById("logo"); // Elemento del logo

  if (logo) {
    // Aplica rotación + un pequeño escalado (rebote) usando seno
    logo.style.transform = `rotate(${anguloLogo}deg) scale(${1 + Math.sin(anguloLogo / 15) * 0.05})`;
  }
}

// Se ejecuta cada 30 ms para una animación fluida
setInterval(girarLogo, 30);

// ===== Retrato con pequeno rebote =====
let anguloRetrato = 0; // Variable de control para el "paso" de la animación

function rebotarRetrato() {
  anguloRetrato += 0.2; // Incrementa el paso
  const retrato = document.getElementById("retrato"); // Elemento del retrato

  if (retrato) {
    // Aplica un escalado oscilante (rebote suave)
    retrato.style.transform = `scale(${1 + Math.sin(anguloRetrato / 20) * 0.05})`;
  }
}

// Se ejecuta cada 30 ms para una animación fluida
setInterval(rebotarRetrato, 30);

// ===== Enviar comentario al backend =====
// Envía el comentario de un textarea al endpoint /guardar-comentario
async function enviarComentario(idTextarea) {
  const comentarioInput = document.getElementById(idTextarea); // Obtiene el textarea

  // Si el textarea no existe, muestra un error en consola
  if (!comentarioInput) {
    console.error(`No se encontro el textarea con id='${idTextarea}'`);
    return;
  }

  // Se limpia el texto (se eliminan espacios al inicio y al final)
  const comentario = comentarioInput.value.trim();

  // Si el comentario está vacío, avisa y no continúa
  if (!comentario) {
    mostrarDialogo("El comentario esta vacio");
    return;
  }

  try {
    // Petición POST al servidor con el comentario en formato JSON
    const res = await fetch("/guardar-comentario", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comentario }),
    });

    const data = await res.json(); // Respuesta del servidor

    // Si la respuesta no es exitosa, lanza un error
    if (!res.ok) {
      throw new Error(data.error || "Error en la respuesta del servidor");
    }

    comentarioInput.value = ""; // Limpia el textarea tras enviar
    mostrarDialogo("Comentario enviado con exito");
  } catch (err) {
    // En caso de error (red, servidor, etc.)
    console.error("Error en fetch:", err);
    mostrarDialogo("Error al enviar comentario");
  }
}

// ===== Cargar comentarios desde el backend =====
// Obtiene la lista de comentarios desde /comentarios y los muestra
function cargarComentarios(idLista) {
  fetch("/comentarios")
    .then((res) => res.json())
    .then((data) => {
      const lista = document.getElementById(idLista); // Lista donde se mostrarán
      if (!lista) return;

      lista.innerHTML = ""; // Limpia el contenido previo
      // Crea un <li> por cada comentario y lo agrega a la lista
      data.comentarios.forEach((comentario) => {
        const li = document.createElement("li");
        li.textContent = comentario;
        lista.appendChild(li);
      });
    })
    .catch(() => {
      // Si falla la petición, muestra un aviso
      mostrarDialogo("Error al cargar comentarios");
    });
}

// ===== Mostrar dialogo flotante =====
// Crea y muestra un aviso flotante temporal en la esquina inferior derecha
function mostrarDialogo(mensaje) {
  const dialogo = document.createElement("div"); // Crea el elemento
  dialogo.textContent = mensaje; // Texto del aviso
  // Estilos inline del aviso (posición, fondo, color, etc.)
  dialogo.style.position = "fixed";
  dialogo.style.bottom = "20px";
  dialogo.style.right = "20px";
  dialogo.style.background = "rgba(255, 204, 0, 0.95)";
  dialogo.style.color = "#000";
  dialogo.style.padding = "10px 20px";
  dialogo.style.borderRadius = "8px";
  dialogo.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
  dialogo.style.zIndex = "9999";
  dialogo.style.fontFamily = "Arial, sans-serif";
  dialogo.style.fontWeight = "bold";
  document.body.appendChild(dialogo); // Lo agrega al documento

  // Se elimina automáticamente después de 3 segundos
  setTimeout(() => dialogo.remove(), 3000);
}
