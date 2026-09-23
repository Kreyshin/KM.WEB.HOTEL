# El ciclo de limpieza

Cómo vuelve una habitación al circuito comercial.

## El recorrido

| Paso              | Quién      | La tarea           | La habitación                                                 |
| ----------------- | ---------- | ------------------ | ------------------------------------------------------------- |
| Check-out         | Recepción  | Se crea, pendiente | <span class="estado estado-sucia">Sucia</span>                |
| Empieza el repaso | Camarera   | En curso           | <span class="estado estado-reservada">En limpieza</span>      |
| Termina           | Camarera   | Por revisar        | <span class="estado estado-reservada">Por inspeccionar</span> |
| Aprueba           | Gobernanta | Terminada          | <span class="estado estado-limpia">Limpia</span>              |

Cada paso se da desde el tablero de housekeeping o desde la propia tarjeta del tablero de habitaciones. Son la misma realidad vista desde dos oficios.

## Sin inspección

En las sedes donde el parámetro de inspección está desactivado, la camarera cierra directamente y la habitación queda limpia en un paso menos.

## Lo que el ciclo no hace

Aprobar la limpieza **no vende la habitación**. Queda <span class="estado estado-libre">libre</span> y <span class="estado estado-limpia">limpia</span>, lista para que recepción decida.

Esa separación es la que permite que una gobernanta trabaje sin riesgo de comprometer inventario comercial sin saberlo.

## El caso que se escapa

Una habitación **libre y sucia** no la reclama nadie: no hay huésped dentro que proteste y no hay reserva que la espere ya mismo.

Por eso el tablero tiene el filtro **Requieren atención**, que recoge las que llevan más de dos horas así. Es el único aviso proactivo del circuito.
