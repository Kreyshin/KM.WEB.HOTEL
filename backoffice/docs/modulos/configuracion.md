# Configuración

Lo que se toca una vez y condiciona el resto.

## Sedes

Los establecimientos de la cadena. Además de dirección y teléfono, dos datos que pesan cada día:

- **Hora de check-in** — a partir de cuándo se entrega la habitación. Marca el plazo de housekeeping.
- **Hora de check-out** — hasta cuándo puede quedarse el huésped. De ahí cuelga el cobro por salida tardía.

El **código de establecimiento** de cuatro dígitos es el que se declara ante SUNAT, y no puede repetirse entre sedes.

### La dirección termina en un ubigeo

El distrito no se escribe: se elige en cascada —**departamento → provincia → distrito**—, y lo que se guarda es el **código de ubigeo** del INEI, seis dígitos donde los dos primeros son el departamento, los dos siguientes la provincia y los dos últimos el distrito. `150122` ya dice «Lima / Lima / Miraflores» sin consultar nada, y es el mismo código que piden SUNAT y los formularios de hospedaje.

Tres razones para la cascada y no un campo de texto:

- Hay distritos homónimos en departamentos distintos. «San Juan» sin más no identifica nada.
- Escrito a mano, la misma sede acaba en «Miraflores», «miraflores» y «MIRAFLORES», y ningún informe agrupa.
- El código es lo que viaja a la declaración. Un nombre no sirve.

Los tres nombres **no se guardan**: se derivan del código al leer. Por eso buscar «Barranco» o «Cusco» en el listado encuentra la sede aunque el distrito ya no sea un campo suyo.

El padrón vive en el núcleo, no en la vertical: la dirección de una sede, la de un proveedor y la de un huésped apuntan todas a las mismas tablas. Son **tres**, como en base de datos, y cada nivel lleva dentro la clave de su padre:

| Tabla         | Clave     | Ejemplo               |
| ------------- | --------- | --------------------- |
| Departamentos | 2 dígitos | `15` · Lima           |
| Provincias    | 4 dígitos | `1501` · Lima         |
| Distritos     | 6 dígitos | `150122` · Miraflores |

Cada nivel se pide por el **id** del de arriba, nunca por su nombre: «Lima» es departamento, provincia y distrito a la vez, así que filtrar por nombre traería cosas de tres sitios distintos. Por eso, al abrir una sede que ya tiene distrito, los tres combos se colocan partiendo el código: `150122` → `1501` → `15`.

El extracto cargado trae Callao, Cusco y Lima, con Huaral como provincia de un solo distrito. Es poco a propósito: basta para trabajar la pantalla y ya contiene los casos que rompen una cascada mal hecha.

### Los servicios de la sede

Lo que cubre al hotel entero: Wi-Fi, recepción 24 h, ascensor, estacionamiento. Van aquí y no en el tipo de habitación porque no distinguen una doble de una suite — las cubren a todas. Lo que sí distingue un tipo de otro (minibar, bañera, terraza) vive en su ficha.

::: tip El estado no se pregunta al dar de alta
Una sede nace activa, igual que un piso nace en servicio y una cuenta nace pudiendo entrar. Preguntar «¿activa?» en el alta solo invita a crear registros muertos. Darla de baja es una decisión posterior y tiene consecuencias, así que ese campo aparece **solo al editar**, con su aviso de qué arrastra.
:::

## Configuración de la vertical y por sede

Los parámetros tienen dos alcances: los de **vertical** valen para toda la cadena; los de **sede** los sobrescriben en un establecimiento concreto.

| Parámetro            | Qué decide                                           |
| -------------------- | ---------------------------------------------------- |
| Horas de garantía    | Cuánto aguanta una reserva pendiente antes de caerse |
| Permitir sobreventa  | Si se aceptan más reservas que habitaciones          |
| Cobrar salida tardía | Si pasarse de la hora genera cargo                   |
| Requiere inspección  | Si la gobernanta valida antes de dar por limpia      |
| Redondear tarifa a   | El múltiplo al que se ajusta el precio final         |

El ejemplo típico: la sede grande exige inspección de gobernanta; la pequeña no tiene a nadie para ese paso y la desactiva.

## Motivos

Las razones que el personal elige para dejar rastro: cancelación, bloqueo, descuento, cortesía y baja de servicio. Algunos exigen una nota escrita.

Sirven para que la bitácora responda _por qué_ pasó algo, y no solo _qué_ pasó.

## Usuarios y roles

Quién entra y qué parte del hotel gestiona. Detalle en [Quién hace qué](/guia/roles).

Una cuenta desactivada no puede iniciar sesión, y el sistema no deja quedarse sin ningún administrador activo.

## Comprobantes e impuestos

El último eslabón antes de la primera venta. Un hotel puede tener habitaciones, tarifas y canales y seguir sin poder cobrar: sin una serie activa no hay con qué emitir, y eso se descubre con el huésped delante y la maleta hecha. Por eso la pantalla avisa **antes** de que pase — si a la sede le falta una serie de boleta o de factura, lo dice arriba en rojo.

### Series

Una serie es una numeración: `B001`, y el correlativo del último comprobante que emitió. La letra no es una convención de la casa, la fija SUNAT:

| Emite           | Serie                                          |
| --------------- | ---------------------------------------------- |
| Boleta          | `B001`                                         |
| Factura         | `F001`                                         |
| Nota de crédito | `BC01` o `FC01` — la del documento que corrige |
| Nota de venta   | `NV01` — interno, sin valor tributario         |

El formulario enseña el número que saldría: `B001-00004822`. La serie se repite entre sedes (cada establecimiento lleva la suya) pero no dentro de una.

::: warning El correlativo no retrocede
Bajarlo significa volver a entregar números ya emitidos: dos comprobantes distintos con el mismo número. Eso es una contingencia tributaria, no un error de pantalla, así que el sistema lo rechaza diciendo cuál fue el último.

Por la misma razón, una serie que ya emitió **no se borra**: se desactiva.
:::

Al dar de alta sí se puede poner un correlativo inicial: es el caso de quien viene de otro sistema y arranca donde lo dejó.

### Impuestos

Valen para toda la cadena — el IGV no se da de alta, se cambia el día que lo cambia el Estado.

- **IGV** — el vigente en Perú es 18 %.
- **Los precios ya incluyen IGV** — lo normal en hotelería: el huésped ve el precio final. Si se apaga, el IGV se suma al facturar y la tarifa de la rejilla deja de ser lo que se cobra.
- **Exonerar a no domiciliados** — D. Leg. 919: el hospedaje a un extranjero no domiciliado es exportación de servicios y no lleva IGV. Exige TAM y pasaporte, y no vale más allá de 60 días por entrada. Es la particularidad fiscal de la vertical, y por eso el check-in pregunta por el documento.
