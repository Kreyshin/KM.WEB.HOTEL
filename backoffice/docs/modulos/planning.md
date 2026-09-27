# Planning · el rack

Habitaciones en filas, noches en columnas. Es la pantalla con la que piensa una
recepción, y la que distingue un PMS de una lista de reservas.

::: tip El tablero y el rack no compiten
El **[tablero](/modulos/tablero)** responde _«¿cómo está el hotel ahora?»_. El
**rack** responde _«¿cómo está el hotel la semana que viene?»_. De la segunda
pregunta salen el overbooking, los cambios de habitación y las ventas de última
hora, y no se puede contestar mirando el día de hoy.
:::

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
