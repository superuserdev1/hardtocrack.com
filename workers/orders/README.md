# Pedidos automáticos HardToCrack

Implementación para Cloudflare Workers + D1 + Resend + Turnstile. Los formularios mantienen el envío manual mientras `/api/orders/config` no devuelve `enabled: true`.

## Qué hace

- Un mismo registro para `/pedidos`, cliente en `/guia` y personal de tienda en partners `/pedidos`.
- Referencia asignada por el servidor; clave de reintento que evita duplicados del mismo envío.
- Tiendas privadas en D1: referencia, nombre, email de referencia y email separado de acuses/seguimiento. Solo los destinatarios de D1 reciben el acuse; nunca se acepta un email arbitrario del formulario para la tienda.
- Códigos de seis caracteres generados en el panel, entregados por separado y guardados como HMAC con un secreto. No hay huellas ni códigos de tiendas publicados en los formularios. Rotar el código revoca el anterior. El código de seis caracteres no tiene la misma entropía que uno de doce; Turnstile y límites de intentos son parte obligatoria del servicio.
- Recibido: resumen para cliente, aviso a HTC con los emails de tienda y acuse de tienda sin datos personales del cliente.
- Aceptado: mensaje con previsión orientativa de 3–5 días laborables. HTC acepta desde el panel.
- Enviado: HTC introduce transportista y enlace HTTPS tras generar la etiqueta. El correo incluye ese seguimiento. No se generan etiquetas desde esta versión.
- Cola de salida persistente, reintentos cada cinco minutos y claves de idempotencia por mensaje. Un resultado ambiguo que exceda 23 horas se pausa para revisión, evitando superar a ciegas la ventana de 24 horas del proveedor.
- El panel indica correos pendientes/revisión. Un correo marcado `sent` ha sido aceptado por el proveedor; no acredita entrega al buzón. Consultar rebotes en Resend. Los webhooks de entrega no están implementados.
- El panel muestra las últimas 100 solicitudes; no es un sistema de facturación ni cobro.

## Activación — completar en la cuenta de Cloudflare

1. Crear una base D1 llamada `htc-orders`. Ejecutar `schema.sql` en su consola (o aplicar con Wrangler). No crear registros de clientes ni tiendas de ejemplo en producción.
2. Añadir al `wrangler.jsonc` de esta carpeta la conexión real, con el ID que muestre Cloudflare:

```json
"d1_databases": [{"binding":"DB","database_name":"htc-orders","database_id":"ID_REAL_DE_D1"}]
```

El ID no es una contraseña. Debe quedar en el archivo para conservar la conexión en los siguientes despliegues. No publicar la cadena `ID_REAL_DE_D1` como un ID real.

3. Crear un Worker conectado al repositorio `superuserdev1/hardtocrack.com`: nombre `htc-orders`, raíz `workers/orders`, rama `main`, build vacío y despliegue `npx wrangler deploy`. El frontend usa `https://htc-orders.github-ee7.workers.dev`; si la cuenta da otro sufijo, cambiar `assets/orders-client.js` antes de activar.
4. Crear Turnstile para `hardtocrack.com`, `www.hardtocrack.com` y `partners.hardtocrack.com`. Conservar el site key y guardar el secret key en el Worker. La acción que verifica el servicio es `order`.
5. En Resend, verificar un subdominio de envío, por ejemplo `avisos.hardtocrack.com`. Añadir únicamente los registros que Resend indique para ese subdominio; conservar los MX/SPF/DKIM existentes de SimpleLogin en el dominio principal. Crear una API key de envío.
6. En el Worker `htc-orders`, **Settings → Variables and Secrets**, añadir estos secretos de ejecución (no variables de Build):

| Nombre | Valor |
|---|---|
| `RESEND_API_KEY` | API key de Resend |
| `TURNSTILE_SECRET_KEY` | Secret key de Turnstile |
| `CODE_PEPPER` | Secreto aleatorio de al menos 32 caracteres, conservar privado y estable |
| `ADMIN_TOKEN` | Credencial aleatoria distinta de al menos 32 caracteres |

Añadir variables de ejecución:

| Nombre | Valor |
|---|---|
| `TURNSTILE_SITE_KEY` | Site key de Turnstile |
| `MAIL_FROM` | Dirección del subdominio verificado, p. ej. `pedidos@avisos.hardtocrack.com` |
| `HTC_EMAIL` | `pedidos@hardtocrack.com` |
| `ORDERS_ENABLED` | `false` hasta terminar la comprobación |

No subir tokens, códigos ni correos de tiendas a GitHub. No cambiar `CODE_PEPPER` sin regenerar los códigos de todas las tiendas.

