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

// ===== Tarjetas de certificaciones expandibles =====
// Las tarjetas comienzan compactas. Al pulsarlas ocupan la fila completa y
// muestran el certificado entero; solo una puede estar abierta a la vez.
const tarjetasCertificado = document.querySelectorAll(".certificate-card");

// Textos del aviso que indica qué pasa al pulsar la tarjeta
const TEXTO_AMPLIAR = "Pulsa para ampliar el certificado";
const TEXTO_CERRAR = "Pulsa para cerrar";

// Abre o cierra una tarjeta concreta y sincroniza clases, accesibilidad y aviso
function fijarEstadoCertificado(tarjeta, expandida) {
  const columna = tarjeta.closest(".certificate-col"); // Columna que la contiene
  const aviso = tarjeta.querySelector(".certificate-hint"); // Texto de ayuda

  tarjeta.classList.toggle("is-expanded", expandida);
  tarjeta.setAttribute("aria-expanded", String(expandida));

  // La columna se ensancha a toda la fila para que el certificado se lea
  if (columna) {
    columna.classList.toggle("is-expanded", expandida);
  }

  if (aviso) {
    aviso.textContent = expandida ? TEXTO_CERRAR : TEXTO_AMPLIAR;
  }
}

// Cierra todas las tarjetas menos la indicada (null cierra todas)
function cerrarOtrosCertificados(tarjetaActiva) {
  tarjetasCertificado.forEach((tarjeta) => {
    if (tarjeta !== tarjetaActiva && tarjeta.classList.contains("is-expanded")) {
      fijarEstadoCertificado(tarjeta, false);
    }
  });
}

tarjetasCertificado.forEach((tarjeta) => {
  // Aviso de interacción: se agrega desde JS porque sin JS no habría ampliación
  const aviso = document.createElement("span");
  aviso.className = "certificate-hint";
  aviso.textContent = TEXTO_AMPLIAR;
  tarjeta.querySelector(".card-body")?.appendChild(aviso);

  const alternarCertificado = () => {
    const seVaAExpandir = !tarjeta.classList.contains("is-expanded");

    cerrarOtrosCertificados(tarjeta); // Solo una tarjeta abierta a la vez
    fijarEstadoCertificado(tarjeta, seVaAExpandir);

    // Al abrirla se lleva a la vista, ya que la tarjeta crece bastante
    if (seVaAExpandir) {
      tarjeta.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  tarjeta.addEventListener("click", alternarCertificado);
  tarjeta.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      alternarCertificado();
    }
  });
});

// La tecla Escape cierra el certificado que esté abierto
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") {
    cerrarOtrosCertificados(null);
  }
});

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

