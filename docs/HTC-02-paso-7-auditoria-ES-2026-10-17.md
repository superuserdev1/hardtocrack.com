# HTC-02 — Paso 7: auditoría de portada ES
Fecha: 2026-10-17
Ámbito: `index.html` en `main`. No se han editado versiones EN/NL/PT ni se ha iniciado el Paso 8.

## Comprobaciones estáticas realizadas
- Navegación principal: los destinos internos `#dispositivos`, `#paquetes`, `#grapheneos` existen.
- La sección `#grapheneos` aparece una sola vez.
- No hay atributos `id` duplicados en la portada.
- Permanecen los enlaces relativos a `/informe`, `/compatibilidades/`, `/guia/` y packs.
- CSS responsive existente para tarjetas educativas y menú móvil; comprobada la presencia de reglas, **no** la apariencia en dispositivos reales.
- SEO: `lang=es`, título, meta description, canonical y metadatos Open Graph presentes.
- Accesibilidad: menú con `aria-expanded` y `aria-controls`, y controles de teclado añadidos; no equivale a una auditoría WCAG completa.

## Correcciones aplicadas
- Eliminado `/_vercel/insights/script.js` de la portada ES, por ser una referencia heredada tras migración a Cloudflare.
- Incorporado enlace para saltar al contenido, destino `main#contenido` y estilos de foco visibles.
- Añadido `scroll-margin-top` a secciones con anclas para evitar ocultación bajo cabecera fija.
- Añadida preferencia `prefers-reduced-motion`.
- El menú móvil se cierra al elegir enlace, pulsar Escape, hacer clic fuera o ampliar a escritorio; Escape devuelve el foco al botón.

## Límites y pruebas pendientes
- **No se ha podido comprobar HTTP ni renderizado en producción**: el acceso directo a `https://hardtocrack.com/` y `/informe` falló desde los mecanismos de consulta disponibles. No afirmar despliegue verificado.
- No se ha realizado prueba visual real en 360/390/768/1024/1440 px ni test de navegador, Lighthouse, axe o W3C.
- La configuración del repositorio indica Cloudflare Workers con assets en `./dist`; no se ha confirmado el estado del último despliegue en el panel Cloudflare.
- Verificar en Cloudflare: publicación del commit, navegación y anclas, menú móvil, respuesta HTTP 200 de `/informe`, `/compatibilidades/`, `/guia/`, y redirección 301 desde `/hardtocrack-informe-grapheneos.html`.
- Revisar otras páginas por scripts heredados de Vercel en una tarea separada: fuera del alcance de esta portada.

## Resultado
Auditoría estática y correcciones puntuales realizadas. Aprobación de producción **pendiente** de pruebas HTTP y visuales. No avanzar a traducciones del Paso 8 hasta confirmar la portada ES.
