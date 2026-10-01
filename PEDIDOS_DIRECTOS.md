# Pedidos directos HardToCrack

Página: `https://www.hardtocrack.com/pedidos`. Correo: `pedidos@hardtocrack.com`.

La referencia directa es `HTC-WEB-001`. Los enlaces antiguos con `HTC-DIR-001` se normalizan al nuevo código. No se distingue el marketplace de origen y no se guarda la configuración ni el contacto en almacenamiento del navegador.

## Operativa manual

1. El cliente elige dispositivo, pack, perfiles, apps, servicios, contacto y modalidad de entrega.
2. Pulsa **Revisar solicitud**. Se genera un identificador local y un resumen; todavía no se ha enviado nada.
3. Pulsa **Abrir correo para enviar** y envía desde su buzón. También puede copiar el resumen o descargarlo como `.txt` y adjuntarlo a un correo.
4. El alias de SimpleLogin debe dirigir `pedidos@hardtocrack.com` al buzón Tuta operativo.
5. HardToCrack revisa compatibilidad, disponibilidad, apps, licencias y extras. Responde con presupuesto desglosado, plazos, condiciones y métodos de pago.
6. La solicitud no equivale a pedido aceptado, pago recibido o factura emitida. Registrar la aceptación y la comprobación del pago antes de configurar y entregar.

El identificador ayuda a conciliar mensajes; no prueba identidad, pago ni comisión. No pedir contraseñas, PIN, códigos de recuperación, tarjetas o frases semilla. Solicitar dirección completa y datos de facturación cuando corresponda para confirmar la operación.

## Rutas y referencias

- La portada y los botones de packs abren `/pedidos` (admiten `?pack=Essential`, `Privacy` o `Elite` y `?modelo=...`).
- `/guia/pedidos` redirige a `/pedidos` conservando parámetros. Incluye respaldo HTML para alojamiento estático.
- `/guia` sin referencia abre el recorrido directo `HTC-WEB-001`; con una referencia de tienda conserva su operativa.
- `/pedidos?ref=HTC-MAD-001` no convierte la referencia de tienda en venta directa: muestra un acceso a la guía con el código original.
- Un código desconocido requiere corregir el enlace o elegir expresamente venta directa.
- Los precios del pack se muestran como habituales; dispositivo y envío se presupuestan aparte. El aviso de oferta online se oculta a partir del 01/11/2026, hora peninsular española.

## Compilación y publicación

Se mantiene `node scripts/build-legal.mjs`, salida `dist` y variables `LEGAL_NAME`, `LEGAL_NIF`, `LEGAL_POSTAL_ADDRESS`. Los datos legales reales se configuran en el alojamiento y no se incluyen en Git.

La web no tiene servidor de recepción ni pasarela de pago. `mailto:` prepara un mensaje y requiere que el cliente pulse Enviar en su correo. No muestra una falsa confirmación de envío.

## Comprobación operativa pendiente

Antes de anunciar la página como canal operativo: enviar una solicitud de prueba desde un buzón real, confirmar recepción en Tuta, comprobar la respuesta desde el alias y abrirla en el buzón del cliente. La verificación de interfaz no demuestra entrega de correo. No se envían mensajes de prueba automáticamente.
