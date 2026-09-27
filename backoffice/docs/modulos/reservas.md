# Reservas

Una sola pantalla de control, con dos lentes sobre lo mismo.

Antes eran dos: un **rack** que solo se miraba y una **tabla** que solo consultaba, y ninguna de las dos sabía crear una reserva. Son la misma cosa vista de dos maneras, así que viven juntas y comparten lo que importa: **la ficha y el alta**.

## Las dos lentes

| Lente     | Qué enseña                                          | Para qué sirve                                   |
| --------- | --------------------------------------------------- | ------------------------------------------------ |
| **Rack**  | Habitaciones en filas, noches en columnas           | Vender, recolocar, ver el hueco                  |
| **Lista** | Las reservas como registros, con búsqueda y filtros | Encontrar una concreta, medir por canal o estado |

::: warning El alcance de cada lente es distinto, y se dice en pantalla
El rack enseña una ventana de **catorce noches** desde una fecha; la lista busca en **todo el libro**, sin límite de fechas.

Fingir que comparten un filtro haría que cambiar de lente cambiase en silencio lo que se está mirando, que es el fallo clásico de este tipo de pantalla. Por eso hay una línea debajo del conmutador que dice exactamente qué se está viendo.
:::

## Crear una reserva

Hay **un solo formulario** con tres puertas de entrada, y eso es lo que evita que existan tres formas distintas de dar de alta lo mismo:

1. **Barriendo noches libres en el rack.** La habitación, las fechas y la tarifa ya vienen puestas; solo falta el huésped. Es el camino del mostrador.
2. **Con el botón «Nueva reserva».** No hay nada marcado, así que pregunta el tipo y las fechas. Es el camino de quien llama por teléfono para dentro de tres meses, al que el rack no llega sin navegar doce semanas.
3. **Desde la ficha de una reserva existente**, para editarla.

### Reserva por tipo, sin habitación

Lo normal en un hotel es vender **una doble**, no la 203. Desde el botón se elige el tipo y la habitación queda por asignar: la reserva aparece en la banda **«Sin habitación asignada»** del rack hasta que alguien le dé una llave, y en la lista se lee _«sin habitación asignada»_.

### La tarifa se propone resuelta

Se calcula con la **tarifa base del tipo**, el **factor de la temporada** y el **ajuste del canal**, en ese orden. Es el número que el recepcionista dice por teléfono, así que no hay que ir a buscarlo — y se vuelve a resolver si cambia cualquiera de los tres ingredientes. Se puede pactar otro precio encima.

## Cómo se lee

El eje de tiempo **es la navegación**, no un filtro: se avanza y se retrocede
por semanas, y _Hoy_ vuelve al presente.

| Elemento                | Qué dice                                                      |
| ----------------------- | ------------------------------------------------------------- |
| Columna fija            | Número de habitación y tipo, agrupadas por planta             |
| Columnas tintadas       | Sábado y domingo: la ocupación de un hotel se lee por semanas |
| Línea turquesa vertical | Hoy, cruzando el rack entero                                  |
| Filas rayadas           | Fuera de servicio: no se venden, y se ve que no se venden     |
| Pie                     | Ocupación por noche, sobre las habitaciones vendibles         |

## Las barras

Una reserva es una barra que **empieza a media casilla y termina a media
casilla**, porque una entrada es por la tarde y una salida por la mañana. Ese
medio hueco es lo que permite ver que una habitación se libera y se vuelve a
vender el mismo día.

| Barra                    | Estado                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| Turquesa, borde punteado | <span class="estado estado-reservada">◷ Pendiente</span> — contratada, sin confirmar     |
| Azul llena               | <span class="estado estado-libre">◆ Confirmada</span> — el huésped todavía no ha llegado |
| Verde llena              | <span class="estado estado-limpia">● En casa</span> — hay alguien durmiendo ahí          |

Si la estancia empieza antes del tramo visible o termina después, la barra se
**corta en recto** por ese lado: el borde dice «esto sigue» sin tener que leer
fechas.

## Sin habitación asignada

Arriba del todo, en su propia franja, lo que se vendió **por tipo** y aún no
tiene llave. Es lo normal en un hotel —se reserva «una doble», no la 203— y
deja de serlo cuando el huésped está en la puerta: por eso está a la vista y no
escondido en un filtro.

## Los tres gestos

El rack no es un calendario que se consulta: es el control con el que se
trabaja. Todo lo que una recepción hace con una reserva —moverla, alargarla,
venderla— se hace aquí, con el dedo, sin abrir un formulario.

