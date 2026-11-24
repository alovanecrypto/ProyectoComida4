# Tiza Food

Proyecto escolar de pedidos de comida con paneles de cliente, dueño y empleado. Los clientes usan Firebase Authentication y confirman su correo mediante un enlace. Las cuentas de personal creadas desde el panel usan Firebase; las dos cuentas locales del prototipo se describen en ACCESO-PERSONAL.md. Se necesita internet para el acceso con Firebase; la aplicación actual no usa Google Authenticator ni códigos QR.

## Abrir el proyecto

1. Descarga o clona este repositorio completo.
2. Ejecuta INICIAR-TIZA-FOOD.cmd. Cuando el servidor esté listo se abrirá http://localhost:3000. Mantén esa ventana abierta y utiliza conexión a internet. Consulta GUIA-FIREBASE.md.
3. Registra una cuenta de cliente, abre el enlace recibido por correo y pulsa Ya verifiqué mi correo. Los siguientes accesos piden correo y contraseña.
4. Para entrar como dueño o empleado utiliza una cuenta Firebase autorizada para ese rol. Consulta GUIA-FIREBASE.md.

Con el servidor, los perfiles se guardan en data/usuarios.json, los pedidos en data/db.json y las reseñas verificadas en data/resenas.json. Las reseñas se comparten entre todas las cuentas que usan ese servidor y permanecen al cerrar sesión o reiniciarlo. Firebase Authentication no sincroniza estos archivos entre computadoras.

## Reseñas de compras entregadas

Solo un cliente con un pedido marcado como Entregado puede reseñar los productos de ese pedido. En Mis pedidos aparece Reseñar productos y el formulario ofrece únicamente compras entregadas que todavía no tienen una reseña de esa cuenta. También puede abrirse desde el producto o la sección de reseñas. Se admite una reseña por cuenta y producto, con 1 a 5 estrellas y un comentario de 5 a 220 caracteres. Los pedidos recibidos, en preparación, en camino o cancelados no habilitan reseñas. La API vuelve a comprobar la propiedad, el producto y la entrega; modificar el formulario no evita la validación.

data/resenas.json conserva las reseñas de productos y las calificaciones de entregas. La API pública muestra nombre abreviado, producto, estrellas, comentario y fecha, sin correo ni folio. Solo el autor puede eliminar su reseña de producto. La app espera la confirmación del servidor antes de mostrar una publicación como guardada y no mezcla comentarios de la caché local de otras cuentas.

Al crear resenas.json, las reseñas anteriores que puedan vincularse con una compra entregada se conservan como verificadas. Los ejemplos y registros que no se puedan verificar permanecen en legacyReviews como historial privado y dejan de aparecer en la lista pública. El archivo db.json original se conserva. La visualización y los promedios usan las reseñas verificadas del servidor.

## Servidor Node y guardado en JSON

Si tienes Node.js instalado, ejecuta en esta carpeta:

```sh
node server.js
```

Abre http://localhost:3000. En el primer inicio se crean db.json y usuarios.json a partir de los ejemplos sin datos personales. Si esos archivos ya existen, se conservan. En este modo, los datos del restaurante están en el servidor local.

El registro y el acceso de clientes consultan la API de Firebase. Si el correo no está confirmado, se guarda el perfil como pendiente y se solicita automáticamente el enlace. Si Firebase rechaza el envío, la pantalla muestra el error y permite reintentar sin perder el perfil. La sesión se abre solo después de comprobar la confirmación con Firebase. No se guardan contraseñas ni tokens en los perfiles.

Abrir index.html directamente es una demostración en el navegador y no puede escribir data/usuarios.json. El formulario muestra cómo abrir el servidor y exige ese modo para el registro y acceso de clientes. Las dos cuentas locales del personal conservan el acceso descrito en ACCESO-PERSONAL.md; al usarlas con el servidor también se guarda su perfil en JSON.

## Trabajar en equipo

En VS Code abre esta carpeta, crea una rama para cada cambio y envía un pull request para revisarlo. Antes de editar, actualiza tu copia con los cambios del equipo.

Cada integrante usa su propia cuenta de GitHub. Para un repositorio privado, el propietario invita a sus compañeros desde Settings → Collaborators. No compartan la contraseña de GitHub o de Google.

## Qué se publica

El .gitignore excluye usuarios.json, db.json, tickets generados, archivos .env, claves de servicio y dependencias instaladas. Se incluyen db.example.json y usuarios.example.json sin cuentas ni pedidos reales.

