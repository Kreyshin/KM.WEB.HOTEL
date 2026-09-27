# Alojamiento

Todo lo que existe físicamente y lo que se publica para vender.

## Habitaciones

El registro de lo que el hotel **tiene**. El tablero contesta «¿qué pasa ahora?» y el plano «¿dónde está?»; esta pantalla contesta **«¿qué habitaciones existen y qué se sabe de cada una?»**.

### Las cifras del inventario

No son las de la jornada: son las que se miran al planificar.

| Cifra                 | Qué dice                                                              |
| --------------------- | --------------------------------------------------------------------- |
| Habitaciones          | Cuántas existen en la sede                                            |
| Vendibles hoy         | Las que no están bloqueadas                                           |
| Ocupación             | Ocupadas sobre vendibles                                              |
| Fuera de servicio     | La que más duele: cada una es una habitación que no se vende          |
| Sin sitio en el plano | Existe en el listado pero no aparece en la planta: nadie la encuentra |

### Alta, edición y baja

Una habitación se da de alta con lo que no cambia de un día para otro: **número** (único en la sede), **piso**, **tipo** —de donde salen la tarifa base, el aforo y el régimen—, **vista**, **habitaciones comunicadas**, **nota** y su **posición en el plano**.

Los dos estados no se editan en el alta. La habitación nace libre y limpia, y a partir de ahí los mueve la operación: recepción la ocupa, housekeeping la limpia.

::: tip Las comunicadas son dinero
Dos habitaciones unidas por puerta interior se venden juntas a una familia. Sin registrarlo, la recepción lo sabe de memoria y esa información se pierde el día que cambia la persona del mostrador.
:::

::: warning Una habitación con historia no se borra
Si alguien durmió ahí, el número aparece en su factura, en el Registro de Huéspedes y en la producción del mes. Borrarla dejaría esos documentos apuntando al vacío, así que el sistema se niega y lo dice con el motivo: _«La habitación 101 tiene estancias en el histórico. Bloquéala en vez de borrarla.»_

Para sacarla del inventario está **bloqueada**, que es reversible y deja constancia del porqué. Al borrar una que sí se puede, deja además de figurar en las comunicadas de las demás.
:::

### Qué se ve y qué no se toca

El maestro dice lo que la habitación **es**. Lo que está **haciendo** —sucia, en
limpieza, quién la limpia hoy, quién duerme dentro— se lee aquí de un vistazo,
pero se mueve donde está el trabajo:

| Se lee aquí                      | Se cambia en |
| -------------------------------- | ------------ |
| Estado de limpieza               | Housekeeping |
| Camarera del turno               | Housekeeping |
| Quién está dentro y desde cuándo | Recepción    |

Hubo un tiempo en que esta pantalla también avanzaba la limpieza y repartía el
turno. Salieron dos rótulos para el mismo paso —«Empezar limpieza» aquí,
«Empezar» allí— y, peor, dos verdades sobre quién limpia el 203: el responsable
estaba guardado en la habitación **y** en la tarea, y asignarlo desde el maestro
dejaba la tarea apuntando a otra persona. Ahora vive solo en la tarea; la ficha
de la habitación lo deriva de la tarea abierta y ofrece un enlace a Housekeeping.

### Por qué no tiene activo/inactivo

El resto de catálogos se activan y desactivan. Una habitación no: su eje es **bloqueada**, que es un estado de ocupación con su motivo y su fecha. Darle además un `activo` duplicaría el estado y crearía la pregunta de cuál de los dos manda. Por eso `KmCatalogo` admite ahora `sin-estado`.

### Colocar en el plano

El segundo modo de esta pantalla. Se elige la planta y **se arrastra cada habitación a su sitio**; las flechas la mueven con el teclado y `Shift` la mueve de cuatro en cuatro, porque ningún gesto puede ser solo de arrastre. Se alinean solas a una rejilla invisible, así que el plano queda recto sin pelearse con él.

Lo que se coloque aquí es lo que verá el **tablero** en su lente de plano.

::: info Por qué está aquí y no en una pantalla aparte
Había un «Plano por piso» que pintaba exactamente lo mismo que el tablero —llamaba al mismo servicio— pero sin ninguna acción encima: era el tablero con los botones quitados. Y la posición solo se podía teclear como dos porcentajes en el alta, que es algo que nadie en un hotel va a hacer.

El plano tenía dos oficios y no cumplía ninguno, así que cada mitad se fue a donde sirve: **operar sobre el espacio** es una lente del tablero, y **colocar el inventario** es mantenimiento del inventario, o sea, esta pantalla.
:::

## Tipos de habitación

**Lo que se vende.** Cada tipo define:

| Campo            | Para qué sirve                                                    |
| ---------------- | ----------------------------------------------------------------- |
| Código           | El atajo de recepción: `DBL`, `SUI`                               |
| Capacidad        | Huéspedes sin cama supletoria                                     |
| Capacidad máxima | Con supletoria o cuna. **El sistema no deja reservar por encima** |
| Camas            | Lo que el huésped quiere saber antes de reservar                  |
| Tarifa base      | El precio de referencia, antes de temporada y canal               |
| Régimen          | Qué comida incluye                                                |
| Servicios        | Amenities y equipamiento de la ficha comercial                    |

::: warning Antes de borrar un tipo
No se puede eliminar si existen habitaciones de ese tipo o reservas futuras. Desactívalo: deja de publicarse, pero conserva su histórico.
:::

## Pisos

Las plantas de la sede. Ordenan el plano y reparten el trabajo de housekeeping. Admiten niveles negativos para sótanos.

## La vista de tipos

Un tipo de habitación es **lo que el hotel vende**, y una fila de tabla no deja
imaginarlo: la diferencia entre una _doble_ y una _twin_ no está en el nombre,
está en si hay una cama o dos.

Por eso la pantalla se abre en **tarjetas**, cada una con un plano en miniatura
deducido de su configuración de camas, el aforo, el régimen incluido, los
amenities y la tarifa. Se ve de un vistazo lo que se está vendiendo.

La tabla sigue a un clic, en el interruptor de la derecha, para quien viene a
buscar un tipo concreto en lugar de a mirarlos. El sistema recuerda la
elección.
