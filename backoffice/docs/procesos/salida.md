# Una salida

El check-out es el gesto que más cosas encadena del sistema. Conviene saber qué dispara.

## El punto de partida

Minera Antares tiene dos habitaciones desde hace tres noches. Salen hoy, antes de las 12:00 según la política de la sede.

## 1 · Aparece en el parte

**Inicio** la cuenta entre las salidas, y el aviso lo recuerda: cada salida abrirá una tarea de limpieza.

## 2 · El check-out

Un botón en **Salidas de hoy** — o en la propia tarjeta del tablero, si lo hace quien está de paso.

En ese gesto, el sistema:

1. **Cierra la estancia** y calcula las noches consumidas.
2. **Carga el recargo por salida tardía**, si toca.
3. Deja la reserva en **salida**.
4. Libera la habitación: pasa a <span class="estado estado-libre">libre</span>.
5. **La marca <span class="estado estado-sucia">sucia</span>.**
6. **Crea la tarea de limpieza de salida**, de 45 minutos.

## 3 · La salida tardía

Irse a las 13:30 de una sede que entrega a las 12:00 no es gratis, pero tampoco es automático. Tres parámetros de la sede lo deciden, y se ajustan en [Configuración por sede](/modulos/configuracion):

| Parámetro                | Por defecto      |
| ------------------------ | ---------------- |
| Cobrar la salida tardía  | Sí               |
| Cortesía antes de cobrar | 30 min           |
| Cuánto se cobra          | 50 % de la noche |

La **cortesía** no es generosidad: sin ella, un ascensor lento convierte una salida normal en una discusión en el mostrador. Dentro de ese margen no se cobra nada.

El recargo se carga a los **consumos de la estancia**, no a una cuenta aparte, y por eso entra solo en la producción que suma el [cierre de día](/procesos/cierre-dia) sin que haya que acordarse de añadirlo en ningún sitio. El mostrador lo dice en voz alta al confirmar el check-out: un cargo que aparece después en la factura y nadie anunció es una reclamación en la puerta.

## 4 · El enlace con pisos

El paso 6 es el que sostiene la coordinación del hotel: **nadie tiene que avisar a nadie**. La tarea ya está en el tablero de housekeeping.

Y nace con la prioridad correcta: si esa misma habitación tiene una llegada hoy, entra como **alta** y sube al principio de la cola.

## 5 · Sigue el ciclo

A partir de ahí manda [el ciclo de limpieza](/procesos/limpieza).

::: tip Facturación
El cobro de la estancia y la emisión del comprobante SUNAT quedan fuera de esta versión: la ruta y los permisos existen, la pantalla está pendiente. Ver [Qué está listo](/guia/estado).
:::