La configuración web de firebase-config.js identifica el proyecto Firebase. No es una cuenta de servicio ni concede acceso administrativo a la consola. Las credenciales de los usuarios no se incluyen en ese archivo.

GitHub guarda el código y su historial. Publicar el repositorio no publica automáticamente la web ni comparte los datos del restaurante.

## Alcance escolar

La autorización y los perfiles del modo index.html pertenecen al prototipo local. Para un despliegue de producción se necesitaría un servidor que validara los permisos y una base de datos compartida con reglas de acceso.

Documentación de integración: GUIA-FIREBASE.md.

## Horarios del restaurante

En Panel del dueño → Horarios configura los siete días y activa el horario. Antes de activarlo, los pedidos siguen disponibles para conservar el funcionamiento anterior. Se utiliza America/Mexico_City. Los intervalos son del mismo día (sin cruce de medianoche). El cierre es exclusivo: a la hora de cierre ya no se aceptan pedidos nuevos. Un día puede marcarse Cerrado. Si todos están cerrados, no hay próxima apertura. El cliente ve el estado y la próxima apertura; se actualiza cada 30 segundos y al volver a la ventana. La API vuelve a validar el horario al confirmar. El cierre no impide gestionar o cancelar pedidos existentes según sus reglas normales.

En el modo local, los horarios se guardan en ese navegador igual que el catálogo. No se sincronizan entre dispositivos por Firebase Authentication.

## Notificaciones de pedidos

En la demostración escolar, el servidor avanza los pedidos automáticamente: En preparación a los 6 segundos, En camino a los 36 y Entregado a los 96 desde que se confirma el pedido. Cada cambio queda guardado con su hora en data/db.json. La pantalla consulta el servidor cada cinco segundos y recupera el estado al volver a abrirse; las reseñas se habilitan cuando el servidor ya guardó Entregado. Las etapas automáticas son una simulación, no una confirmación de entrega física.

Si el dueño o un empleado avanza un pedido, ese pedido pasa a seguimiento manual y la demostración no vuelve a modificarlo. Los pedidos cancelados o finalizados no cambian. Para trabajar exclusivamente con estados del personal se puede iniciar el servidor con TIZA_DEMO_TRACKING=0. Los tiempos del historial corresponden a cada etapa; las etapas futuras de la demostración se muestran como estimadas.

El cliente recibe un aviso dentro de la app cuando cambia el estado de un pedido conocido. La campana muestra los avisos sin leer y permite consultar o borrar los últimos 50. Al abrirla se marcan como leídos. El historial se guarda por correo en ese navegador. La primera carga establece la referencia y no genera avisos para todos los pedidos antiguos. Un cambio posterior, incluso al volver a entrar, se detecta comparando el último estado conocido. Si hubo varios cambios entre consultas se informa del estado más reciente.

La consulta se realiza cada cinco segundos y al recuperar el foco. Se necesita tener la app abierta y conexión al servidor cuando se utiliza Node. En el modo local solo se reflejan datos del mismo navegador, como el resto del prototipo. Firebase Authentication no sincroniza los pedidos ni envía estas notificaciones; no son SMS, correos ni notificaciones push con la app cerrada.


## Revisión final e instrucciones de entrega

Antes de guardar un pedido, la app muestra productos, cantidades editables, subtotal, cupón, envío, total, dirección e instrucciones, y método de pago. Se puede volver a corregir dirección/instrucciones o elegir otro pago. Solo el botón Confirmar pedido guarda el pedido. Si aumenta la cantidad y el efectivo ya no alcanza, se solicita corregir el pago.

Las instrucciones son opcionales, tienen un máximo de 300 caracteres y se conservan con cada pedido. El personal las ve junto a la dirección y aparecen en el ticket. La regla compartida las valida y conserva escapadas al mostrarlas.


## Código postal con Postali

En el registro de clientes, al completar cinco dígitos se consulta https://postali.app/api/v1/mx/cp/{codigo}. Se envía solo el código postal. Estado y municipio se completan, y colonia se elige de los asentamientos devueltos; si solo existe una se selecciona automáticamente. Calle y número se escriben manualmente. Se conserva el orden original de los campos. Si falla la red, vence la consulta o no hay resultados, se permite captura manual. También hay un botón para corregir manualmente los datos. Cambiar el código cancela solicitudes anteriores para evitar resultados cruzados. Requiere internet y disponibilidad de Postali; Firebase no realiza esta consulta.

Datos de códigos postales: Postali (https://postali.app/api), servicio independiente que documenta uso gratuito, sin clave ni registro. No se incluye ningún token privado.
