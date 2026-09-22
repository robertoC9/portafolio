// ============================================================
// PUNTO DE ENTRADA DEL PORTAFOLIO
// ============================================================
// Reúne todo lo que se mueve en la página:
//  - GSAP, para las animaciones ligadas al scroll y a la entrada
//  - Three.js, para el fondo de partículas
//
// La división clave está en gsap.matchMedia(): todo lo que es ADORNO vive
// dentro de la consulta de movimiento y se apaga solo si el sistema pide menos
// animación. Lo que es FUNCIONALIDAD (las tarjetas de certificaciones, el
// estado del navbar) se prepara siempre, y en ese caso los cambios se aplican
// de golpe en lugar de animarse.
// ============================================================

import { animarEntradaHeroe } from "./animations/hero.js";
import { iniciarAnimacionesContinuas } from "./animations/logo.js";
import {
  animarEntradaNavbar,
  prepararNavbarCompacta,
} from "./animations/navbar-scroll.js";
import { prepararCertificaciones } from "./animations/certificates.js";
import { animarFondoDePagina } from "./animations/fondo-parallax.js";
import { crearBarraDeProgreso } from "./animations/progreso-scroll.js";
import { prepararRevelados } from "./animations/reveal.js";
import { gsap } from "./lib/gsap.js";
import { iniciarFondo3D } from "./three/background.js";
import { iniciarDisolucionDeRetrato } from "./three/portrait-dissolve.js";

// ===== Funcionalidad: se prepara siempre =====
prepararCertificaciones();
prepararNavbarCompacta();

// ===== Fondo 3D =====
// Decide por su cuenta si puede funcionar: si no hay WebGL no hace nada, y si
// se pide menos movimiento dibuja un solo fotograma fijo. Por eso se arranca
// fuera de la consulta de movimiento, sin condiciones aquí.
iniciarFondo3D();

// ===== Adorno: solo sin "menos movimiento" =====
// gsap.matchMedia() no es solo un if: cuando la preferencia cambia, deshace
// automáticamente todo lo que se creó dentro de la consulta. Y si el sistema
// ya pide menos movimiento, el bloque ni siquiera se ejecuta, así que el
// contenido se ve completo sin animación de entrada.
const consultaDeMovimiento = gsap.matchMedia();

consultaDeMovimiento.add("(prefers-reduced-motion: no-preference)", () => {
  animarEntradaHeroe();
  animarEntradaNavbar();
  prepararRevelados();

  // Animaciones continuas del logo, la marca y el retrato. Logo y marca
  // crecen al doble al hacer clic (vuelven solos, sin salirse del marco);
  // el handle retira todo, clics incluidos.
  const continuas = iniciarAnimacionesContinuas();

  // Desintegración del retrato: es adorno puro, así que vive dentro de la
  // consulta de movimiento como el resto. Arranca SOLO la primera vez que la
  // foto entra en pantalla; después, el cursor es el único disparador.
  // Recibe gsap para que sus tweens entren en el mismo sistema que los
  // demás (y se reviertan solos si la preferencia cambia).
  const disolucion = iniciarDisolucionDeRetrato(gsap);

  // Estos crean elementos y animaciones propias: devuelven cómo deshacerse
  // de ellos para que la limpieza de matchMedia los retire también.
  const barra = crearBarraDeProgreso();
  const fondo = animarFondoDePagina();

  return () => {
    continuas?.logo?.destruir();
    continuas?.marca?.destruir();
    continuas?.retrato?.kill();
    disolucion?.destruir();
    barra?.destruir();
    fondo?.destruir();
  };
});