7. Abrir `https://htc-orders.github-ee7.workers.dev`, entrar con `ADMIN_TOKEN`, añadir tiendas reales y sus emails. Dejar vacío el email de acuses si es el mismo; generar el código y entregarlo por un canal privado. La pantalla permite copiarlo manualmente; no se envía automáticamente. Añadir cada tienda que deba recibir atribución antes de activar: las referencias públicas de zona no habilitan por sí solas una tienda para pedidos automáticos.
8. Poner `ORDERS_ENABLED=true`. La API solo se habilita si encuentra D1, esquema y todos los secretos/variables. Comprobar que el dominio del remitente esté verificado en Resend; esta verificación no se consulta desde `/config`.
9. Enviar un pedido de prueba autorizado con un buzón propio: confirmar registro y acuses HTC/cliente; probar una tienda real con autorización. Aceptar y enviar un tracking de prueba desde el panel. Revisar el registro del proveedor y probar rebote con sus direcciones de prueba.

## Operación

Panel: seleccionar una tienda para editarla, cambiar su correo de acuses o desactivarla. La casilla de nuevo código revoca el anterior. Los pedidos ya registrados conservan el correo de acuse de ese momento.

Pedido recibido: revisar presupuesto y condiciones, después aceptar o rechazar. Pedido aceptado: introducir transportista y URL de seguimiento para marcarlo enviado. El panel no permite saltar directamente de recibido a enviado.

En caso de correo en `review`, comprobar antes si el mensaje fue aceptado por Resend y corregir manualmente el estado del registro; no reencolarlo sin esa comprobación. La referencia de cada mensaje es la columna `id` de `mail_outbox`.

Desactivar: `ORDERS_ENABLED=false`. Los formularios vuelven al correo manual tras recargar la página. Las solicitudes ya registradas siguen en D1; el procesador también queda pausado. Restaurar el valor para reanudar después de revisar los mensajes antiguos.

Datos almacenados: contacto, preferencias, referencia de tienda, estados e historial. El PIN/contraseñas del dispositivo no se solicitan. Revisar conservación y accesos conforme a la política publicada; esta versión no elimina pedidos por antigüedad automáticamente.

## Pruebas

Node 24 o posterior: `node --test worker.test.mjs`. Usa SQLite real en memoria, Turnstile y Resend simulados; no envía correos ni modifica servicios externos.

Prueba registro, destinatarios privados, validación y rotación de códigos, consentimiento, captcha, límites, repetición sin duplicados, transiciones concurrentes, seguimiento HTTPS y envío ambiguo con reintento.

Referencias oficiales: https://developers.cloudflare.com/d1/worker-api/d1-database/ · https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ · https://resend.com/docs/dashboard/emails/idempotency-keys

## Red de partners: piloto Madrid 001–006 (13 octubre 2026)

**Estado del código:** migración de reserva disponible en `migrations/0001_reserved_madrid_pilot.sql`.
**Estado de producción:** no se aplica a D1 por el mero hecho de subirla a GitHub; ejecutarla desde la cuenta Cloudflare vinculada antes de dar una referencia por operativa.

1. Antes de aplicar la migración, comprobar que D1 `htc-orders` contiene las tablas del `schema.sql` y hacer una copia de seguridad. En Cloudflare Workers & Pages → D1 → `htc-orders` → Console, ejecutar el SQL de `migrations/0001_reserved_madrid_pilot.sql`, o desde un entorno autorizado: `npx wrangler d1 execute htc-orders --remote --file=migrations/0001_reserved_madrid_pilot.sql` estando en `workers/orders`.
2. Verificar: `SELECT ref,name,active,code_hash FROM stores WHERE ref BETWEEN 'HTC-MAD-001' AND 'HTC-MAD-006' ORDER BY ref;`. Las filas insertadas por la migración quedan con `active=0`, nombre `Sin asignar` y hash vacío. Se usa `INSERT OR IGNORE`, por lo que **nunca** sobreescribe registros de tiendas reales anteriores.
3. El formulario `https://partners.hardtocrack.com/pedidos/?ref=HTC-MAD-001` (hasta `006`) ya precarga `ref`. El archivo `assets/orders-client.js` usa la API del mismo Worker para pedidos de web, guía y partners; cuando `/api/orders/config` declara servicio activo, el personal introduce el código individual y el pedido pasa a D1 y a la cola de notificaciones existente.
4. Al firmar el acuerdo, asignar nombre y emails oficiales desde el panel interno `https://htc-orders.github-ee7.workers.dev/`; activar la tienda y entregar el **código de seis caracteres** generado por separado, nunca en el QR. Actualizar el registro `partner_profiles` con datos legales, territorio y fecha contractual por canal administrativo privado. El panel actual no edita aún esos datos extendidos.
5. Revisar el primer pedido real y los correos. Una referencia desactivada no puede generar un pedido automático ni recibir comisión automáticamente. Los pedidos siguen sin registrar cobro ni liquidación: cualquier comisión deberá calcularse a partir de pagos confirmados.

**Precaución:** no volver a usar el sistema Python/CSV de `partners/pedidos/server.py` como backend paralelo. Ese código es legado; la fuente operativa única debe ser Cloudflare D1. No publicar `CODE_PEPPER`, `ADMIN_TOKEN`, códigos individuales, datos legales ni contacto de cada establecimiento.

