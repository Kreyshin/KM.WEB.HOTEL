<script setup lang="ts">
import FormularioAcceso from '@/components/acceso/FormularioAcceso.vue'
import KarmaLogo from '@/components/marca/KarmaLogo.vue'
import MarcaAlba from '@/components/marca/MarcaAlba.vue'
import KmIcono from '@/components/ui/KmIcono.vue'
import { marca } from '@/config/marca'
const modulos = ['Habitaciones', 'Reservas', 'Limpieza', 'Facturación']
</script>
<template>
  <main class="acceso" data-theme="dark">
    <section class="portada">
      <header class="marca">
        <MarcaAlba :tamano="42" />
        <div>
          <p class="nombre">{{ marca.nombre }}</p>
          <p class="descriptor">{{ marca.descriptor }}</p>
        </div>
      </header>
      <div class="presentacion">
        <div
          class="universo"
          role="img"
          aria-label="Habitaciones, reservas, limpieza y facturación conectadas en Alba"
        >
          <div
            v-for="i in 3"
            :key="i"
            class="orbita"
            :style="{ width: `${120 + i * 60}px`, height: `${120 + i * 60}px` }"
          />
          <div class="centro"><MarcaAlba :tamano="88" /></div>
          <div v-for="(modulo, i) in modulos" :key="modulo" class="modulo" :class="`modulo-${i}`">
            <p>
              <KmIcono
                :nombre="i === 0 ? 'estante' : i === 1 ? 'calendario' : i === 2 ? 'check' : 'caja'"
                tamano="xs"
              />{{ modulo }}
            </p>
            <div class="datos" :class="`datos-${i}`"><span /><span /><span /><span /></div>
          </div>
        </div>
        <p class="eyebrow">EL PULSO DE TU HOTEL</p>
        <h1>Cada estancia.<br />Todo en <span>su lugar.</span></h1>
        <p class="descripcion">
          Recepción, habitaciones y personas conectadas<br />en un solo espacio de trabajo.
        </p>
      </div>
      <footer class="atribucion">
        <KarmaLogo marca="novum" :tamano="26" /><span
          >Una plataforma de <strong>Karma Novum</strong></span
        ><span class="firma">CONEXIÓN · CONTROL · SERVICIO</span>
      </footer>
    </section>
    <section class="panel" aria-label="Acceso al hotel">
      <div class="tarjeta">
        <header class="marca marca-tarjeta">
          <MarcaAlba :tamano="40" />
          <div>
            <p class="nombre">{{ marca.nombre }}</p>
            <p class="descriptor">ACCESO A TU HOTEL</p>
          </div>
        </header>
        <p class="eyebrow">BIENVENIDO A TU HOTEL</p>
        <h2>Todo empieza aquí.</h2>
        <p class="introduccion">Ingresa a tu espacio de trabajo.</p>
        <FormularioAcceso accion="Ingresar al hotel →" sobre-oscuro />
        <p class="seguridad">
          <KmIcono nombre="candado" tamano="xs" />Tu equipo. Tus accesos. Tu hotel.
        </p>
      </div>
      <footer class="autor">
        <KarmaLogo marca="systems" :tamano="21" /><span>Karma Systems</span
        ><span>Desarrollo de sistemas</span>
      </footer>
    </section>
  </main>
