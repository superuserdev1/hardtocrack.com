# Datos legales fuera de Git

La fuente usa `{{LEGAL_NAME}}`, `{{LEGAL_NIF}}` y `{{LEGAL_POSTAL_ADDRESS}}` en `/privacidad/`, `/guia/privacidad/` y en la información básica de los formularios de la guía y de `/pedidos`. No escribas sus valores en este repositorio, en una incidencia ni en un archivo `.env` versionado.

En el proyecto de Vercel configura las variables de entorno `LEGAL_NAME`, `LEGAL_NIF` y `LEGAL_POSTAL_ADDRESS` para **Production**. Si se publican despliegues de prueba, configura también ese entorno y restringe quién puede abrir las vistas previas. El archivo `vercel.json` ejecuta `node scripts/build-legal.mjs` y publica `dist`. El comando cancela el despliegue si falta algún dato; no imprime los valores en el registro. El HTML publicado contiene esos datos y es visible para cualquiera que consulte la web.

En Cloudflare Pages se puede utilizar el mismo script con el comando de compilación `node scripts/build-legal.mjs`, directorio de salida `dist` y las mismas tres variables del proyecto.

Para probar la compilación en local, pasa valores ficticios al proceso. El directorio `dist/` se ignora en Git. Antes de publicar, verifica que la identidad, el NIF, el domicilio válido y el correo de contacto del titular sean correctos, y que las versiones de prueba y los archivos de despliegue tengan el acceso adecuado.

