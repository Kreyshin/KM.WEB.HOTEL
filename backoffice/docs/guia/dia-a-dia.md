# El día del hotel

El sistema está ordenado como transcurre la jornada, no como se agrupan las tablas en una base de datos. Este es el recorrido.

## Temprano · el parte

Se abre **Inicio · El día de hoy**. En una sola franja aparece lo que gobierna la jornada:

- El porcentaje de **ocupación** sobre las habitaciones vendibles —las bloqueadas no cuentan, porque no se podían vender.
- Cuántos **llegan** y el ingreso que eso compromete.
- Cuántos **salen**, sabiendo que cada salida abrirá una tarea de limpieza.
- Cuántas habitaciones **esperan a pisos**, y los minutos de trabajo que suponen.

Debajo, tres columnas: llegadas, salidas y pisos. El día leído de izquierda a derecha.

## Media mañana · las salidas

Se van los huéspedes. Por cada check-out, el sistema hace tres cosas de una vez: libera la habitación, **la marca sucia** y **crea la tarea de salida** para pisos.

Ese automatismo es el enlace real entre recepción y housekeeping: nadie tiene que avisar a nadie. Si la habitación tiene una llegada ese mismo día, la tarea nace con prioridad **alta**.

## Mediodía · el hueco

El momento de más tensión del día: hay habitaciones sucias y gente que llegará a las tres.

**Housekeeping** reparte el trabajo en cuatro columnas —pendiente, en curso, por revisar, terminada— y muestra la carga de cada camarera en minutos, para repartir antes de que se acumule.

Mientras tanto, el **Tablero de habitaciones** se refresca solo. Quien pasa con el carro toca una tarjeta y avanza el estado sin abrir formularios.

## Tarde · las llegadas

**Recepción del día** lista quién llega. Al hacer el check-in se elige la habitación concreta, porque la reserva se vendió por tipo.

El desplegable solo ofrece las que están **limpias y libres**. Si no hay ninguna del tipo reservado, el sistema lo dice claro y hay dos salidas: pedir el repaso o reubicar en otro tipo.

## Noche · el cierre

Quedan las coberturas de las suites, los consumos cargados a las habitaciones y la revisión de lo que mañana sale.

Un vistazo a **Mantenimiento** cierra el día: qué sigue fuera de servicio y, por tanto, qué no se podrá vender mañana.
