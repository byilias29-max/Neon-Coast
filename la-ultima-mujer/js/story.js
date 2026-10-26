'use strict';
/* ============================================================
   LA ÚLTIMA MUJER — archivo narrativo
   Documentos, diario, diálogos, objetivos y plan de temporada.
   ============================================================ */
window.LM = window.LM || {};
(function () {
  const S = {};
  LM.Story = S;

  /* ============================================================
     SÍMBOLOS DEL MECANISMO
     ============================================================ */
  S.symbols = [
    {
      id: 'luna', name: 'Luna', verb: 'Olvidar',
      svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M31.5 6.8c-8.6 1.1-14.7 8.4-13.6 17 .9 7 6 12.5 12.8 13.7-3.5 2.1-7.6 3.1-11.8 2.6C9.7 38.9 3.7 30.8 4.9 21.6 6.1 12.4 14.2 6.4 23.4 7.6c2.9.4 5.7 1.5 8.1 3.2Z"/><path d="M36.5 13.5c1.6 2.3 2.5 5 2.8 7.8" opacity=".55"/><path d="M35 9.5l1.1 3.1 3.2 1.1-3.2 1.1L35 18l-1.1-3.2-3.2-1.1 3.2-1.1Z" opacity=".7"/></svg>'
    },
    {
      id: 'mano', name: 'Mano', verb: 'Cerrar',
      svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15.5 22V10.6a2.4 2.4 0 0 1 4.8 0V21"/><path d="M20.3 21V8.2a2.4 2.4 0 0 1 4.8 0V21"/><path d="M25.1 21V10a2.4 2.4 0 0 1 4.8 0v11.5"/><path d="M29.9 22v-7.2a2.4 2.4 0 0 1 4.8 0v11.7c0 8.1-5.2 14.5-13 14.5-6.8 0-10.7-3.9-13.4-9.8l-2.5-5.4c-1-2.1-.5-4 1.2-4.9 1.8-.9 3.4-.2 4.6 1.7l3.9 6.2"/><path d="M15.5 26.5c1.2 4.8 3.9 7.7 8.4 8.7" opacity=".5"/></svg>'
    },
    {
      id: 'campana', name: 'Campana', verb: 'Avisar',
      svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 34.5h24l-2.5-4.2V20c0-6-4.2-10.8-9.5-10.8S14.5 14 14.5 20v10.3L12 34.5Z"/><path d="M24 39.8a4.4 4.4 0 0 0 4.2-4.2h-8.4a4.4 4.4 0 0 0 4.2 4.2Z"/><path d="M21 9.2c.2-2 1.3-3.2 3-3.2s2.8 1.2 3 3.2"/><path d="M9 20.5c-.7 1.8-1 3.8-.9 5.8M39 20.5c.7 1.8 1 3.8.9 5.8" opacity=".45"/></svg>'
    },
    {
      id: 'cuervo', name: 'Cuervo', verb: 'Vigilar',
      svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 28.5c3.8-5.2 9.7-8 16.8-8 3.2 0 5.9.8 8.2 2.2l6-3.2-1.7 5.4c1.6 2.2 2.4 4.8 2.4 7.7-5.1-2.1-9.4-2.4-13.6-1.1-4.7 1.5-8.7 1.6-12.4.3L10 35l-2.1-3.7L10 28.5Z"/><path d="M31.2 22.7c-1.8-2.9-4.8-4.7-8.6-5.1"/><circle cx="31.8" cy="25.2" r="1.1" fill="currentColor" stroke="none"/><path d="M36.2 19.2 43 15.5l-2.1 4.6"/><path d="M18 32.5c1.6 4.5 4.7 7.4 9.2 8.6M15 30.8l-1.2 6.4M37 31.8l1.5 5.2" opacity=".5"/></svg>'
    }
  ];
  S.symbolById = id => S.symbols.find(s => s.id === id) || S.symbols[0];
  S.dialSolution = ['luna', 'mano', 'campana', 'cuervo'];
  S.dialHint = '«La luna contó primero. La mano cerró después. La campana avisó al pueblo. El cuervo se quedó a mirar.»';

  /* ============================================================
     OBJETIVOS
     ============================================================ */
  S.objectives = {
    find_light: { text: 'Encuentra una fuente de luz.', target: { scene: 'clinic_room', x: 376, y: 252 }, hint: 'La habitación está demasiado oscura. Hay algo en el cajón de la mesilla.' },
    examine_room: { text: 'Averigua dónde estás. Examina la habitación antes de salir.', target: { scene: 'clinic_room', x: 444, y: 300 } },
    leave_room: { text: 'Sal al pasillo. La puerta del fondo no está cerrada.', target: { scene: 'clinic_room', x: 468, y: 514 } },
    reach_refuge: { text: 'Llega al control de enfermería. La radio sigue emitiendo.', target: { scene: 'clinic_hall', x: 676, y: 566 } },
    hear_radio: { text: 'Escucha la transmisión de la frecuencia 91.7.', target: { scene: 'clinic_hall', x: 676, y: 566 } },
    go_house: { text: 'Ve a la Casa 14, en Calle Alhelí. Nadia dice que la respuesta está en el sótano.', target: { scene: 'street', x: 1434, y: 468 } },
    enter_house: { text: 'Entra en la Casa 14.', target: { scene: 'street', x: 1434, y: 468 } },
    photo_wall: { text: 'Examina la pared de fotografías del salón.', target: { scene: 'house_ground', x: 360, y: 165 } },
    find_door: { text: 'Encuentra la puerta del sótano.', target: { scene: 'house_ground', x: 1130, y: 742 } },
    find_clue: { text: 'Busca el orden de las cuatro marcas. La casa guarda la canción de Irene.', target: { scene: 'house_upstairs', x: 300, y: 360 } },
    open_basement: { text: 'Abre la puerta del sótano con el diapasón.', target: { scene: 'house_ground', x: 1130, y: 742 } },
    descend: { text: 'Desciende al sótano.', target: { scene: 'house_basement', x: 240, y: 230 } },
    find_nadia: { text: 'Alguien está junto al transmisor.', target: { scene: 'house_basement', x: 1100, y: 390 } },
    take_tape: { text: 'Toma la cinta del carrete. No la reproduzcas aquí.', target: { scene: 'house_basement', x: 1040, y: 300 } },
    return_refuge: { text: 'Vuelve al refugio de la Clínica Aurora. Allí podrás escuchar la cinta.', target: { scene: 'clinic_hall', x: 900, y: 566 } },
    play_tape: { text: 'Reproduce la cinta en el magnetófono del control de enfermería.', target: { scene: 'clinic_hall', x: 900, y: 566 } },
    explore: { text: 'Explora Puerto Niebla. Todavía hay preguntas sin respuesta.', target: null }
  };

  /* ============================================================
     DOCUMENTOS
     ============================================================ */
  S.documents = {
    nota_lucia: {
      kicker: 'NOTA MANUSCRITA', code: 'PN-03 / L.O.',
      title: 'No uses la radio',
      meta: 'Clínica Aurora · Habitación 03 · 18 de octubre',
      html: `<p class="doc-hand">Mara, si despiertas antes que yo:</p>
<p>no uses el teléfono de la habitación. No respondas a la voz que dice tu nombre. La puerta del pasillo está al fondo. La antorcha está en el cajón de la mesilla. No dejes que te vea con luz.</p>
<p class="doc-hand">Si no estoy, no me busques sola.</p>`,
      sign: '— L.',
      journal: [['clues', 'c_light'], ['people', 'p_lucia'], ['questions', 'q_lucia']]
    },
    expediente_m07: {
      kicker: 'EXPEDIENTE CLÍNICO', code: 'CA / M-07',
      title: 'Sujeto M-07',
      meta: 'Clínica Aurora · Unidad de Sueño · Circulación restringida',
      html: `<table class="doc-table">
<tr><td>Paciente</td><td>ORIBE, MARA · 36 años</td></tr>
<tr><td>Ocupación</td><td>Ingeniera de sonido · Radio Faro 91.7</td></tr>
<tr><td>Ingreso</td><td>18-OCT · 19:48</td></tr>
<tr><td>Diagnóstico</td><td>Insomnio refractario. Exposición a NANA-18.</td></tr>
<tr><td>Estado</td><td>Latencia estable. No despertar antes de la fase 4.</td></tr>
</table>
<p><strong>Observaciones:</strong> el sujeto mantiene una respuesta emocional anómala a la voz de control. No permitir contacto con otros sujetos despiertos. Aislamiento total. La presencia de una segunda voz femenina invalida la pauta.</p>
<p><strong>Responsable:</strong> Dr. E. Rueda.</p>
<p class="doc-marginal">M-07 no es una paciente. Es una frecuencia.</p>`,
      sign: 'Unidad de Sueño · Clínica Aurora',
      journal: [['clues', 'c_isolation'], ['questions', 'q_awake'], ['people', 'p_elias']]
    },
    cartel_lucia: {
      kicker: 'CARTEL DE DESAPARICIÓN', code: 'PN / 14-M', type: 'photo',
      photo: 'lucia_photo',
      title: 'Lucía Oribe',
      meta: 'Desaparecida hace 14 meses · Última vez vista en Calle Alhelí',
      html: `<p><strong>29 años. 1,68 m. Cabello oscuro. Enfermera en la Clínica Aurora.</strong></p>
<p>Llevaba un diapasón de latón en el bolsillo de la bata. Tenía una marca de nacimiento junto a la muñeca izquierda.</p>
<p>Si alguien la ha visto, llame a Radio Faro, 91.7. La ciudad no se olvida de los suyos.</p>
<p class="doc-marginal">Encima del cartel, alguien ha escrito a lápiz: «Preguntad por la casa 14».</p>`,
      sign: 'Ayuntamiento de Puerto Niebla · Concejalía de Seguridad',
      journal: [['people', 'p_lucia'], ['clues', 'c_lucia_missing'], ['questions', 'q_lucia'], ['places', 'pl_house']]
    },
    panfleto_nana: {
      kicker: 'PROGRAMA MUNICIPAL', code: 'NANA / 18',
      title: 'Duerme mejor. Escucha la señal.',
      meta: 'Ayuntamiento de Puerto Niebla · Clínica Aurora · Radio Faro',
      html: `<p class="doc-lead">A partir del 18 de octubre, Radio Faro emitirá <strong>NANA</strong>, una pauta sonora diseñada para reducir el insomnio de la ciudad.</p>
<p>No requiere atención. No requiere recuerdo. Solo deja que la ciudad te arrope.</p>
<ul>
<li>Emisión: 91.7 FM · cada noche a las 03:12.</li>
<li>Duración: 18 minutos.</li>
<li>No ajuste el volumen. La voz sabe cómo llegar.</li>
</ul>
<p class="doc-marginal">Si escuchas una voz que te llama por tu nombre, no es parte del programa. No respondas.</p>`,
      sign: 'Programa de Salud del Sueño · Puerto Niebla',
      journal: [['clues', 'c_nana'], ['questions', 'q_voice']]
    },
    registro_policia: {
      kicker: 'REGISTRO DE INCIDENCIAS', code: 'PN / 18-OCT',
      title: 'Últimas llamadas',
      meta: 'Central de Puerto Niebla · 19:40–19:44',
      html: `<table class="doc-log">
<tr><td>19:41</td><td>Casa 14, Calle Alhelí. Ruidos en el sótano. La señora Rueda lleva veinte años muerta.</td></tr>
<tr><td>19:42</td><td>Radio Faro. La emisión ha cambiado de frecuencia. No responde nadie.</td></tr>
<tr><td>19:42</td><td>Clínica Aurora. Todos los pacientes duermen. Todos a la vez.</td></tr>
<tr><td>19:43</td><td>Llamada sin voz. Solo una melodía de cuna.</td></tr>
<tr><td>19:44</td><td>Fin de turno. Que alguien apague la ciudad.</td></tr>
</table>
<p class="doc-marginal">La última llamada entró desde una línea de la Casa 14. La casa no tiene teléfono desde 1998.</p>`,
      sign: 'Central de Emergencias · Turno de noche',
      journal: [['clues', 'c_nana'], ['questions', 'q_voice'], ['places', 'pl_house']]
    },
    poema_lucia: {
      kicker: 'PÁGINA ARRANCADA', code: 'CASA 14 / CUADERNO',
      title: 'La canción de Irene',
      meta: 'Letra encontrada en el estudio · papel doblado cuatro veces',
      html: `<div class="doc-poem">La luna contó primero,<br>cuando la casa aún dormía.<br>La mano cerró después<br>la puerta que nos tenía.<br><br>La campana avisó al pueblo<br>con su lengua de metal.<br>El cuervo se quedó a mirar<br>desde el otro lado del cristal.</div>
<p>Irene la cantaba a Elías y a Nadia. Cuatro marcas. Siempre el mismo orden.</p>
<p class="doc-marginal">La puerta del sótano no tiene ojo. Tiene oído. — L.</p>`,
      sign: 'Letra recogida por L. Oribe',
      journal: [['clues', 'c_poem'], ['people', 'p_irene'], ['questions', 'q_last']]
    },
    diario_lucia: {
      kicker: 'DIARIO PERSONAL', code: 'L.O. / 11',
      title: 'Lo que grabé sin saber',
      meta: 'Casa 14 · oculto bajo la tabla del escritorio',
      html: `<p class="doc-date">14 de septiembre</p>
<p>Elías me pidió una prueba de voz para NANA. Dijo que era un banco de tonos. Grabé durante seis horas. Al final, me hizo repetir una frase: «No estás sola. Todavía no.» No me gustó cómo sonó mi voz.</p>
<p class="doc-date">2 de octubre</p>
<p>Mara mezcló la cinta. No sabe lo que contiene. Si se lo digo, la pondrá en peligro. Él la necesita a ella para operar el transmisor y a mí para hablar.</p>
<p class="doc-date">9 de octubre</p>
<p>Encontré la casa de los Rueda. La madre, Irene, cantaba una canción con cuatro marcas. Elías la usaba de niño para que Nadia obedeciera. La puerta del sótano sigue ese orden: luna, mano, campana, cuervo.</p>
<p class="doc-date">17 de octubre</p>
<p>Si algo me pasa, que Mara encuentre esto. No quiero que su voz sea la última que recuerde la ciudad.</p>`,
      sign: 'L. Oribe · no entregar',
      journal: [['clues', 'c_diary'], ['clues', 'c_poem'], ['people', 'p_lucia'], ['people', 'p_nadia'], ['questions', 'q_voice']]
    },
    informe_nana: {
      kicker: 'INFORME TÉCNICO', code: 'CA-NANA / 04',
      title: 'Protocolo de arrastre emocional',
      meta: 'Dr. E. Rueda · circulación restringida',
      html: `<p class="doc-lead">El sueño no se induce. Se recuerda.</p>
<ol>
<li>La voz portadora debe pertenecer a un vínculo afectivo del sujeto receptor. La familiaridad reduce la resistencia cortical.</li>
<li>La exposición repetida convierte la orden en recuerdo. El recuerdo se convierte en sueño. El sueño se convierte en obediencia.</li>
<li>La fase 4 requiere aislamiento. Ningún sujeto despierto del mismo vínculo debe permanecer cerca del receptor primario.</li>
<li>La presencia de una segunda voz femenina desestabiliza la pauta. Si aparece Nadia Voss, retirar al sujeto M-07 de la ciudad.</li>
</ol>
<p><strong>Conclusión:</strong> la voz de L. O. es eficaz. El sujeto M-07 es el operador ideal. Mantener separados.</p>`,
      sign: 'Unidad de Sueño · Clínica Aurora',
      journal: [['clues', 'c_isolation'], ['questions', 'q_voice'], ['people', 'p_nadia'], ['people', 'p_elias']]
    },
    cuaderno_elias: {
      kicker: 'CUADERNO DE CAMPO', code: 'CASA 14 / E.R.',
      title: 'La última mujer',
      meta: 'Habitación de Elías · anotaciones de 2009–2018',
      html: `<p class="doc-lead">La última mujer no es una víctima. Es una función.</p>
<p>Cuando no queda nadie a quien amar, la voz interior se convierte en la única autoridad. M-07 necesita creer que es la última. La ciudad necesita creer que duerme.</p>
<p>Nadia no debería estar viva. Si aparece, el aislamiento se rompe. Si el aislamiento se rompe, la señal se debilita.</p>
<p>La solución es sencilla: decirle que Nadia está muerta. Nunca le he mentido. Solo he elegido cuándo decir la verdad.</p>
<p class="doc-marginal">Mamá cantaba cuatro marcas. Yo solo necesito una voz.</p>`,
      sign: 'E. Rueda · 18 de octubre',
      journal: [['clues', 'c_isolation'], ['questions', 'q_nadia'], ['questions', 'q_last'], ['people', 'p_elias'], ['people', 'p_nadia'], ['people', 'p_irene']]
    },
    carta_irene: {
      kicker: 'CARTA SIN ENVIAR', code: 'CASA 14 / I.R.',
      title: 'Para Nadia, si vuelves',
      meta: 'Habitación de Irene · cerrada desde 1998',
      html: `<p>Nadia:</p>
<p>si algún día vuelves a esta casa, no busques a tu hermano. Él escucha las paredes.</p>
<p>Yo te enseñé cuatro cosas: la luna para olvidar, la mano para cerrar, la campana para avisar, el cuervo para vigilar. Úsalas cuando él no mire.</p>
<p>El túnel sigue abierto. El mar no se lo llevó todo.</p>
<p class="doc-marginal">No dejes que la ciudad te ponga voz de madre. Las madres también duermen.</p>`,
      sign: '— Mamá',
      journal: [['people', 'p_irene'], ['people', 'p_nadia'], ['clues', 'c_poem'], ['questions', 'q_tunnel']]
    },
    foto_reverso: {
      kicker: 'FOTOGRAFÍA DE VIGILANCIA', code: 'M-07 / 18N', type: 'photo',
      photo: 'surveillance',
      title: 'No despertar',
      meta: 'Reverso de la fotografía encontrada en Casa 14',
      html: `<p>Una imagen tomada desde la esquina de la habitación 03. La figura en la cama es Mara. La fecha impresa es la noche de la emisión.</p>
<p>En el reverso, con letra pequeña y ordenada:</p>
<p class="doc-hand">«M-07. No despertar. Todavía no. — E.»</p>
<p class="doc-marginal">La cámara no está en la habitación. Alguien la instaló detrás del espejo.</p>`,
      sign: 'Archivo de vigilancia · Clínica Aurora',
      journal: [['clues', 'c_surveillance'], ['questions', 'q_awake'], ['people', 'p_elias']]
    },
    transcripcion_18n: {
      kicker: 'TRANSCRIPCIÓN', code: 'NANA-18 / MASTER',
      title: 'Prueba de voz',
      meta: 'Cinta de carrete · 03:12:44',
      html: `<table class="doc-log">
<tr><td>00:00:03</td><td><em>(voz femenina)</em> «NANA-18. Calibración.»</td></tr>
<tr><td>00:00:17</td><td>«Respira. La ciudad respira contigo.»</td></tr>
<tr><td>00:00:41</td><td>«No estás sola. Todavía no.»</td></tr>
<tr><td>00:01:04</td><td>«Si oyes tu nombre, no respondas.»</td></tr>
<tr><td>00:01:32</td><td><em>(voz secundaria)</em> «Mara, no dejes que...»</td></tr>
<tr><td>00:01:33</td><td><em>(corte)</em></td></tr>
</table>
<p class="doc-marginal">La voz secundaria no figura en la mezcla oficial. La cinta fue manipulada después de la grabación.</p>`,
      sign: 'Ingeniería de sonido · Radio Faro',
      journal: [['clues', 'c_tape'], ['questions', 'q_voice'], ['people', 'p_lucia']]
    },
    dibujo_nadia: {
      kicker: 'DIBUJO INFANTIL', code: 'CASA 14 / N.V.', type: 'photo',
      photo: 'child_drawing',
      title: 'Las cuatro marcas',
      meta: 'Habitación de Nadia · pared junto a la cama',
      html: `<p>Un dibujo hecho con ceras por una niña de siete años. La casa, la luna, la mano, la campana y el cuervo. En el borde inferior, una frase mal escrita: <em>«no dormir»</em>.</p>
<p>Nadia dibujaba la canción de su madre cada vez que Elías la encerraba en el sótano.</p>
<p class="doc-marginal">La luna está arriba, a la izquierda. La mano, junto a la puerta. La campana, en el tejado. El cuervo, mirando desde el árbol.</p>`,
      sign: 'Habitación de Nadia Rueda · 1998',
      journal: [['clues', 'c_poem'], ['people', 'p_nadia'], ['people', 'p_irene']]
    },
    mapa_lucia: {
      kicker: 'MAPA ANOTADO', code: 'CASA 14 / RUTA', type: 'photo',
      photo: 'map',
      title: 'El mapa de Lucía',
      meta: 'Dentro del escritorio del estudio',
      html: `<p>Un mapa de Puerto Niebla con tres marcas rojas: la Clínica Aurora, la Casa 14 y Radio Faro. La ruta entre la clínica y la casa está trazada a lápiz.</p>
<p>Junto a la emisora, una nota: <strong>«91.7 = llave»</strong>. En el margen inferior: «el túnel no sale en el mapa».</p>`,
      sign: 'L. Oribe · ruta de evacuación',
      journal: [['places', 'pl_radio'], ['places', 'pl_house'], ['questions', 'q_tunnel']]
    },
    recorte_radio: {
      kicker: 'RECORTE DE PRENSA', code: 'RADIO FARO / 2001',
      title: 'La emisora que no duerme',
      meta: 'Diario de Puerto Niebla · 14 de marzo de 2001',
      html: `<p class="doc-lead">Radio Faro celebra veinte años emitiendo desde la torre de Punta Niebla.</p>
<p>Su fundadora, Irene Rueda, defendía una radio hecha de voces cercanas: «Una ciudad que se escucha a sí misma no tiene miedo a la noche».</p>
<p>Irene falleció en 1998. La emisora pasó a manos de su hijo, el doctor Elías Rueda, que compatibiliza la dirección con su trabajo en la Clínica Aurora.</p>
<p class="doc-marginal">En la fotografía aparecen Irene y dos niños. La niña lleva un impermeable amarillo.</p>`,
      sign: 'Archivo de Radio Faro',
      journal: [['people', 'p_irene'], ['people', 'p_elias'], ['people', 'p_nadia'], ['places', 'pl_radio']]
    }
  };

  /* ============================================================
     DIARIO
     ============================================================ */
  S.journal = {
    clues: {
      c_light: { title: 'La antorcha de Lucía', kind: 'OBJETO', text: 'En el cajón de la mesilla había una antorcha de latón. Huele a aceite y a tabaco. Lucía llevaba una igual cuando trabajaba de noche.' },
      c_tuning: { title: 'El diapasón', kind: 'OBJETO', text: 'En el bolsillo del abrigo encontré un diapasón con una L tallada. No recordaba haberlo guardado. La puerta del sótano de la Casa 14 tiene una hendidura de latón. Quizá no sea casualidad.' },
      c_lighter: { title: 'El mechero de Lucía', kind: 'OBJETO', text: 'Un mechero de gasolina con la inicial L. grabada a cuchillo. Funciona. Lucía lo usaba para encender las velas del hospital cuando se iba la luz.' },
      c_radio: { title: 'La transmisión', kind: 'AUDIO', text: 'Elías dice que la ciudad está en cuarentena y que soy la última mujer despierta. Otra voz, Nadia, dice que miente. Me pidió que fuera a la Casa 14 y llevara el diapasón.' },
      c_nana: { title: 'NANA no era un programa de sueño', kind: 'ARCHIVO', text: 'Lo vendieron como una pauta contra el insomnio. «No requiere atención. No requiere recuerdo.» La emisión empezó el 18 de octubre a las 19:42. La ciudad no volvió a despertar.' },
      c_lucia_missing: { title: 'Lucía desapareció hace catorce meses', kind: 'PERSONA', text: 'Su cartel sigue pegado en el pasillo de la clínica. La última vez que la vieron fue en Calle Alhelí. Alguien escribió a lápiz: «Preguntad por la casa 14».' },
      c_surveillance: { title: 'Alguien me vigilaba', kind: 'PRUEBA', text: 'En la Casa 14 hay una fotografía mía dormida en la habitación 03. Está tomada la noche de la emisión. Detrás: «M-07. No despertar. Todavía no. — E.»' },
      c_poem: { title: 'Las cuatro marcas', kind: 'CLAVE', text: 'La canción de Irene: luna, mano, campana, cuervo. La luna para olvidar. La mano para cerrar. La campana para avisar. El cuervo para vigilar. El orden abre la puerta del sótano.' },
      c_diary: { title: 'Lucía grabó la voz', kind: 'PRUEBA', text: 'Elías le pidió una prueba de voz para NANA. Ella no sabía que iba a dormir la ciudad. Mara mezcló la cinta sin saber lo que contenía. Lucía dejó el diario escondido en la Casa 14.' },
      c_isolation: { title: 'La última mujer', kind: 'PROTOCOLO', text: 'No es una víctima. Es una función. M-07 necesita creer que es la última. El aislamiento mantiene la señal. La presencia de otra mujer despierta lo rompe.' },
      c_tape: { title: 'La voz de la cinta', kind: 'PRUEBA', text: 'La voz que duerme la ciudad no es la mía. Es la de Lucía. Ella dejó una segunda pista en la cinta, una frase que Elías creyó haber borrado.' },
      c_tunnel: { title: 'El túnel de Casa 14', kind: 'LUGAR', text: 'Irene dejó abierto un túnel bajo la casa. Nadia lo usó para desaparecer. El mapa de Lucía no lo registra. Puede llevar a la emisora.' },
      c_key: { title: 'La llave de Radio Faro', kind: 'OBJETO', text: 'Una llave de latón con la frecuencia 91.7 grabada. Nadia la dejó en el sótano. Abre la emisora. Abre la siguiente parte de la historia.' }
    },
    people: {
      p_mara: { title: 'Mara Oribe', role: 'Ingeniera de sonido · 36 años', text: 'Yo. Trabajo en Radio Faro. Mezclé la cinta de NANA sin saber qué contenía. Llevo siete días en la habitación 03 y no recuerdo cómo llegué.' },
      p_lucia: { title: 'Lucía Oribe', role: 'Enfermera · hermana · desaparecida', text: 'Mi hermana pequeña. Desapareció hace catorce meses tras descubrir algo en la Clínica Aurora. Su voz está en la cinta de NANA. No sé si sigue viva.' },
      p_elias: { title: 'Dr. Elías Rueda', role: 'Director de la Unidad de Sueño', text: 'El hombre que creó NANA. Me habla por la radio con una calma que no perdona. Dice que soy la última mujer despierta. Dice que Nadia está muerta. Una de las dos cosas es mentira.' },
      p_nadia: { title: 'Nadia Voss', role: 'Superviviente · impermeable amarillo', text: 'Aparece bajo la lluvia y en el sótano de su propia casa. Hermana de Elías. Cree que la ciudad duerme, no que haya muerto. Sabe cosas que debería saber.' },
      p_irene: { title: 'Irene Rueda', role: 'Fundadora de Radio Faro · fallecida en 1998', text: 'Madre de Elías y Nadia. Cantaba una canción de cuatro marcas para dormir a sus hijos. La casa 14 guarda su voz en las paredes.' }
    },
    places: {
      pl_clinic: { title: 'Clínica Aurora', sub: 'Avenida del Faro, 3', text: 'El lugar donde desperté. Pasillos vacíos, camas ocupadas por gente que duerme. La radio de control sigue encendida.' },
      pl_room03: { title: 'Habitación 03', sub: 'Clínica Aurora · ala este', text: 'Mi habitación. La puerta se abre desde fuera. El espejo tiene un marco demasiado grueso. Hay una cámara detrás.' },
      pl_street: { title: 'Calle Alhelí', sub: 'Puerto Niebla · distrito norte', text: 'Lluvia sin fin. Las farolas siguen encendidas. Las casas no. La Casa 14 está al final de la calle, con una ventana encendida en la planta alta.' },
      pl_house: { title: 'Casa 14', sub: 'Calle Alhelí · familia Rueda', text: 'La casa de la infancia de Elías y Nadia. Huele a polvo, a cera y a una canción antigua. Alguien ha convertido el sótano en una emisora.' },
      pl_basement: { title: 'El sótano', sub: 'Casa 14 · estudio de Irene', text: 'Un transmisor, un carrete y una puerta de hierro. El aire vibra. Las paredes están forradas de fieltro. Aquí se grabó NANA-18.' },
      pl_radio: { title: 'Radio Faro', sub: 'Torre de Punta Niebla · 91.7 FM', text: 'La emisora desde la que se emitió NANA. La llave que llevo tiene la frecuencia grabada. La torre sigue emitiendo algo.' },
      pl_tunnel: { title: 'El túnel', sub: 'Bajo Casa 14', text: 'Nadia desapareció por aquí. Irene decía que el mar no se lo llevó todo. No aparece en ningún mapa.' }
    },
    questions: {
      q_awake: { title: '¿Por qué sigo despierta?', text: 'Toda la ciudad duerme. El expediente dice que soy un sujeto de latencia estable. ¿Desperté por accidente o alguien me dejó despertar?' },
      q_voice: { title: '¿De quién es la voz que duerme la ciudad?', text: 'Elías dice que es mi voz. La cinta maestra contiene una segunda pista. Empecé a reconocer algo en la grabación. No quiero terminar de reconocerlo.' },
      q_nadia: { title: '¿Está Nadia viva?', text: 'Elías afirma que murió hace veinte años. Nadia está frente a mí, mojada de lluvia, con el impermeable de su madre. Alguien miente. O nadie recuerda bien.' },
      q_lucia: { title: '¿Qué le pasó a Lucía?', text: 'Desapareció hace catorce meses. Su voz está en la cinta. Elías la usó como portadora y luego la escondió. ¿Dónde se esconde una voz?' },
      q_last: { title: '¿Qué significa «la última mujer»?', text: 'Elías me llamó así por la radio. El cuaderno de la casa lo repite como una función, no como una condena. ¿La última mujer de qué?' },
      q_tunnel: { title: '¿Adónde lleva el túnel?', text: 'Nadia se fue por la puerta de hierro del sótano. Dijo que siempre ha habido un túnel. El mapa de Lucía termina en la Casa 14. El de Nadia empieza donde termina el mío.' }
    }
  };

  /* ============================================================
     DIÁLOGOS
     ============================================================ */
  S.dialogues = {
    radio_clinic: {
      start: 'a',
      nodes: {
        a: {
          lines: [
            { who: 'NARRACIÓN', text: 'La radio de control parpadea. La aguja sube y baja sola hasta detenerse en 91.7.', radio: true },
            { who: 'ELÍAS', portrait: 'elias', text: 'Mara. Por fin. Escúchame con atención.', radio: true },
            { who: 'MARA', portrait: 'mara', text: '¿Dónde está todo el mundo?', radio: true },
            { who: 'ELÍAS', portrait: 'elias', text: 'La ciudad está en cuarentena. Hubo una fuga en la Unidad de Sueño. No salgas de la clínica. Vuelve a la habitación 03 y espera.', radio: true },
            { who: 'MARA', portrait: 'mara', text: '¿Y Lucía?', radio: true },
            { who: 'ELÍAS', portrait: 'elias', text: 'Lucía está muerta, Mara. Lo sabes. Llevas catorce meses sabiéndolo.', radio: true }
          ],
          next: 'b'
        },
        b: {
          lines: [
            { who: 'RADIO', text: 'Un golpe de estática. Otra voz entra en la frecuencia, más cerca, como si hablara desde el pasillo.', radio: true },
            { who: 'NADIA', portrait: 'nadia', text: 'No le escuches. No está en la clínica. Está en la torre.', radio: true },
            { who: 'ELÍAS', portrait: 'elias', text: 'Nadia Voss murió hace veinte años. No dejes que una grabación te confunda.', radio: true },
            { who: 'NADIA', portrait: 'nadia', text: 'Casa 14, Calle Alhelí. La puerta del sótano conoce la canción de su madre. Trae el diapasón.', radio: true },
            { who: 'MARA', portrait: 'mara', text: '¿Por qué debería creer a una voz que no conozco?', radio: true },
            { who: 'NADIA', portrait: 'nadia', text: 'Porque él acaba de llamarte «la última mujer». No es un cumplido, Mara. Es una jaula.', radio: true }
          ],
          next: 'c'
        },
        c: {
          lines: [
            { who: 'ELÍAS', portrait: 'elias', text: 'Eres la última mujer despierta en esta ciudad. Si sales, te perderé. No me obligues a elegir.', radio: true },
            { who: 'NADIA', portrait: 'nadia', text: 'No eres la última. Estoy yo.', radio: true },
            { who: 'RADIO', text: 'La señal se corta. En el silencio queda una nota sostenida, como un diapasón golpeado.' }
          ],
          next: null
        }
      }
    },
    nadia_basement: {
      start: 'a',
      nodes: {
        a: {
          lines: [
            { who: 'NARRACIÓN', text: 'La figura está de espaldas, junto al transmisor. El impermeable amarillo gotea sobre el suelo de hormigón.' },
            { who: 'NADIA', portrait: 'nadia', text: 'No grites. Esta casa oye mejor que tú.' },
            { who: 'MARA', portrait: 'mara', text: 'Elías dijo que estabas muerta.' },
            { who: 'NADIA', portrait: 'nadia', text: 'Elías dice muchas cosas a la misma hora. Es su manera de mantener la señal.' },
            { who: 'MARA', portrait: 'mara', text: '¿Qué es este lugar?' },
            { who: 'NADIA', portrait: 'nadia', text: 'El estudio de mi madre. Él lo convirtió en una garganta.' }
          ],
          next: 'b'
        },
        b: {
          lines: [
            { who: 'NADIA', portrait: 'nadia', text: 'La ciudad duerme desde hace siete días. No está muerta. Y tú no eres la última mujer: eres la última que él necesita.' },
            { who: 'MARA', portrait: 'mara', text: '¿Por qué yo?' },
            { who: 'NADIA', portrait: 'nadia', text: 'Porque puedes operar el transmisor. Y porque crees que no queda nadie. Una mujer sola escucha mejor.' }
          ],
          choices: [
            { text: '¿Y la voz de la cinta?', next: 'voice' },
            { text: '¿Qué pasó con Lucía?', next: 'lucia' },
            { text: '¿Por qué debería creerte?', next: 'trust' }
          ]
        },
        voice: {
          lines: [
            { who: 'NADIA', portrait: 'nadia', text: 'La voz que emite NANA no es la tuya. Es la de tu hermana. Lucía la grabó antes de desaparecer. Tú mezclaste la cinta sin saber lo que decía. Él se aseguró de eso.' },
            { who: 'MARA', portrait: 'mara', text: 'No puede ser. Yo habría reconocido su voz.' },
            { who: 'NADIA', portrait: 'nadia', text: 'La procesaron, la ralentizaron, la enterraron bajo una portadora. Y tú llevas siete días sin oírte a ti misma. La memoria también se mezcla.' }
          ],
          next: 'gift'
        },
        lucia: {
          lines: [
            { who: 'NADIA', portrait: 'nadia', text: 'La usó como portadora y luego la escondió en el sistema. Puede que siga viva dentro del sueño. Puede que solo quede su voz. No lo sé. Él tampoco.' },
            { who: 'MARA', portrait: 'mara', text: '¿Cómo sabes todo esto?' },
            { who: 'NADIA', portrait: 'nadia', text: 'Porque esta casa era mía antes de ser suya. Y porque llevo veinte años escuchando sus mentiras desde el otro lado de una puerta.' }
          ],
          next: 'gift'
        },
        trust: {
          lines: [
            { who: 'NADIA', portrait: 'nadia', text: 'No deberías. Pero tienes un diapasón en el bolsillo y yo tengo una llave. Eso es más de lo que él quiere que tengas.' },
            { who: 'MARA', portrait: 'mara', text: '¿Por qué me ayudas?' },
            { who: 'NADIA', portrait: 'nadia', text: 'Porque si la ciudad se despierta, quizá él deje de hablar en mi cabeza. O quizá solo quiero que alguien más recuerde esta casa cuando yo ya no esté.' }
          ],
          next: 'gift'
        },
        gift: {
          lines: [
            { who: 'NADIA', portrait: 'nadia', text: 'Toma. La llave abre la emisora. La cinta está en el carrete. No la pongas aquí: el transmisor la devolvería a la ciudad. Llévala al refugio de la clínica.' },
            { who: 'MARA', portrait: 'mara', text: '¿Y tú?' },
            { who: 'NADIA', portrait: 'nadia', text: 'Hay un túnel. Siempre ha habido un túnel.' },
            { who: 'NARRACIÓN', text: 'Nadia camina hacia la puerta de hierro. La linterna parpadea. Cuando vuelve la luz, la puerta está abierta y ella ya no está.' },
            { who: 'NADIA', portrait: 'nadia', text: 'Mara. No dejes que te diga tu nombre por la radio. Es así como empieza.', radio: true }
          ],
          next: null
        }
      }
    },
    ending_tape: {
      start: 'a',
      nodes: {
        a: {
          lines: [
            { who: 'NARRACIÓN', text: 'El carrete gira. El magnetófono huele a polvo caliente. La voz que sale no es la mía.' },
            { who: 'LUCÍA', photo: 'lucia_photo', text: 'Prueba de voz NANA-18. Si alguien escucha esto... la ciudad no está enferma. Está siendo sostenida. La voz que la duerme es la mía.', radio: true },
            { who: 'MARA', portrait: 'mara', text: 'Lucía...' },
            { who: 'LUCÍA', photo: 'lucia_photo', text: 'Mara, no dejes que él te oiga dudar. Si despiertas... no vengas sola.', radio: true },
            { who: 'ELÍAS', portrait: 'elias', text: 'Ahora ya lo sabes. Eso no te hace libre. Te hace la última mujer que recuerda.', radio: true },
            { who: 'NADIA', portrait: 'nadia', text: 'No. Te hace la primera que puede responder.', radio: true },
            { who: 'NARRACIÓN', text: 'La cinta se detiene. En algún lugar bajo la ciudad, algo más empieza a girar.' }
          ],
          next: null
        }
      }
    }
  };

  /* ============================================================
     CINEMÁTICAS
     ============================================================ */
  S.intro = {
    kicker: 'PUERTO NIEBLA · DÍA 7',
    title: 'LA SEÑAL',
    lines: [
      'A las 19:42 del 18 de octubre, la ciudad dejó de hacer ruido.',
      'Siete días después, la lluvia sigue cayendo sobre las farolas encendidas, sobre las mesas puestas, sobre la ropa tendida.',
      'Tú eres la única persona que recuerda su propio nombre.',
      'O eso crees.'
    ],
    skip: 'La habitación 03 huele a desinfectante y a aceite.'
  };

  S.chapterEnd = {
    eyebrow: 'FIN DEL CAPÍTULO I',
    title: 'La señal',
    quote: '«No era mi voz. Era la de Lucía. Y la ciudad seguía escuchando.»',
    next: 'CAPÍTULO II · LA VOZ — PRÓXIMAMENTE',
    stats: ['Tiempo de vigilia', 'Documentos', 'Pistas', 'Lugares']
  };

  /* ============================================================
     CAMPAÑA — seis capítulos
     ============================================================ */
  S.campaign = [
    {
      no: 'I', title: 'La señal', available: true,
      location: 'Clínica Aurora · Calle Alhelí',
      description: 'Mara despierta en una ciudad que sueña. Una transmisión, una casa cerrada y una voz que no es la suya abren la primera grieta.',
      quote: '«La ciudad sigue aquí. Solo falta quien responda.»',
      contains: 'Prólogo · Casa 14 · El sótano · La cinta'
    },
    {
      no: 'II', title: 'La voz', available: false,
      location: 'Radio Faro · Punta Niebla',
      description: 'La llave de latón abre la emisora. En la torre, Elías emite una nueva orden cada noche. Mara debe encontrar la cinta maestra antes de que su propia voz sustituya la de Lucía.',
      quote: '«Una voz no es una persona. Pero puede ocupar su lugar.»',
      contains: 'La torre · El máster · La primera emisión'
    },
    {
      no: 'III', title: 'Los que duermen', available: false,
      location: 'Hospital de Puerto Niebla · Distrito Sur',
      description: 'La ciudad no está vacía. Está llena de gente que sueña. Mara aprende que los dormidos escuchan, obedecen y, a veces, recuerdan. El hospital guarda a los catorce primeros.',
      quote: '«No los despiertes. Todavía no saben que les falta algo.»',
      contains: 'Las salas · Los catorce · La memoria prestada'
    },
    {
      no: 'IV', title: 'Casa de muñecas', available: false,
      location: 'Casa 14 · Planta alta',
      description: 'La habitación de Irene sigue cerrada. Tras la puerta, la canción de cuna se convierte en un plano. Nadia no fue la única niña que aprendió a obedecer.',
      quote: '«Las casas también crían. Y también mienten.»',
      contains: 'La habitación de Irene · El túnel · La verdad de Nadia'
    },
    {
      no: 'V', title: 'El último faro', available: false,
      location: 'Torre de Radio Faro · 91.7',
      description: 'Elías prepara una emisión definitiva. Mara tiene una noche para entrar en la torre, enfrentarse a la voz que la sostiene y decidir qué se escucha en Puerto Niebla al amanecer.',
      quote: '«Si apagas el faro, ¿quién encuentra la orilla?»',
      contains: 'El asedio · La cabina · La elección'
    },
    {
      no: 'VI', title: 'La última mujer', available: false,
      location: 'Puerto Niebla · amanecer',
      description: 'La ciudad empieza a despertar. Mara descubre que la última mujer nunca fue la única superviviente, sino la última persona capaz de decidir qué voces merecen ser recordadas.',
      quote: '«No estás sola. Todavía no.»',
      contains: 'El amanecer · Las voces · El archivo final'
    }
  ];

  /* ============================================================
     TEXTOS DE APOYO
     ============================================================ */
  S.thoughts = {
    dark_room: 'La oscuridad no está vacía. Está esperando.',
    torch_found: 'La llama tiembla, pero se mantiene. Es lo más parecido a una promesa que tengo.',
    room_03_mirror: 'El espejo tiene un marco demasiado grueso para ser un espejo.',
    corridor_dark: 'El pasillo se traga la luz. Al fondo, una puerta de emergencia respira con la lluvia.',
    watcher_hall: 'Había alguien al final del pasillo. Cuando parpadeé, ya no estaba.',
    street_first: 'La lluvia sigue cayendo sobre una ciudad que ya no la escucha.',
    house_window: 'La ventana de la planta alta está encendida. Nadie ha pagado la luz en siete días.',
    photo_wall: 'Hay seis fotografías. En cinco sonríen. En la sexta, alguien me observa desde el borde del marco.',
    photo_hidden: 'Detrás de la foto familiar hay otra imagen. Soy yo, dormida en la habitación 03. La fecha es la noche de la emisión.',
    poem_found: 'La letra no es de Irene. Es de Lucía. Las cuatro palabras subrayadas dos veces: luna, mano, campana, cuervo.',
    basement_cold: 'El aire vibra antes de que suene nada. El sótano está escuchando.',
    transmitter: 'El transmisor está encendido. La aguja marca 91.7. Alguien ha estado emitiendo desde aquí hace muy poco.',
    nadia_seen: 'El impermeable amarillo gotea. No hay lluvia dentro de la casa.',
    tape_taken: 'La cinta está fría. En la etiqueta, la letra de Elías: PRUEBA DE VOZ — 18N.',
    refuge_return: 'La clínica sigue igual. Las camas ocupan los pasillos. Nadie se ha movido.',
    recorder: 'El magnetófono del control tiene una toma de carrete. La cinta encaja. Solo hay que girar la manivela.',
    key_taken: 'La llave pesa más de lo que debería. En el vástago, un número: 91.7.',
    door_no_fork: 'La puerta no tiene cerradura. Tiene una hendidura de latón y un oído.',
    door_with_fork: 'El diapasón entra en la hendidura. La casa espera cuatro marcas.',
    dial_wrong: 'Las marcas vuelven a su sitio. La casa no perdona las prisas.',
    chapter_done: 'La ciudad sigue durmiendo. Pero ahora sé de quién es la voz que la sostiene.'
  };

  S.toasts = {
    new_clue: 'Nueva pista en el diario',
    new_person: 'Nueva persona en el diario',
    new_place: 'Nuevo lugar en el diario',
    new_question: 'Nueva pregunta en el diario',
    saved: 'Progreso guardado',
    torch_low: 'La llama se está apagando',
    torch_empty: 'La antorcha se ha apagado',
    oil_used: 'Aceite añadido a la antorcha',
    no_oil: 'No queda aceite',
    item: 'Objeto adquirido'
  };
})();
