# Auditoría general de Tiza Food

Fecha de revisión: 23 de noviembre de 2026.

## Alcance

Se revisaron el servidor Node local, control de acceso, cookies de sesión, Firebase Authentication, CAPTCHA, pedidos, importes, cupones, reembolsos, reseñas, repartidores, tickets por correo, archivos JSON, paneles de personal y cabeceras HTTP.

También se ejecutó la suite automatizada completa. Resultado: 214 pruebas aprobadas y ninguna fallida.

## Hallazgo crítico

### Clave de Resend inválida

El 23 de noviembre, una consulta de solo lectura a Resend devolvió `401 validation_error: API key is invalid`. Esta es la causa actual por la que los tickets nuevos no se envían. La app no puede generar una clave por cuenta propia.

Acción necesaria por el dueño:

1. Crear una API key nueva en Resend con permiso de envío.
2. Usar un remitente que Resend permita para esa cuenta.
3. Reemplazar los valores de `RESEND_API_KEY` y `TIZA_RECEIPT_FROM` en `.env`.
4. Cerrar y volver a abrir Tiza Food con `INICIAR-TIZA-FOOD.cmd`.
5. Entrar como dueño a **Reportes** y usar **Reintentar tickets fallidos**.

La app conserva el motivo del rechazo sin guardar ni mostrar claves. Los tickets se procesan con una clave de idempotencia para evitar duplicados durante reintentos.

## Correo de verificación

Firebase respondió a una solicitud de diagnóstico con `INVALID_ID_TOKEN`, que indica que la API key configurada llega a Firebase y es reconocida. La prueba no envió ningún correo ni modificó cuentas.

El envío real de verificación depende de que Firebase tenga habilitado el proveedor Email/Password y de que el usuario revise spam. Cuando Firebase rechaza un envío, la pantalla muestra el mensaje que devuelve el servidor.

## Servidor local

El proceso Node inicia correctamente. El cierre percibido provenía del iniciador anterior, que abría el navegador antes de comprobar que el servidor estuviera listo y dependía de mantener abierta la consola.

El nuevo iniciador ejecuta Node oculto en segundo plano, espera `/api/health`, abre el navegador solo cuando está listo y guarda diagnósticos en `data/server.stdout.log` y `data/server.stderr.log`. Esos archivos quedan fuera del acceso web público.

## Controles que ya están aplicados

- Sesión limitada a una hora en servidor y navegador.
- Cookies HttpOnly y SameSite=Strict cuando se usa la opción de recordar.
- Contraseñas fuera de los archivos JSON de perfiles.
- Firebase requiere correo confirmado para clientes.
- CAPTCHA de un uso para registro, inicio y reseñas.
- Importes, descuentos, saldo, cupones y productos calculados por el servidor.
- Historial de pedidos conservado sin exponer los JSON por HTTP.
- Roles separados para cliente, empleado y dueño.
- Reembolsos solo para el dueño y evidencia privada.
- Reseñas ligadas a entregas reales, con filtro y moderación.
- Códigos aleatorios para retiro y entrega con límite de intentos.
- Ubicación de repartidor voluntaria y visible al cliente solo cerca del destino.
- Cabeceras CSP, anti-iframe, `nosniff`, validación de origen y rutas privadas bloqueadas.

## Riesgos y mejoras recomendadas

### Alta prioridad antes de usarla fuera de una demostración

1. Publicar el servidor detrás de HTTPS y un dominio propio. El QR de reparto generado desde `localhost` no puede abrirse desde otro celular.
2. Migrar de archivos JSON a una base de datos con usuarios, transacciones y respaldos automáticos. Los JSON funcionan en una sola computadora y no son adecuados para varios procesos o producción.
3. Guardar en servidor la fecha, versión y cuenta que aceptó términos y aviso de privacidad. La casilla actual protege el flujo visual, pero no constituye historial de consentimiento.
4. Configurar respaldos cifrados y un plan de restauración probado para `data/db.json`, `data/usuarios.json`, `data/resenas.json` y `data/reembolsos.json`.
5. Sustituir pagos simulados por un proveedor de pagos que confirme pagos mediante webhooks en el servidor. Nunca aceptar una confirmación de pago desde el navegador.

### Prioridad media

1. Añadir segundo factor de acceso para dueño y empleados.
2. Registrar una bitácora de acciones administrativas, por ejemplo cambios de estado, moderación, reembolsos y reintentos de tickets.
3. Agregar límites de tamaño y retención para fotos de evidencia, más una rutina segura de eliminación según la política de privacidad.
4. Medir disponibilidad y errores del servidor con alertas, sin registrar contraseñas, tokens, códigos de entrega ni direcciones completas.
5. Revisar el aviso de privacidad con datos reales del responsable, contacto ARCO y domicilio antes de operar con clientes reales.

### Prioridad de experiencia

1. Mostrar en Reportes la causa resumida de cada ticket fallido sin revelar destinatarios.
2. Añadir filtros por sucursal y rangos de fecha a los reportes.
3. Hacer una prueba en celular con QR, GPS, código de entrega, ticket PDF y recuperación de contraseña antes de presentar el proyecto.

## Límites de esta auditoría

Esta revisión cubre el código y la configuración local disponibles el 23 de noviembre de 2026. No sustituye una prueba de penetración externa ni una revisión legal profesional. No se enviaron correos reales durante la auditoría.