### Mover: arrastrar el cuerpo de la barra

Se coge la barra y se suelta donde toque. **Arriba y abajo** cambia de
habitación; **a los lados**, de fecha; una diagonal hace las dos cosas de un
tirón, que es como se resuelve de verdad una reubicación.

Mientras se arrastra, la fila de destino se ilumina —**turquesa** si cabe,
**roja** si no— y la barra se pinta rayada cuando el movimiento no es válido.
El motivo se dice al soltar, con nombre y apellidos: _«La 101 ya la tiene
Fernández esas noches»_.

### Alargar o acortar: tirar de los bordes

Los dos extremos de la barra son asas. El **izquierdo** mueve la entrada; el
**derecho**, la salida. Prolongar una noche es la operación más frecuente de un
mostrador, y sin asas obligaría a abrir una ficha para cambiar una fecha.

### Vender: barrer las noches libres

Arrastrando sobre las casillas vacías de una habitación se marca un tramo y
**se cierra la venta ahí mismo**. El rack ya sabe la habitación, las fechas y
la tarifa —resuelta con su temporada y su canal—; lo único que pregunta es
quién duerme ahí, y admite darlo de alta sin salir.

::: warning El documento se pide desde el principio
Aunque el huésped se dé de alta con prisa, el documento es obligatorio: es uno
de los campos que la norma peruana exige en el **Registro de Huéspedes**.
Dejarlo para después significa perseguirlo el día del check-out.
:::

## Las reglas que el rack no deja saltarse

Se comprueban dos veces a propósito: en el navegador mientras el dedo se mueve,
para poder pintar el veto en el acto, y en el servicio al soltar, que es donde
mandan. Un rack que solo avisa después de soltar obliga a deshacer, y deshacer
en un rack es reordenar el hotel.

| Regla                                                           | Por qué                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------- |
| Una habitación **fuera de servicio** no admite reservas         | No se vende lo que no se puede entregar                       |
| Dos reservas no comparten noche en la misma habitación          | La doble venta se descubre en el mostrador y cuesta mucho más |
| A quien **ya hizo el check-in** no se le mueve la entrada       | Durmió aquí anoche; solo puede cambiar hasta cuándo se queda  |
| Una estancia **cerrada, cancelada o no presentada** no se mueve | Ya se facturó y ya está en el Registro de Huéspedes           |
| Una reserva dura **al menos una noche**                         | La unidad que se vende es la noche                            |

Cuando una reserva no se puede mover, su barra se ve más apagada y pierde las
asas: se mira, no se toca.

## La ficha al pasar por encima

Al posar el puntero sobre una barra sale una ficha con lo que se pregunta por
teléfono: noches, entrada, salida, huéspedes, tarifa por noche y canal. Sale a
los 140 ms —antes de que dé tiempo a dudar— y se coloca debajo de la barra
cuando la fila está muy arriba para caber encima.

Es información, no un aviso: aparece sin animación de entrada y no roba el
foco.

::: info Nada depende de arrastrar
Los tres gestos tienen su equivalente en el panel lateral de la reserva, que se
abre con un clic. Un rack que solo se maneja arrastrando deja fuera a quien no
puede arrastrar.
:::

## Los canales

De dónde viene la reserva importa, porque cambia el precio y la forma de trabajarla.

| Canal       | Particularidad                                |
| ----------- | --------------------------------------------- |
| Directo     | Sin comisión. El margen bueno                 |
| Teléfono    | Igual que directo, tecleado en el mostrador   |
| Web propia  | Suele llevar un pequeño ajuste                |
| Booking.com | Comisión. Llega por integración, no se teclea |
| Expedia     | Igual que la anterior                         |
| Corporativo | Tarifa pactada, casi siempre a la baja        |

## Anticipos y garantías

Una reserva **pendiente** es la que aún no tiene garantía. Es la que puede caerse, y por eso el sistema la distingue de una confirmada: no es lo mismo para la ocupación prevista del día.

El anticipo cobrado, si lo hay, aparece bajo la tarifa por noche.

## Cancelaciones y no-shows

Ambas liberan la habitación que estuviera comprometida.

- **Cancelación**: se anuló antes de llegar. Se pide el motivo, que queda en la reserva.
- **No show**: no se presentó. Suele cobrarse la primera noche.

::: warning Una reserva con gente dentro no se cancela
Si el huésped ya hizo el check-in, hay que hacer el **check-out**. Cancelar dejaría una habitación ocupada sin reserva que la explique.
:::
