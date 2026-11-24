# Acceso con Firebase y verificación por correo

Los clientes y las cuentas de personal creadas en Firebase utilizan su API oficial de correo y contraseña. Las dos cuentas locales del prototipo conservan el acceso descrito en ACCESO-PERSONAL.md. No se utiliza Google Authenticator ni SMS.

## Cliente

Al crear una cuenta se envía automáticamente un enlace de verificación al correo indicado. La pantalla permite reenviarlo después de un minuto. Abre el enlace desde tu correo, revisa spam si no aparece, regresa a la app y pulsa **Ya verifiqué mi correo**. El panel no se abre mientras Firebase indique que el correo no está verificado.

La confirmación se realiza una vez. Los siguientes accesos usan correo y contraseña. Esto comprueba la propiedad del correo y no es un segundo factor en cada inicio de sesión. Se necesita internet. Si pasa mucho tiempo y vence la sesión, cancela e inicia sesión de nuevo.

## Personal

Dueño y empleado entran con sus cuentas Firebase previamente autorizadas en la aplicación. Seleccionar un panel no concede permisos. El registro público solo crea clientes. No se crearon cuentas reales en tu nombre durante las pruebas.

## Código

- firebase-email.js: registro/acceso por API REST oficial, envío de VERIFY_EMAIL y comprobación al volver del correo.
- firebase-session.js: consulta accounts:lookup de Firebase y valida proyecto, UID y vigencia antes de aceptar la sesión. Exige emailVerified para clientes.
- school-demo.js y access.js: control de sesión y permisos; las rutas anteriores no permiten saltar la verificación.
- index.html y app.js: formulario y apertura del panel después de confirmar.

Los tokens solo se usan temporalmente en memoria. No se guardan contraseñas nuevas ni tokens en los perfiles. Pedidos, catálogo, direcciones y roles siguen en el prototipo: Firebase Authentication no los sincroniza entre dispositivos. Los roles locales no son custom claims y el modo navegador no sustituye autorización de servidor en producción.

Ejecuta INICIAR-TIZA-FOOD.cmd y utiliza http://localhost:3000 para el acceso por correo y el guardado en data/usuarios.json. Abrir index.html directamente no escribe archivos JSON y el formulario solicita usar el servidor. El flujo por correo no exige reCAPTCHA ni SMS. No se activó facturación ni se realizó un despliegue.

Si alguna cuenta llegó a inscribir MFA SMS en Firebase, su responsable debe retirar ese factor en Firebase para usar este flujo; cambiar el código no modifica los factores de las cuentas existentes. Las guías antiguas de SMS/Authenticator ya no corresponden al acceso activo.

La API solicita VERIFY_EMAIL al registrar o al entrar con un correo pendiente. La pantalla distingue una solicitud aceptada de un error de envío y permite reenviar después de un minuto. Si el token vence mientras se verifica el correo, se renueva usando el refresh token mantenido solo en memoria. El perfil pendiente se conserva aunque falle el correo. Si usuarios.json está dañado, se informa del error y se conserva el archivo.

Pruebas con respuestas simuladas: envío del enlace, bloqueo sin confirmar, acceso confirmado, errores y reintentos de envío, renovación de tokens y guardado en disco sin tokens ni contraseñas. No se enviaron correos reales durante las pruebas. Falta comprobar la entrega con una cuenta real del usuario.

Documentación oficial: https://firebase.google.com/docs/reference/rest/auth y https://firebase.google.com/docs/auth/limits

## Cookies y recordar sesión

El aviso permite aceptar o rechazar las cookies opcionales y volver a cambiar la elección desde Preferencias de cookies. No se carga analítica ni publicidad. Rechazar las opcionales no impide usar la aplicación. La elección se conserva en el navegador.

Todas las sesiones duran como máximo 1 hora desde el inicio de sesión, con o sin la casilla Recordar mi sesión. La actividad y las recargas no prolongan ese plazo. La casilla está desmarcada inicialmente; al marcarla permite conservar el acceso si se cierra el navegador, siempre dentro de la misma hora. Sin marcarla se utiliza una cookie temporal o el almacenamiento de la pestaña. Cerrar sesión elimina el acceso guardado. No se guardan contraseñas ni tokens Firebase.

Con Node se utiliza una cookie HttpOnly y SameSite=Strict: temporal sin la casilla y con Max-Age=3600 al marcarla. El servidor rechaza la sesión al cumplirse exactamente 1 hora. La pantalla vuelve al acceso cuando vence el plazo y también al recuperar el foco si la pestaña estaba suspendida. Las sesiones del servidor están en memoria; reiniciar Node obliga a entrar nuevamente. El modo navegador sigue siendo una demostración local, no autorización para producción.

## Recuperar contraseña

En el acceso de cliente, dueño o empleado pulsa Olvidé mi contraseña. Escribe el correo Firebase y solicita el enlace. La aplicación usa accounts:sendOobCode con requestType PASSWORD_RESET. Firebase envía el correo y aloja la página donde se establece la nueva contraseña; la app no solicita la contraseña anterior ni el código del enlace. Después se vuelve a iniciar sesión normalmente. El mensaje de confirmación no revela si el correo existe. Hay espera de un minuto entre solicitudes aceptadas y manejo de errores de red/cuota. No se cambia el rol ni se crea una sesión al recuperar la contraseña. Archivo: password-reset.js. Las pruebas usan respuestas simuladas, sin enviar correos reales.
