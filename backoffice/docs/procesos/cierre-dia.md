# Cierre de día · night audit

El proceso que convierte un hotel en una empresa auditable. Se ejecuta de madrugada, con el hotel parado, porque necesita que nadie esté entrando ni saliendo mientras cuenta.

Hace tres cosas que ningún otro proceso hace.

## 1 · Cobra la noche

El huésped no paga al entrar ni al salir: paga **cada noche que pasa**, y alguien tiene que cargarla. El cierre recorre los folios vivos y les suma la noche. Sin esto, una estancia de cinco noches aparecería cobrada de golpe el día que se va, y la producción del martes sería cero.

## 2 · Cierra el día

Mientras el día está abierto, la ocupación cambia según la hora a la que se pregunte. Una vez cerrado, la ocupación del martes es la ocupación del martes para siempre.

De ahí sale lo que importa de verdad: **el mes no se calcula, es la suma de días cerrados**. Si falta uno, el mes es una estimación.

## 3 · Produce las cifras

| Cifra         | Cómo sale                            | Qué dice                                  |
| ------------- | ------------------------------------ | ----------------------------------------- |
| **Ocupación** | ocupadas / vendibles                 | Cuánto se llenó                           |
| **ADR**       | alojamiento / noches vendidas        | A cuánto se vendió la noche media         |
| **RevPAR**    | alojamiento / habitaciones vendibles | Lo que rindió cada habitación, llena o no |

RevPAR = ADR × ocupación. Es la identidad que hace comparables dos hoteles distintos, y por eso es la cifra que se mira primero.

## La fecha operativa no es «hoy»

Es **el día siguiente al último cerrado**. Un hotel que no cerró el domingo sigue operando el domingo el lunes por la mañana, y esa diferencia es justo lo que el cierre obliga a resolver. Por eso la pantalla dice «día a cerrar» y no «hoy».

## Antes de cerrar

La revisión es una lista corta y cada línea dice su estado con glifo, color y palabra:

| Línea                         | Bloquea | Por qué                                                          |
| ----------------------------- | :-----: | ---------------------------------------------------------------- |
| Salidas del día sin registrar |   Sí    | O el huésped se fue o extendió. El cierre no puede adivinar cuál |
| Llegadas del día sin check-in |   No    | Es lo que el cierre resuelve: las marca **no-show**              |
| Habitaciones en casa          |   No    | Informativa: a cada una se le va a cargar la noche               |

Cuando algo bloquea, el botón se apaga **y dice por qué**. Un botón apagado sin motivo obliga a adivinar.

::: warning El no-show es dinero
Marcar no-show no es archivar una reserva: es lo que permite cobrar la primera noche de las garantizadas. Si el sistema no lo distingue de una cancelación limpia, ese ingreso no se cobra nunca y nadie lo echa de menos.
:::

::: tip Un día no se cierra dos veces
Ni se cierra un día que todavía no ha pasado. El cierre no se adelanta al calendario.
:::
