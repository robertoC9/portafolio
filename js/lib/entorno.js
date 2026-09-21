// ============================================================
// CAPACIDADES DEL ENTORNO
// ============================================================
// Consultas sobre el navegador que necesitan tanto las animaciones como el
// fondo 3D: si la persona pidió menos movimiento y si hay WebGL disponible.
// Se aíslan aquí para no repetir la misma detección en cada módulo.
// ============================================================

// Consulta del sistema operativo: "reduce" cuando se pide menos animación
const CONSULTA_MENOS_MOVIMIENTO = "(prefers-reduced-motion: reduce)";

// ===== ¿Se pidió menos movimiento? =====
export function prefiereMenosMovimiento() {
  return window.matchMedia(CONSULTA_MENOS_MOVIMIENTO).matches;
}

// ===== Avisar cuando cambie esa preferencia =====
// Devuelve una función para dejar de escuchar. Sirve para encender o apagar
// las animaciones sin recargar la página.
export function alCambiarMenosMovimiento(callback) {
  const consulta = window.matchMedia(CONSULTA_MENOS_MOVIMIENTO);
  const alCambiar = (evento) => callback(evento.matches);

  consulta.addEventListener("change", alCambiar);
  return () => consulta.removeEventListener("change", alCambiar);
}

// ===== ¿El navegador puede dibujar WebGL? =====
// Se prueba creando un contexto de verdad: algunos navegadores expuestos a
// listas de bloqueo o con la aceleración desactivada devuelven null, y en ese
// caso el fondo 3D debe quedarse fuera en silencio, sin romper la página.
export function soportaWebGL() {
  try {
    const prueba = document.createElement("canvas");
    const contexto =
      prueba.getContext("webgl2") ||
      prueba.getContext("webgl") ||
      prueba.getContext("experimental-webgl");

    return Boolean(contexto);
  } catch {
    return false;
  }
}

// ===== Límite de píxeles por punto =====
// En pantallas con densidad 3x o 4x, dibujar a resolución completa multiplica
// por nueve el trabajo de la tarjeta gráfica sin mejora visible. Se limita.
export function densidadDePantalla(maximo = 2) {
  return Math.min(window.devicePixelRatio || 1, maximo);
}

// ===== ¿Es una pantalla pequeña? =====
// En móvil se reduce la cantidad de partículas y la calidad del render.
export function pantallaPequena() {
  return window.matchMedia("(max-width: 768px)").matches;
}