</template>
<style scoped>
.acceso {
  min-height: 100svh;
  display: grid;
  grid-template-columns: 1.02fr 1fr;
  background: #0b1220;
  color: var(--hs-text);
  font-family: Inter, sans-serif;
}
.portada {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 38px 44px 24px;
  background: radial-gradient(ellipse at 48% 40%, #10203c 0%, #080d16 65%);
}
.marca {
  display: flex;
  align-items: center;
  gap: 12px;
}
.nombre {
  font-size: 22px;
  font-weight: 650;
  line-height: 1.2;
}
.descriptor {
  margin-top: 5px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #9aa6b6;
}
.presentacion {
  width: 100%;
  max-width: 480px;
  margin: 30px auto 55px;
}
.universo {
  position: relative;
  width: 360px;
  height: 300px;
  margin: 0 auto 32px;
}
.orbita {
  position: absolute;
  border: 1px solid rgb(34 201 242 / 7%);
  border-radius: 50%;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
.centro {
  position: absolute;
  inset: 96px 126px;
  display: grid;
  place-items: center;
  border: 1px solid rgb(34 201 242 / 20%);
  border-radius: 25px;
  background: linear-gradient(145deg, #172b46, #101a2b);
  box-shadow: 0 0 60px rgb(18 104 236 / 12%);
}
.universo::before,
.universo::after {
  content: '';
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #22c9f2;
  box-shadow: 0 0 12px #22c9f2;
}
.universo::before {
  top: 12px;
  left: 145px;
}
.universo::after {
  bottom: 5px;
  right: 105px;
}
.modulo {
  position: absolute;
  width: 110px;
  height: 82px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgb(175 210 252 / 12%);
  background: linear-gradient(145deg, #1b293e, #131d2e);
  box-shadow: 0 12px 28px rgb(0 0 0 / 16%);
}
.modulo p {
  font-size: 12px;
  color: #afd2fc;
}
.modulo-0 {
  top: 38px;
  left: 7px;
  transform: rotate(-7deg);
}
.modulo-1 {
  top: 40px;
  right: 0;
  transform: rotate(8deg);
}
.modulo-2 {
  bottom: 20px;
  left: 20px;
  transform: rotate(-5deg);
}
.modulo-3 {
  bottom: 14px;
  right: 9px;
  transform: rotate(6deg);
}
.datos {
  display: flex;
  align-items: end;
  gap: 5px;
  height: 30px;
  margin-top: 9px;
}
.datos span {
  width: 13px;
  height: 12px;
  border-radius: 2px;
  background: #1268ec;
}
.datos-0 span:nth-child(2) {
  height: 17px;
}
.datos-0 span:nth-child(3) {
  height: 22px;
}
.datos-0 span:nth-child(4) {
  height: 28px;
  background: #22c9f2;
}
.datos-1 {
  border-bottom: 2px solid #22c9f2;
  background: linear-gradient(0deg, rgb(34 201 242 / 15%), transparent);
  clip-path: polygon(0 65%, 30% 54%, 55% 60%, 80% 25%, 100% 10%, 100% 100%, 0 100%);
}
.datos-1 span {
  display: none;
}
.datos-2 {
  align-items: center;
}
.datos-2 span {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid #4e9bf766;
  background: #4e9bf726;
}
.datos-2 span:last-child {
  display: none;
}
.datos-3 {
  display: grid;
  gap: 5px;
  height: auto;
  margin-top: 13px;
}
.datos-3 span {
  width: 100%;
  height: 3px;
  background: #afd2fc26;
}
.datos-3 span:nth-child(2) {
  width: 65%;
}
.eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #22c9f2;
}
h1 {
  margin: 18px 0;
  font-size: clamp(36px, 3.5vw, 54px);
  font-weight: 650;
  line-height: 1.12;
  letter-spacing: -2px;
}
h1 span {
  color: #22c9f2;
}
.descripcion {
  color: #9aa6b6;
  font-size: 15px;
  line-height: 1.8;
}
.atribucion {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #8593a6;
  font-size: 14px;
}
.firma {
  margin-left: auto;
  font-size: 10px;
  letter-spacing: 1.7px;
}
.panel {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 28px;
  background: #0e1523;
  border-left: 1px solid rgb(175 210 252 / 5%);
}
.tarjeta {
  position: relative;
  width: 100%;
  max-width: 410px;
  padding: 34px 32px 30px;
  border: 1px solid #263144;
  border-radius: 18px;
  background: linear-gradient(145deg, #172032, #111827);
  box-shadow: 0 25px 70px -30px #0008;
}
.tarjeta::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 26px;
  width: 65px;
  height: 2px;
  background: linear-gradient(90deg, #22c9f2, transparent);
}
.marca-tarjeta {
  padding-bottom: 23px;
  margin-bottom: 27px;
  border-bottom: 1px solid rgb(175 210 252 / 8%);
}
.marca-tarjeta .nombre {
  font-size: 16px;
}
.marca-tarjeta .descriptor {
  font-size: 8px;
  letter-spacing: 1.5px;
}
.tarjeta .eyebrow {
  font-size: 9px;
  letter-spacing: 1.5px;
}
h2 {
  margin-top: 12px;
  font-size: 30px;
  font-weight: 650;
  letter-spacing: -1px;
}
.introduccion {
  margin: 8px 0 27px;
  font-size: 14px;
  color: #9aa6b6;
}
.seguridad {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid rgb(175 210 252 / 8%);
  color: #8593a6;
  font-size: 10px;
  text-align: center;
}
.autor {
  position: absolute;
  bottom: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #8593a6;
  font-size: 13px;
}
.autor span:last-child {
  margin-left: 12px;
  color: #637086;
}
@media (max-width: 720px) {
  .autor {
    font-size: 11px;
    gap: 8px;
  }
  .autor span:last-child {
    margin-left: 4px;
  }
}
@media (max-width: 1000px) {
  .portada {
    padding: 28px 25px 24px;
  }
  .universo {
    transform: scale(0.85);
    margin-bottom: 5px;
    width: 340px;
  }
  .firma {
    display: none;
  }
  h1 {
    font-size: 38px;
  }
}
@media (max-width: 760px) {
  .acceso {
    grid-template-columns: 1fr;
  }
  .portada {
    display: none;
  }
  .panel {
    min-height: 100svh;
    padding: 45px 20px 75px;
    border: 0;
    background: radial-gradient(ellipse at 50% 0%, #10203c, #080d16 75%);
  }
  .tarjeta {
    padding: 28px 24px 22px;
  }
}
.tarjeta::after {
  content: '';
  position: absolute;
  bottom: 25px;
  left: -1px;
  width: 2px;
  height: 30px;
  background: linear-gradient(#22c9f2, transparent);
}
.tarjeta :deep(form) {
  gap: 22px;
}
.tarjeta :deep(input) {
  min-height: 48px;
  border-radius: 6px;
  background: #29364a;
}
.tarjeta :deep(button[type='submit']) {
  min-height: 49px;
  border-radius: 6px;
  margin-top: 8px;
  justify-content: flex-start;
  text-align: left;
}
.seguridad {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}
.modulo p {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
}
.modulo p :deep(svg) {
  color: #22c9f2;
}
@media (min-width: 1100px) {
  .presentacion {
    max-width: 510px;
    margin: 60px auto 65px;
  }
  .universo {
    transform: scale(1.12);
    margin-bottom: 48px;
  }
  h1 {
    font-size: clamp(44px, 3.7vw, 62px);
  }
}
</style>
