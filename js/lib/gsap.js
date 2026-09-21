// ============================================================
// ACCESO CENTRALIZADO A GSAP
// ============================================================
// Este proyecto no usa empaquetador, así que GSAP y sus plugins se cargan como
// scripts clásicos (builds UMD servidos desde /vendor/gsap) y dejan sus clases
// en window. Aquí se leen UNA sola vez y se registran los plugins, para que el
// resto de los módulos los importe como dependencias normales en lugar de
// tocar window cada uno por su cuenta. Si algún día se añade un empaquetador,
// solo cambia este archivo.
// ============================================================

const gsap = window.gsap;
const { ScrollTrigger, SplitText, Flip } = window;

if (!gsap) {
  throw new Error(
    "GSAP no se cargo. Revisa los scripts de /vendor/gsap en index.html"
  );
}

// Los plugins deben registrarse antes de usarse. split-text y flip son
// opcionales: si su archivo no carga, el sitio sigue funcionando con el resto.
const pluginsDisponibles = [ScrollTrigger, SplitText, Flip].filter(Boolean);
gsap.registerPlugin(...pluginsDisponibles);

const pluginsFaltantes = [
  ["ScrollTrigger", ScrollTrigger],
  ["SplitText", SplitText],
  ["Flip", Flip],
]
  .filter(([, plugin]) => !plugin)
  .map(([nombre]) => nombre);

if (pluginsFaltantes.length > 0) {
  console.warn(
    `GSAP: no se cargaron los plugins ${pluginsFaltantes.join(", ")}. ` +
      "Las animaciones que dependen de ellos se omiten."
  );
}

// Valores por defecto de todo el sitio: una sola curva y duración base para
// que las animaciones se sientan como una sola pieza y no como veinte sueltas.
gsap.defaults({ ease: "power3.out", duration: 0.8 });

export { gsap, ScrollTrigger, SplitText, Flip };
