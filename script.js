// ===== Hora en el footer =====
function mostrarHora() {
  const ahora = new Date();
  const horas = String(ahora.getHours()).padStart(2, '0');
  const minutos = String(ahora.getMinutes()).padStart(2, '0');
  const segundos = String(ahora.getSeconds()).padStart(2, '0');
  const horaElemento = document.getElementById('hora');
  if (horaElemento) {
    horaElemento.textContent = `${horas}:${minutos}:${segundos}`;
  }
}
setInterval(mostrarHora, 1000);
mostrarHora();

// ===== Sombras ondulantes en títulos =====
function aplicarSombrasOndulantes() {
  const elementos = document.querySelectorAll('h2');
  elementos.forEach(el => {
    el.style.animation = "sombrasOndulantes 3s infinite ease-in-out";
  });
}
aplicarSombrasOndulantes();

// ===== Logo girando hacia la izquierda con rebote =====
let anguloLogo = 0;
function girarLogo() {
  anguloLogo -= 0.3; // giro hacia la izquierda
  const logo = document.getElementById('logo');
  if (logo) {
    logo.style.transform = `rotate(${anguloLogo}deg) scale(${1 + Math.sin(anguloLogo/15)*0.05})`;
  }
}
setInterval(girarLogo, 30);

// ===== Retrato con pequeño rebote =====
let anguloRetrato = 0;
function rebotarRetrato() {
  anguloRetrato += 0.2;
  const retrato = document.getElementById('retrato');
  if (retrato) {
    retrato.style.transform = `scale(${1 + Math.sin(anguloRetrato/20)*0.05})`;
  }
}
setInterval(rebotarRetrato, 30);

// ===== Enviar comentario al backend =====
function enviarComentario(idTextarea, idLista) {
  const comentarioInput = document.getElementById(idTextarea);
  if (!comentarioInput) {
    console.error(`No se encontró el textarea con id='${idTextarea}'`);
    return;
  }

  const comentario = comentarioInput.value.trim();
  if (!comentario) {
    mostrarDialogo("⚠️ El comentario está vacío");
    return;
  }

  fetch("/guardar-comentario", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ comentario })
  })
  .then(res => {
    if (!res.ok) throw new Error("Error en la respuesta del servidor");
    return res.text();
  })
  .then(() => {
    comentarioInput.value = "";
    mostrarDialogo("✅ Comentario enviado con éxito");
    cargarComentarios(idLista);
  })
  .catch(err => {
    console.error("Error en fetch:", err);
    mostrarDialogo("❌ Error al enviar comentario");
  });
}

function cargarComentarios(idLista) {
  fetch("/comentarios")
    .then(res => res.json())
    .then(data => {
      const lista = document.getElementById(idLista);
      if (!lista) return;
      lista.innerHTML = "";
      data.comentarios.forEach(c => {
        const li = document.createElement("li");
        li.textContent = c;
        lista.appendChild(li);
      });
    })
    .catch(() => {
      mostrarDialogo("Error al cargar comentarios ❌");
    });
}

// Cargar comentarios existentes al iniciar
cargarComentarios('lista1');
cargarComentarios('lista2');

// ===== Mostrar diálogo flotante =====
function mostrarDialogo(mensaje) {
  const dialogo = document.createElement("div");
  dialogo.textContent = mensaje;
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
  document.body.appendChild(dialogo);

  setTimeout(() => dialogo.remove(), 3000);
}
