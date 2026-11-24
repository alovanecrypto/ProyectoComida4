# Chat y reembolsos con foto

Se integró el archivo recibido al servidor existente, sin abrir otro puerto ni instalar Express o Multer. Se utiliza fetch y la API REST de Gemini con imágenes en base64 y respuesta estructurada.

## Uso

Cliente: abre el chat → Solicitar reembolso → pedido entregado → producto → obtener código → escribirlo en un papel → foto del papel junto al producto y empaque → motivo → Enviar. “Mis solicitudes” consulta el JSON del servidor, incluso después de cerrar sesión. Cada renglón completo del pedido admite una solicitud; incluye todas sus unidades. Para solicitudes nuevas, el servidor calcula el **50% de lo pagado por el producto afectado**, después de descuentos y sin envío. No se acepta el importe, dueño ni estado enviados por el navegador. Las solicitudes anteriores conservan el importe con que se registraron.

Al aprobar una solicitud nueva se genera un cupón personal del **10% en comida para un siguiente pedido**, de un solo uso y sin combinar con otros cupones. Se comparte un mismo cupón entre solicitudes del mismo pedido para no duplicar el beneficio. El código se comunica por el chat y se aplica en el campo de cupón del siguiente pedido. La autoría y el uso se validan otra vez en el servidor al confirmar. Se consume al crear el pedido, aunque después se cancele. El registro de uso se guarda junto con el pedido en `data/db.json`, dentro de `compensationUses`, y se conserva aunque el historial visible se limite a 500 pedidos. Ese registro no es público.

El chat consulta cambios cada 15 segundos mientras la cuenta esté abierta y la pestaña visible, y también al recuperar el foco. El resultado y los cambios del personal del restaurante generan un mensaje y una notificación, sin repetir el mismo aviso en ese navegador. Los estados permanecen en el servidor aunque cierres la app.

Empleado: entra a Panel del empleado → Reembolsos para revisar la evidencia, aprobar o no aprobar con una nota. Para transferencias u otras devoluciones manuales, una aprobación queda pendiente de devolución. Tras devolver el dinero fuera de la app, registra la referencia. En las solicitudes nuevas de pagos con tarjeta del prototipo o marcados como demo, aprobar registra automáticamente la devolución simulada del 50% y el mensaje lo indica expresamente. La app no tiene pasarela de cobro ni de devolución.

## Activar Gemini

1. Obtén una clave propia en Google AI Studio. No es la clave de Firebase.
2. Copia `.env.example` como `.env` junto a `server.js` y completa `GEMINI_API_KEY` localmente. No compartas ese archivo ni lo subas a Git.
3. Opcionalmente cambia `GEMINI_MODEL` por un modelo con visión y salida JSON disponible en tu proyecto. Predeterminado: `gemini-2.5-flash`.
4. Reinicia el servidor. Si no configuras la clave, el chat mantiene respuestas locales y las fotos quedan para revisión manual. Si Google falla, la solicitud ya está guardada y pasa a revisión.

La foto se envía a Google solo si hay clave configurada. El formulario avisa antes de enviarla. Solo se envían el nombre del producto, la cantidad, el motivo, el código esperado y la imagen; no se envía el correo ni la dirección del pedido. No se envían datos de tarjeta.

El análisis automático solo aporta observaciones: nunca aprueba ni rechaza. El personal del restaurante toma la decisión final, incluso si el análisis indica daño con confianza alta. Antes de aprobar solicitudes nuevas, debe confirmar tres puntos: código exacto legible en la foto, producto y empaque correspondientes y foto suficientemente clara. Si falta evidencia puede usar Pedir otra foto e indicar qué corregir. El cliente selecciona el mismo producto, obtiene un código nuevo y vuelve a enviar: se actualiza la solicitud original, sin duplicar importes ni cupones.

## Persistencia y acceso

`data/reembolsos.json` contiene solicitudes, fotos privadas, análisis y decisiones. Se escribe mediante archivo temporal y renombrado. Un JSON dañado produce error sin reemplazarlo vacío. No borres este archivo al actualizar. El JSON completo, `.env` y las carpetas privadas no se sirven por HTTP. La foto individual requiere sesión del autor o del personal autorizado; otros clientes no pueden verla. Se limita el tamaño de imagen y la frecuencia de solicitudes.

El historial visual del chat sigue siendo local a cada cuenta/navegador. Las solicitudes y sus estados sí permanecen en el JSON y se consultan al iniciar sesión desde otro navegador conectado al mismo servidor.

