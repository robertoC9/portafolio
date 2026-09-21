// ============================================================
// TARJETAS DE CERTIFICACIONES
// ============================================================
// Cada tarjeta se amplía al pulsarla para mostrar el certificado completo, y
// solo puede haber una abierta a la vez.
//
// El movimiento lo hace Flip: se anota dónde está todo ANTES de tocar el DOM,
// se cambian las clases y Flip anima cada elemento desde su posición anterior
// hasta la nueva. Así se resuelven de una sola vez las tres cosas que cambian:
// la columna se ensancha, la vista previa crece y las demás tarjetas se
// recolocan en la fila.
//
// Flip anima el ancho y el alto REALES (no transformaciones de escala), que es
// lo que evita que la imagen del certificado se estire mientras crece.
//
// Es funcionalidad, no adorno: funciona igual con "menos movimiento" activado,
// solo que sin animación.
// ============================================================

import { Flip, ScrollTrigger, gsap } from "../lib/gsap.js";
import { prefiereMenosMovimiento } from "../lib/entorno.js";

const SELECTOR_TARJETA = ".certificate-card";
const SELECTOR_COLUMNA = ".certificate-col";
const SELECTOR_VISTA_PREVIA = ".certificate-preview";
const SELECTOR_CUERPO = ".card-body";
const SELECTOR_AVISO = ".certificate-hint";

// Clase que marca la tarjeta y la columna abiertas
const CLASE_EXPANDIDA = "is-expanded";

const TEXTO_AMPLIAR = "Pulsa para ampliar el certificado";
const TEXTO_CERRAR = "Pulsa para cerrar";

const DURACION = 0.55;
const CURVA = "power2.inOut";

// El fondo de la vista previa cambia de un blanco translúcido a blanco sólido.
// Se incluye en el estado de Flip para que ese cambio también se interpole en
// lugar de dar un salto de brillo a mitad del movimiento.
const PROPIEDADES_EXTRA = "backgroundColor";

// ===== Cambio de estado con Flip =====
// mutar      función que aplica los cambios de clase (el nuevo estado)
// alTerminar callback que se llama al acabar el movimiento o de inmediato
function animarCambioDeEstado(mutar, alTerminar) {
  const elementos = gsap.utils.toArray(
    `${SELECTOR_COLUMNA}, ${SELECTOR_VISTA_PREVIA}`
  );

  // Sin Flip, sin objetivos o con menos movimiento pedido: cambio instantáneo
  if (!Flip || elementos.length === 0 || prefiereMenosMovimiento()) {
    mutar();
    alTerminar?.();
    return null;
  }

  const estado = Flip.getState(elementos, { props: PROPIEDADES_EXTRA });

  mutar();

  return Flip.from(estado, {
    duration: DURACION,
    ease: CURVA,
    // Hay columnas y vistas previas anidadas y ambas se mueven: sin esto, el
    // desplazamiento de la columna se sumaría al de su vista previa y esta se
    // pasaría de largo.
    nested: true,
    onComplete: () => {
      // La sección cambió de alto: ScrollTrigger tiene que rehacer sus cuentas
      // o las apariciones por scroll de más abajo quedarían desfasadas.
      ScrollTrigger?.refresh();
      alTerminar?.();
    },
  });
}

// ===== Aplicar el estado abierto o cerrado =====
function fijarEstado(tarjeta, expandida) {
  const columna = tarjeta.closest(SELECTOR_COLUMNA);
  const aviso = tarjeta.querySelector(SELECTOR_AVISO);

  tarjeta.classList.toggle(CLASE_EXPANDIDA, expandida);
  tarjeta.setAttribute("aria-expanded", String(expandida));

  if (columna) {
    columna.classList.toggle(CLASE_EXPANDIDA, expandida);
  }

  if (aviso) {
    aviso.textContent = expandida ? TEXTO_CERRAR : TEXTO_AMPLIAR;
  }
}

// ===== Cerrar todas menos una =====
function cerrarOtras(tarjetas, excepto) {
  tarjetas.forEach((tarjeta) => {
    if (tarjeta !== excepto && tarjeta.classList.contains(CLASE_EXPANDIDA)) {
      fijarEstado(tarjeta, false);
    }
  });
}

// ===== Abrir o cerrar una tarjeta =====
function alternar(tarjeta, tarjetas) {
  const seVaAExpandir = !tarjeta.classList.contains(CLASE_EXPANDIDA);

  animarCambioDeEstado(
    () => {
      cerrarOtras(tarjetas, tarjeta);
      fijarEstado(tarjeta, seVaAExpandir);
    },
    () => {
      // La tarjeta crece bastante: se lleva a la vista cuando el movimiento ya
      // terminó, para no pelearse con él.
      if (seVaAExpandir) {
        tarjeta.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  );
}

// ===== Aviso de que se puede pulsar =====
// Se añade desde JavaScript: sin JavaScript no habría nada que ampliar
function agregarAviso(tarjeta) {
  const cuerpo = tarjeta.querySelector(SELECTOR_CUERPO);
  if (!cuerpo) return;

  const aviso = document.createElement("span");
  aviso.className = SELECTOR_AVISO.slice(1); // ".certificate-hint" -> sin el punto
  aviso.textContent = TEXTO_AMPLIAR;
  cuerpo.appendChild(aviso);
}

// ===== Arranque =====
export function prepararCertificaciones() {
  const tarjetas = gsap.utils.toArray(SELECTOR_TARJETA);
  if (tarjetas.length === 0) return;

  tarjetas.forEach((tarjeta) => {
    agregarAviso(tarjeta);

    const manejar = () => alternar(tarjeta, tarjetas);

    tarjeta.addEventListener("click", manejar);

    // La tarjeta es un botón: debe responder también al teclado
    tarjeta.addEventListener("keydown", (evento) => {
      if (evento.key !== "Enter" && evento.key !== " ") return;

      evento.preventDefault();
      manejar();
    });
  });

  // Escape cierra la que esté abierta
  document.addEventListener("keydown", (evento) => {
    if (evento.key !== "Escape") return;

    const abierta = tarjetas.find((tarjeta) =>
      tarjeta.classList.contains(CLASE_EXPANDIDA)
    );

    if (!abierta) return;

    animarCambioDeEstado(() => fijarEstado(abierta, false));
  });
}
