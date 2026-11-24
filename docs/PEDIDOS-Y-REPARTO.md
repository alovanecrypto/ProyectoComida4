# Pedidos y reparto

El empleado dispone de filtros con contadores: activos, pendientes, en preparación, listos para enviar, en camino, entregados y cancelados. Los pedidos esperan la confirmación del empleado; el reloj no los prepara ni despacha. Los botones son «Aceptar y preparar», «Marcar listo para enviar» y «Validar retiro y confirmar salida». Cada avance se valida y registra en el servidor. Se actualizan el panel y el seguimiento del cliente automáticamente.

Los reembolsos, decisiones y fotos son accesibles únicamente para el jefe y para el cliente titular de la solicitud, según la acción. El empleado ya no puede consultar ni decidir solicitudes. Las decisiones históricas se conservan.

## Tiempos estimados

| Productos | Preparación | Recorrido | Total |
| --- | --- | --- | --- |
| Bebidas, postres, dulces y botanas | 20 min | 10 min | 30 min |
| Hamburguesas, tacos, alitas, pollo y comida preparada | 30 min | 15 min | 45 min |
| Pizzas, combos y paquetes | 40 min | 20 min | 60 min |

Se toma el mayor tiempo de los productos del pedido, sin sumar cada unidad. El servidor deriva el tiempo del catálogo e ignora tiempos enviados por el cliente. Son estimaciones: la demora al aceptar o preparar puede aumentar el tiempo real. Ningún reloj ni señal GPS marca una entrega: se necesita el código del cliente.

## Dos códigos por pedido

El servidor genera dos códigos aleatorios distintos de cuatro dígitos. Se conservan los ceros iniciales y solo sirven para su pedido y su paso. El código de retiro se muestra únicamente en la pantalla privada del repartidor cuando está listo para enviar. El empleado lo recibe del repartidor y lo introduce en «Validar código y confirmar salida». Las API del panel no revelan ese código.

El código de entrega se muestra únicamente al cliente titular, dentro del seguimiento cuando está en camino. El cliente se lo dice al repartidor al recibir la comida. El repartidor lo introduce en su pantalla y el servidor registra Entregado, detiene el GPS y habilita las reseñas verificadas. El repartidor y el empleado no reciben este código por sus API.

Los códigos pendientes se guardan en el JSON privado del pedido y no en la URL del enlace. Una vez utilizados, se eliminan y solo se conserva la constancia de verificación. Cinco intentos incorrectos bloquean ese paso durante quince minutos. El contador y el bloqueo se guardan en JSON, incluso al reiniciar o renovar el enlace. El servidor impide saltarse la validación usando la ruta anterior de cambio de estado.

Los pedidos finalizados y cancelados conservan sus datos. A los anteriores todavía pendientes se les agregan los códigos una sola vez, sin cambiar sus importes ni su historial. Si ya estaban en camino, se conserva que el retiro ocurrió antes de este cambio; únicamente se exige el código de entrega.

Referencia de diseño: [OWASP Transaction Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html), sobre validación en servidor, autorización por operación, limitación de intentos y prevención de reutilización.

## GPS real

1. El empleado marca el pedido como listo y abre «Ver seguimiento y mapa».
2. Verifica el punto de entrega. Si solo había dirección escrita, pulsa «Marcar o corregir el punto de entrega», confirma el lugar con el cliente, selecciona el punto y guarda.
3. Genera el enlace privado del pedido y lo comparte manualmente con el repartidor. Generar otro invalida el anterior. El enlace dura dos horas y no permite administrar otros pedidos, cobros o reembolsos. El enlace abre la pantalla de reparto; no es un código de retiro ni de entrega.
4. El repartidor abre el enlace y muestra su código de retiro al empleado. Una vez validado y registrada la salida, puede pulsar «Compartir mi ubicación». El navegador solicita su permiso. Debe mantener abierta la pantalla; bloquearla o pasar a otra aplicación puede interrumpir las actualizaciones. Los códigos funcionan sin GPS; para activarlo sí se necesita el punto de entrega.
5. El empleado ve la ubicación recibida. El cliente solo recibe coordenadas y ve el mapa después de entrar en un radio de 300 m, con precisión reportada de 100 m o mejor. No equivale a contar tres calles exactas.
6. La cercanía por GPS solo sirve para el mapa. El repartidor entrega la comida, pide al cliente su código de entrega y lo verifica para completar el pedido. Estar junto al destino no sustituye el código.
7. Al terminar, detener la ubicación o perder señal durante 90 segundos, el cliente deja de recibir la posición. Solo se conserva la última ubicación en el JSON privado, no un historial de recorrido. El token se guarda como hash y no se devuelve por las API de pedidos. La app usa la ubicación que informa el navegador; no autentica el sensor ni impide que alguien falsifique una posición.

### Uso desde celulares

El código está preparado para recibir ubicaciones reales, pero el proyecto local no está publicado en internet. `localhost` en un celular apunta a ese celular, no a la computadora que ejecuta Tiza Food. Para un reparto entre equipos se necesita un servidor accesible por HTTPS, conexión a internet y permiso de ubicación del repartidor. No se publicó el proyecto ni se configuró un dominio con este cambio.

Si se publica detrás de un proxy HTTPS, configura en el entorno del proceso Node `TIZA_PUBLIC_ORIGIN=https://tu-dominio` y conserva correctamente el encabezado Host. La variable permite comprobar el origen HTTPS sin confiar en encabezados de proxy enviados por cualquier cliente. No es una clave ni se carga desde `.env` automáticamente.

La API de geolocalización requiere un contexto seguro y permiso del usuario: [especificación W3C](https://www.w3.org/TR/geolocation/). Las pruebas automatizadas usan posiciones ficticias; falta una prueba de campo con dos celulares en el servidor HTTPS definitivo.