Documentación usada: [imágenes en Gemini](https://ai.google.dev/gemini-api/docs/generate-content/image-understanding) y [salidas estructuradas](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).

## Código y fotos repetidas

El código es específico de la cuenta, pedido y producto; vale dos horas y se consume al enviar la evidencia. Se guarda en evidenceCodes dentro de data/reembolsos.json y sobrevive al reinicio. Los códigos expirados o de otra cuenta/producto se rechazan. El personal del restaurante comprueba visualmente que el código aparece junto al producto y al empaque; la app no promete verificarlo automáticamente ni garantizar autenticidad.

Se calcula SHA-256 de los bytes de la foto recibida en el servidor para rechazar archivos idénticos ya usados, incluso por otras cuentas o en versiones anteriores de una solicitud. También se comparan solicitudes anteriores que aún no tenían huella guardada. No se revelan datos de la solicitud original al cliente. Esto no detecta todas las fotos editadas o recortadas: el personal del restaurante revisa la evidencia. El historial guarda huellas y observaciones; la imagen actual reemplaza la anterior cuando se pide otra foto.

## Devolución del dinero y conservación del producto

La solicitud aprobada compensa el 50% de lo pagado por el producto afectado, descontadas las promociones y sin envío. El cliente conserva el producto; no debe entregarlo de vuelta. Esto se informa antes de enviar la solicitud, en el mensaje de resultado y al empleado.

Si el pago fue con tarjeta, el destino previsto es la misma tarjeta del cobro original. Solo se muestra y conserva su terminación de cuatro dígitos cuando está disponible. No se solicitan de nuevo el número completo ni el CVV para devolver dinero. Los pagos con tarjeta actuales son de demostración: la aprobación únicamente registra una devolución simulada, sin depósito real. Integrar una pasarela y guardar el identificador del cobro sería necesario para efectuar reembolsos bancarios reales; no basta con guardar los últimos cuatro dígitos. Referencia técnica: https://docs.stripe.com/refunds

Las transferencias reales se coordinan manualmente y el empleado registra su referencia tras realizarlas. Una transferencia marcada como demostración no devuelve dinero real.

## Saldo a favor por pagos en efectivo

Al aprobar una solicitud nueva de un pedido pagado en efectivo (o enteramente con saldo), se abona el 50% como crédito interno a la misma cuenta. El abono se guarda una sola vez en walletCredit dentro de la solicitud de data/reembolsos.json, junto con su estado y la decisión del empleado. No es una devolución física de efectivo ni un depósito bancario. Las devoluciones manuales ya completadas anteriormente no se convierten en nuevos abonos.

El cliente ve el saldo en Mis datos y al preparar el pedido. Puede marcar Usar mi saldo a favor: primero se aplica el cupón, después el saldo. Si queda una diferencia se paga en efectivo; si cubre todo, no se solicita efectivo ni tarjeta. Si sobra saldo permanece disponible para futuras compras. Para pagar con tarjeta o transferencia se debe desmarcar el saldo en esta versión.

El gasto se registra en walletTransactions dentro de data/db.json en la misma escritura atómica que el nuevo pedido. Se valida el saldo actual y el importe que el cliente vio antes de confirmar; si cambió en otra pestaña, se rechaza la confirmación para que el cliente revise el nuevo importe. El servidor ignora saldos e importes inventados por el navegador. El historial de movimientos es privado y se conserva aunque se recorten los 500 pedidos visibles.

Si se cancela un pedido que usó saldo, se descuenta primero el cargo de cancelación existente (20% del total del pedido) de ese saldo usado. Solo el resto vuelve al saldo. Si el saldo usado no cubre el cargo, el cargo restante queda pendiente en efectivo. Cada restitución se registra una sola vez junto con la cancelación. La pantalla indica el saldo efectivamente restituido.

## Demostración con flujo de pago completo

Todos los pedidos nuevos guardan payment.demo=true. La tarjeta, el efectivo, la transferencia y el saldo se presentan como operaciones de demostración: no se hace ningún cobro ni devolución bancaria real. Los abonos y movimientos de saldo también se marcan como simulados, conservando importes, estados, referencias y comprobantes para representar un flujo real. El saldo virtual solo tiene efecto en esta instalación de Tiza Food.

## Presentación de la interfaz

El cliente ve Saldo a favor y Reembolso aprobado sin avisos repetidos de demostración. El chat muestra importe, destino, conservación del producto y cupón con texto breve. Las observaciones técnicas del análisis se reservan al panel del personal. Los mensajes antiguos de solicitudes en el navegador se actualizan a este formato al consultar el estado; no se borran los mensajes escritos por el cliente.

La operación sigue siendo simulada: se conservan payment.demo, paymentMode y las referencias internas originales, sin ejecutar operaciones bancarias. Acerca de esta versión, en Mis datos, informa que es una versión de prueba. Una aprobación de tarjeta se presenta como aprobada, sin afirmar que hubo un depósito real. Las referencias internas SIMULADO se presentan como RF en los comprobantes visibles.
