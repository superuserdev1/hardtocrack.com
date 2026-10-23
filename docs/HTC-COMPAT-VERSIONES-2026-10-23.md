# HTC-COMPAT — Registro público de versiones (23/10/2026)

Fuente pública NO equivale a prueba realizada por HTC. La versión instalada en un Pixel HTC requiere una ficha técnica de prueba.

| Componente y canal | Versión de referencia | Fuente |
|---|---|---|
| GrapheneOS estable anterior | 2026101600 | https://grapheneos.org/releases |
| GrapheneOS estable actual | 2026102100 | https://grapheneos.org/releases |
| WhatsApp Android beta, NO estable | 2.26.42.9 | https://www.apkmirror.com/categories/communication/W/ |
| Signal Android estable | 8.32.3 | https://github.com/signalapp/Signal-Android/releases |
| Signal Android prerelease | 8.33.1 | https://github.com/signalapp/Signal-Android/releases |
| Telegram Android estable | 13.1.0 (7229) | https://t.me/s/tgstable |
| SimpleX estable | 7.0.3 | https://github.com/simplex-chat/simplex-chat/releases |
| SimpleX prerelease | 7.0.4 | https://github.com/simplex-chat/simplex-chat/releases |
| SimpleX beta | 7.1.0-beta.7 | https://github.com/simplex-chat/simplex-chat/releases |
| Session Android | 1.33.5 | https://github.com/session-foundation/session-android/releases |
| Standard Notes Mobile prerelease | 3.202.10 | https://github.com/standardnotes/app/releases |
| Mullvad VPN Android | 2026.12 | https://mullvad.net/en/download/vpn/android |
| Proton Mail Android | 7.11.10 (18325) | https://github.com/ProtonMail/android-mail/releases |
| Proton Pass Android: última del changelog | 1.41.3 | https://github.com/protonpass/android-pass/blob/main/CHANGELOG.md |
| Filen nueva app Android | número por verificar | https://filen.io/hub/the-new-filen-mobile-app-2/ |

Proton Calendar, Proton Drive, Google Maps, Waze, Pixel Camera, Android Auto y Google Play Services: número preciso del canal Android por verificar. Las aplicaciones bancarias deben comprobarse por entidad.

Nota: WhatsApp 2.26.42.9 es BETA localizada en catálogo de tercero, no versión estable oficial certificada. El viejo GitHub de Filen está archivado y no representa su nueva aplicación Android publicada en julio de 2026. El repositorio de Telegram DrKLO muestra releases históricos y no su versión actual.

## Ficha de validación HTC

- Fecha, técnico y modelo exacto del Pixel
- Versión/build y canal de GrapheneOS (estable, beta, alpha)
- Perfil del usuario, tienda/origen del APK, nombre de paquete, versión y versionCode
- Play Services aislado: versión, permisos, energía y registro push si procede
- Red (wifi/datos, VPN), notificaciones con pantalla bloqueada, mensajes, llamadas, ficheros
- Instalación, actualización, restauración, autenticación y control de permisos
- Resultado: PASS / PASS con incidencias / FAIL / NO PROBADO
- Evidencia sin datos personales, contraseñas, 2FA, chats ni datos bancarios

No publicar la etiqueta «probado por HTC con la última versión» sin rellenar la ficha y ejecutar los ensayos. Mantener cortes históricos al actualizar.