// ===== Chatbot de WhatsApp de la seccion de contacto =====
// Conversacion guiada que pide el nombre y el mensaje, y los envia al endpoint
// /send. El numero de WhatsApp de destino NO esta en este archivo ni llega
// nunca al navegador: lo conoce solo el servidor. Ademas del honeypot del
// formulario, se mide el tiempo que tarda el envio como filtro extra: los bots
// rellenan y envian en milisegundos.
(function iniciarChatbotWhatsapp() {
  const chat = document.getElementById("waChat"); // Contenedor del chatbot
  if (!chat) return; // Si la seccion no esta en la pagina, no se hace nada

  const formulario = document.getElementById("waForm");
  const entrada = document.getElementById("waInput");
  const boton = document.getElementById("waSend");
  const hilo = document.getElementById("waLog");
  const trampa = document.getElementById("waTrap"); // Campo honeypot
  const estadoTexto = document.getElementById("waStatus");

  const MOMENTO_CARGA = Date.now(); // Marca de tiempo de apertura del chat
  const LARGO_MAXIMO = 600; // Debe coincidir con el limite del servidor

  let paso = "nombre"; // Paso actual de la conversacion: "nombre" o "mensaje"
  let nombreVisita = ""; // Nombre que indica la persona
  let enviando = false; // Evita envios simultaneos

  // ----- Pintar una burbuja en el hilo -----
  // tipo: "bot" (asistente), "user" (visita) o "aviso" (nota del sistema)
  function agregarMensaje(texto, tipo) {
    const burbuja = document.createElement("div");
    burbuja.className = `wa-msg wa-msg-${tipo}`;
    burbuja.textContent = texto; // textContent evita inyeccion de HTML
    hilo.appendChild(burbuja);
    hilo.scrollTop = hilo.scrollHeight; // Baja el hilo al ultimo mensaje
    return burbuja;
  }

  // ----- Indicador "escribiendo..." -----
  // Se muestra un instante antes de cada respuesta para que el chat se sienta
  // conversacional; devuelve una funcion que lo retira.
  function mostrarEscribiendo() {
    const puntos = document.createElement("div");
    puntos.className = "wa-msg wa-msg-bot wa-typing";
    puntos.innerHTML = "<span></span><span></span><span></span>";
    hilo.appendChild(puntos);
    hilo.scrollTop = hilo.scrollHeight;
    return () => puntos.remove();
  }

  // Responde como el asistente tras una pequena pausa
  function responderBot(texto, espera = 600) {
    const quitarEscribiendo = mostrarEscribiendo();
    setTimeout(() => {
      quitarEscribiendo();
      agregarMensaje(texto, "bot");
    }, espera);
  }

  // ----- Envio al backend -----
  // El servidor recibe nombre, mensaje, el honeypot y los milisegundos que
  // pasaron desde que se abrio el chat, y decide si reenviarlo a WhatsApp.
  async function enviarAWhatsapp(mensaje) {
    const respuesta = await fetch("/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nombreVisita,
        mensaje,
        website: trampa ? trampa.value : "", // Honeypot: debe llegar vacio
        msDesdeCarga: Date.now() - MOMENTO_CARGA,
      }),
    });

    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(datos.error || "No se pudo enviar el mensaje");
    }

    return datos;
  }

  // ----- Bloquear o desbloquear la barra de escritura -----
  function fijarBloqueo(bloqueado) {
    enviando = bloqueado;
    entrada.disabled = bloqueado;
    boton.disabled = bloqueado;
    if (!bloqueado) entrada.focus();
  }

  // ----- Paso 1: guardar el nombre -----
  function procesarNombre(texto) {
    if (texto.length < 2) {
      responderBot("Necesito un nombre de al menos 2 letras para presentarte.");
      return;
    }

    nombreVisita = texto.slice(0, 60); // Mismo limite que valida el servidor
    paso = "mensaje";
    entrada.placeholder = "Cuéntame en qué te ayudo...";
    responderBot(`Un gusto, ${nombreVisita}. Ahora escríbeme tu mensaje y se lo hago llegar a Roberto por WhatsApp.`);
  }

  // ----- Paso 2: enviar el mensaje -----
  async function procesarMensaje(texto) {
    fijarBloqueo(true);
    const quitarEscribiendo = mostrarEscribiendo();

    try {
      const datos = await enviarAWhatsapp(texto);
      quitarEscribiendo();

      // El servidor indica si el mensaje llego a WhatsApp o si solo quedo
      // registrado. Se avisa lo que de verdad ocurrio, sin prometer un envio
      // que no se hizo.
      if (datos.entregado) {
        agregarMensaje("¡Listo! Le envié tu mensaje por WhatsApp. Te responderá en cuanto lo vea.", "bot");
      } else {
        agregarMensaje("Tu mensaje quedó registrado y Roberto lo revisará pronto. Si es urgente, escríbele al correo.", "bot");
      }

      agregarMensaje("Puedes seguir escribiendo si quieres añadir algo más.", "aviso");
      entrada.placeholder = "Escribe otro mensaje...";
    } catch (error) {
      quitarEscribiendo();
      console.error("Error al enviar el mensaje de WhatsApp:", error);
      agregarMensaje("No pude enviar el mensaje ahora mismo. Intenta de nuevo en un momento o escríbeme al correo.", "bot");
    } finally {
      fijarBloqueo(false);
    }
  }

  // ----- Envio del formulario -----
  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    if (enviando) return;

    const texto = entrada.value.trim().slice(0, LARGO_MAXIMO);
    if (!texto) return;

    agregarMensaje(texto, "user"); // Se muestra lo que escribio la visita
    entrada.value = "";

    if (paso === "nombre") {
      procesarNombre(texto);
    } else {
      procesarMensaje(texto);
    }
  });

  // ----- Saludo inicial -----
  if (estadoTexto) {
    estadoTexto.textContent = "Tu mensaje llega directo a su WhatsApp";
  }
  responderBot("¡Hola! Soy el asistente de Roberto. ¿Cómo te llamas?", 400);
})();

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
