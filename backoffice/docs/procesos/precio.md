# El precio de una noche

Cómo se forma la cifra que aparece en la rejilla de tarifas, con números.

## El orden

Siempre el mismo, y el mismo que aplicará el sistema cuando tenga backend:

**Tarifa base del tipo → × factor de temporada → ± ajuste de canal → redondeo**

## Ejemplo 1 · Doble, canal directo, temporada media

| Paso                         | Cálculo    | Resultado  |
| ---------------------------- | ---------- | ---------- |
| Tarifa base del tipo Doble   |            | S/ 260     |
| Temporada media, factor 1,00 | 260 × 1,00 | S/ 260     |
| Canal directo, sin ajuste    | 260 + 0 %  | S/ 260     |
| Redondeo a múltiplo de 5     |            | **S/ 260** |

## Ejemplo 2 · La misma noche, por Booking

| Paso                         | Cálculo    | Resultado  |
| ---------------------------- | ---------- | ---------- |
| Tarifa base                  |            | S/ 260     |
| Temporada media, factor 1,00 | 260 × 1,00 | S/ 260     |
| Comisión del canal, +15 %    | 260 × 1,15 | S/ 299     |
| Redondeo a múltiplo de 5     |            | **S/ 300** |

## Ejemplo 3 · Individual en fiestas patrias

| Paso                            | Cálculo    | Resultado  |
| ------------------------------- | ---------- | ---------- |
| Tarifa base del tipo Individual |            | S/ 180     |
| Temporada alta, factor 1,40     | 180 × 1,40 | S/ 252     |
| Canal directo, sin ajuste       |            | S/ 252     |
| Redondeo a múltiplo de 5        |            | **S/ 250** |

Esa temporada, además, exige **dos noches mínimas**.

## Lo que el precio resuelto no incluye

- **El régimen** ya va dentro de la tarifa del tipo: una doble con desayuno cuesta lo que cuesta, el desayuno no se suma aparte.
- **Los consumos** de la estancia —minibar, lavandería, restaurante— se cargan a la habitación y se liquidan al final.
- **La tarifa pactada** de una reserva concreta puede diferir de la resuelta: lo que se guarda en la reserva es lo que se cobra, y la rejilla es la referencia de venta.

## Un apunte fiscal

Un huésped **no domiciliado** con estancia menor a 60 días está exonerado de IGV por el alojamiento (D. Leg. 919). El sistema guarda el país de residencia de cada huésped precisamente por esto, y el parámetro se activa por sede.
