/**
 * IV Foro Internacional de Derecho y Tecnología — i18n vanilla
 *
 * Uso en HTML:
 *   <h1 data-i18n="hero_title">Título por default (es)</h1>
 *   <p data-i18n-html="hero_lead">Lead con <em>énfasis</em>...</p>
 *   <input data-i18n-attr="placeholder:input_email" placeholder="ejemplo@...">
 *   <button data-i18n-attr="aria-label:close_modal,title:close_modal">×</button>
 *
 * Switcher esperado:
 *   <div class="lang">
 *     <span data-lang="es" class="active">ES</span>·
 *     <span data-lang="en">EN</span>·
 *     <span data-lang="fr">FR</span>
 *   </div>
 *
 * Detección de idioma (en orden de precedencia):
 *   1. URL param ?lang=en
 *   2. localStorage 'forodyt_lang'
 *   3. Default 'es'
 *
 * Persiste preferencia entre páginas via localStorage.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'forodyt_lang';
  const DEFAULT_LANG = 'es';
  const SUPPORTED = ['es', 'en', 'fr'];

  // ============ DICCIONARIO ============
  // Convención de keys: <pagina>_<seccion>_<elemento>
  // pagina: nav, foot, idx (index), cfp, ins (inscripcion), legal
  // Si la key existe en es pero no en en/fr, se cae al texto original del HTML.
  const D = {
    es: {
      // ===== NAV (común a index e inscripcion) =====
      nav_back: 'Volver al sitio',
      nav_brand_sub: 'Derecho · Tecnología · 2026',
      nav_link_trayectoria: 'Trayectoria',
      nav_link_ejes: 'Ejes',
      nav_link_ponentes: 'Ponentes',
      nav_link_programa: 'Programa',
      nav_link_convocatoria: 'Convocatoria',
      nav_link_comite: 'Comité',
      nav_cta_inscripcion: 'Inscripción',

      // ===== INDEX · HERO =====
      idx_hero_eyebrow: 'Cuarta edición · 21–22 septiembre 2026',
      idx_hero_title_html: 'Foro Internacional de<br>Derecho y <em>Tecnología</em>.',
      idx_hero_lead: 'Dos jornadas itinerantes entre tres sedes para discutir cómo el derecho debe responder a la inteligencia artificial, la criptoeconomía, la ciberseguridad y la propiedad intelectual digital.',
      idx_hero_meta_dates_label: 'Fechas',
      idx_hero_meta_dates_value: '21 y 22 sep · 2026',
      idx_hero_meta_venue_label: 'Sede',
      idx_hero_meta_venue_value: 'CUCEA · CUGDL · Ciudad Judicial',
      idx_hero_meta_modality_label: 'Modalidad',
      idx_hero_meta_modality_value: 'Presencial e híbrida',
      idx_hero_meta_cost_label: 'Costo',
      idx_hero_meta_cost_value: 'Gratuito',
      idx_hero_cta_inscribirse: 'Inscribirse',
      idx_hero_cta_programa: 'Programa preliminar',

      // ===== INDEX · SECCIONES =====
      idx_trayectoria_eyebrow: 'Trayectoria',
      idx_trayectoria_title_html: 'Tres ediciones, una <em>conversación</em> sostenida.',
      idx_ejes_eyebrow: 'Ejes temáticos · IV edición',
      idx_ejes_title_html: 'Nueve <em>ejes</em>, una pregunta común.',
      idx_ponentes_eyebrow: 'Ponentes confirmados · en construcción',
      idx_ponentes_title_html: 'Voces de <em>tres continentes</em>.',
      idx_programa_eyebrow: 'Programa preliminar',
      idx_programa_title_html: 'Dos jornadas,<br>tres <em>sedes</em>.',
      idx_cfp_eyebrow: 'Convocatoria editorial',
      idx_cfp_title_html: 'Call for <em>Papers</em><br>IV edición.',
      idx_cfp_cta: 'Ver convocatoria completa',
      idx_comite_eyebrow: 'Comité organizador',
      idx_comite_title_html: 'Quien <em>convoca</em>.',

      // ===== INSCRIPCION · RIBBON =====
      ins_ribbon_eyebrow: 'Inscripción · Cuarta edición',
      ins_ribbon_title_html: 'Reserva tu <em>asiento</em><br>en la conversación.',
      ins_ribbon_lead_html: 'El acceso al Foro es <strong>gratuito</strong>. Tu inscripción genera un código QR único que sirve como credencial digital. Quienes acumulen <strong>20 horas efectivas</strong> de participación reciben constancia con valor curricular emitida por la Universidad de Guadalajara.',
      ins_meta_dates_label: 'Fechas',
      ins_meta_dates_value: '21 y 22 sep · 2026',
      ins_meta_venue_label: 'Sedes',
      ins_meta_venue_value: 'CUCEA · CUGDL · Ciudad Judicial',
      ins_meta_modality_label: 'Modalidad',
      ins_meta_modality_value: 'Presencial e híbrida',
      ins_meta_cost_label: 'Costo',
      ins_meta_cost_value: 'Gratuito',

      // ===== INSCRIPCION · TABS =====
      ins_tab1_title: 'Asistir al Foro',
      ins_tab1_sub: 'Público general · QR + constancia',
      ins_tab2_title: 'Enviar ponencia',
      ins_tab2_sub: 'Call for Papers · libro colectivo',
      ins_tab3_title: 'Solo actualizaciones',
      ins_tab3_sub: 'Sin compromiso · low-friction',

      // ===== INSCRIPCION · PANEL ASISTENTE =====
      ins_panel1_eyebrow: 'Formulario · 02 minutos',
      ins_panel1_title_html: 'Inscripción de <em>asistente</em>.',
      ins_panel1_intro: 'Con tus datos generamos un código QR único que recibirás por correo. Ese QR es tu credencial digital durante los dos días del Foro. Al ingresar el día 1, validamos tu identidad con INE o credencial UDG y se te coloca un brazalete oficial que acredita tu acceso a las tres sedes.',
      ins_label_nombre: 'Nombre completo',
      ins_placeholder_nombre: 'Tal como aparecerá en tu constancia',
      ins_hint_nombre: 'Verifica acentos y mayúsculas. La constancia se emite con este texto exacto.',
      ins_label_correo: 'Correo electrónico',
      ins_placeholder_correo: 'ejemplo@dominio.com',
      ins_label_correo2: 'Confirmar correo',
      ins_placeholder_correo2: 'Repite tu correo',
      ins_label_tipo: 'Tipo de participante',
      ins_tipo_estudiante_t: 'Estudiante',
      ins_tipo_estudiante_d: 'Licenciatura, maestría o doctorado',
      ins_tipo_academico_t: 'Académico / Investigador',
      ins_tipo_academico_d: 'Profesor, PTC, investigador SNII',
      ins_tipo_juridico_t: 'Profesional jurídico',
      ins_tipo_juridico_d: 'Abogado, notario, consultor',
      ins_tipo_publico_t: 'Sector público',
      ins_tipo_publico_d: 'Juez, magistrado, funcionario',
      ins_tipo_privado_t: 'Sector privado',
      ins_tipo_privado_d: 'Empresa, consultoría, LegalTech',
      ins_tipo_otro_t: 'Otro / Comunidad',
      ins_tipo_otro_d: 'Periodismo, ONG, ciudadanía',
      ins_label_grado: 'Grado académico cursado',
      ins_label_programa: 'Programa académico',
      ins_placeholder_programa: 'Ej. Lic. en Derecho',
      ins_label_snii: 'SNII',
      ins_label_area: 'Área / línea de investigación',
      ins_placeholder_area: 'Ej. IA y derechos humanos',
      ins_label_institucion: 'Institución u organización',
      ins_placeholder_institucion: 'Ej. Universidad de Guadalajara · CUCEA',
      ins_hint_institucion: 'Si eres parte de UDG, indica además tu centro universitario en el campo siguiente.',
      ins_label_pais: 'País de procedencia',
      ins_label_modalidad: 'Modalidad de asistencia',
      ins_mod_presencial_t: 'Presencial',
      ins_mod_presencial_d: 'Asistiré físicamente a las sedes',
      ins_mod_virtual_t: 'Virtual',
      ins_mod_virtual_d: 'Vía streaming oficial del Foro',
      ins_mod_mixta_t: 'Mixta',
      ins_mod_mixta_d: 'Algunas sesiones presenciales, otras virtuales',
      ins_label_fuente: '¿Cómo te enteraste del Foro?',
      ins_legal_aviso_html: 'He leído y acepto el <a href="#" id="open-aviso">Aviso de Privacidad</a> conforme a la LFPDPPP. Autorizo el tratamiento de mis datos personales para los fines del Foro: emisión de constancia, control de asistencia y comunicación oficial.<span class="req">*</span>',
      ins_legal_codigo_html: 'Acepto el <a href="#" id="open-codigo">Código de Conducta</a> del Foro y entiendo que el evento será grabado para fines académicos y de difusión.<span class="req">*</span>',
      ins_legal_news_html: '<span class="opt">(Opcional)</span> Quiero recibir comunicaciones sobre futuras ediciones del Foro y actividades del Cuerpo Académico UDG-CA-1236 «Derecho y Tecnología».',
      ins_btn_submit: 'Generar mi QR',
      ins_submit_note: 'Al enviar recibirás un correo con tu QR único. Si no llega en 5 minutos, revisa carpeta de SPAM o Promociones.',

      // ===== INSCRIPCION · SUCCESS =====
      ins_success_title_html: 'Inscripción <em>recibida</em>.',
      ins_success_lead: 'Te enviamos a tu correo el código QR único que servirá como tu credencial digital. Llévalo en el celular o impreso el día del evento. Día 1 validamos tu identidad con INE/credencial UDG y se te coloca el brazalete oficial.',
      ins_success_label_folio: 'Folio',
      ins_success_label_nombre: 'Nombre',
      ins_success_label_correo: 'Correo',
      ins_success_label_modalidad: 'Modalidad',
      ins_success_btn_programa: 'Ver el programa',
      ins_success_btn_otra: 'Inscribir otra persona',

      // ===== INSCRIPCION · PANEL CFP =====
      ins_panel2_eyebrow: 'Convocatoria · Call for Papers',
      ins_panel2_title_html: 'Envía tu <em>contribución</em>.',
      ins_panel2_intro: 'El Comité Científico recibe propuestas en español, inglés y francés sobre los nueve ejes temáticos de la cuarta edición. Los papers aceptados se publican en libro colectivo bajo Editorial Universidad de Guadalajara, con DOI por capítulo.',

      // ===== INSCRIPCION · PANEL NEWSLETTER =====
      ins_panel3_eyebrow: 'Solo actualizaciones',
      ins_panel3_title_html: 'Quédate al <em>tanto</em>.',
      ins_panel3_intro: 'Si aún no decides si asistirás pero quieres recibir el programa final, anuncios de ponentes y materiales pos-evento, deja tu correo. Sin compromiso, sin spam, una comunicación por mes máximo.',
      ins_nl_label: 'Correo electrónico',
      ins_nl_btn: 'Suscribirme',
      ins_nl_note: 'Al suscribirte aceptas recibir comunicaciones del Foro Internacional de Derecho y Tecnología. Puedes darte de baja en cualquier momento desde el pie de cualquier correo.',

      // ===== INSCRIPCION · BANNER ERROR =====
      ins_error_title: 'No pudimos enviar tu inscripción.',
      ins_error_detail_html: 'Verifica tu conexión a internet e intenta de nuevo. Si el problema persiste, escribe a <a href="mailto:emmanueldelva@cucea.udg.mx" style="color: inherit; text-decoration: underline;">emmanueldelva@cucea.udg.mx</a> con asunto «error inscripción».',

      // ===== CFP =====
      cfp_eyebrow: 'Call for Papers · 2026',
      cfp_title: 'Foro Internacional de Derecho y Tecnología',
      cfp_subtitle_html: '“Agentes, Algoritmos y Autonomía:<br>el Derecho ante la Inteligencia que Decide”',
      cfp_venue_html: '<strong>21 y 22 de septiembre de 2026</strong>  ·  Modalidad híbrida  ·  Zapopan, Jalisco',
      cfp_convoca_label: 'Convoca',
      cfp_convoca_value: 'Universidad de Guadalajara · Cuerpo Académico UDG-CA-1236 «Derecho y Tecnología» · Centro Universitario de Ciencias Económico-Administrativas (CUCEA) · Centro Universitario de Guadalajara (CUGDL) · Departamento de Ciencias Sociales y Jurídicas · Academia de Derecho Económico Empresarial e Internacional',
      cfp_colab_label: 'En colaboración institucional con',
      cfp_colab_value: 'Supremo Tribunal de Justicia del Estado de Jalisco · Poder Judicial del Estado de Jalisco',
      cfp_section1: 'I · COMITÉ ORGANIZADOR',
      cfp_section2: 'II · PRESENTACIÓN',
      cfp_section3: 'III · FECHAS CLAVE',
      cfp_section4: 'IV · LÍNEAS TEMÁTICAS',
      cfp_section5: 'V · ENVÍO Y PROCESO DE SELECCIÓN',
      cfp_section6: 'VI · ESTRUCTURA Y PRESENTACIÓN',
      cfp_section7: 'VII · REVISIÓN Y PUBLICACIÓN',
      cfp_section8: 'VIII · NORMAS DE ESTILO Y CITACIÓN',
      cfp_role_direccion: 'Dirección Académica',
      cfp_role_secretaria: 'Secretaría Académica',
      cfp_role_tecnologia_html: 'Tecnología y Logística',
      cfp_role_editorial_html: 'Coordinación Editorial<br>y Comité Científico',
      cfp_date1_step: '01 · Recepción',
      cfp_date1_label: 'envío de trabajos',
      cfp_date1_value_html: '1 de mayo —<br>15 de julio 2026',
      cfp_date2_step: '02 · Dictamen',
      cfp_date2_label: 'notificación de aceptación',
      cfp_date2_value_html: '20 de agosto<br>2026',
      cfp_date3_step: '03 · Evento',
      cfp_date3_label: 'celebración del foro',
      cfp_date3_value: '21 y 22 de septiembre 2026',
      cfp_topic1_t: 'IA Agéntica y Propiedad Intelectual Generativa',
      cfp_topic2_t: 'Tecnologías Emergentes',
      cfp_topic3_t: 'Ciberseguridad y Soberanía Digital',
      cfp_topic4_t: 'Justicia Digital e Innovación Jurídica',
      cfp_topic5_t: 'Derechos Humanos Digitales',
      cfp_topic6_t: 'FinTech y Economía Digital',
      cfp_topic7_t: 'Salud Digital y Biotecnologías',
      cfp_envelope_corr: 'Correspondencia editorial',
      cfp_envelope_subject: 'Asunto del correo',
      cfp_envelope_body: 'Cuerpo del correo',
      cfp_envelope_attach: 'Archivo adjunto',
      cfp_callout_title: 'Recordatorio final',

      // ===== FOOTER (común) =====
      foot_copy: '© 2026 · IV Foro Internacional de Derecho y Tecnología',
      foot_inst: 'CUCEA · Universidad de Guadalajara'
    },

    en: {
      // ===== NAV =====
      nav_back: 'Back to site',
      nav_brand_sub: 'Law · Technology · 2026',
      nav_link_trayectoria: 'History',
      nav_link_ejes: 'Tracks',
      nav_link_ponentes: 'Speakers',
      nav_link_programa: 'Program',
      nav_link_convocatoria: 'Call',
      nav_link_comite: 'Committee',
      nav_cta_inscripcion: 'Register',

      // ===== INDEX · HERO =====
      idx_hero_eyebrow: 'Fourth edition · 21 and 22 September · 2026',
      idx_hero_title_html: 'International Forum<br>on Law<br><span class="accent">and Technology</span>',
      idx_hero_lead: 'Two itinerant days across three venues to discuss how the law must respond to artificial intelligence, the crypto-economy, cybersecurity and digital intellectual property.',
      idx_hero_meta_dates_label: 'Dates',
      idx_hero_meta_dates_value: '21 & 22 Sep · 2026',
      idx_hero_meta_venue_label: 'Venue',
      idx_hero_meta_venue_value: 'CUCEA · CUGDL · Judicial City',
      idx_hero_meta_modality_label: 'Format',
      idx_hero_meta_modality_value: 'On-site and hybrid',
      idx_hero_meta_cost_label: 'Cost',
      idx_hero_meta_cost_value: 'Free',
      idx_hero_cta_inscribirse: 'Register',
      idx_hero_cta_programa: 'Preliminary program',

      // ===== INDEX · SECCIONES =====
      idx_trayectoria_eyebrow: 'History',
      idx_trayectoria_title_html: 'Four <em>editions</em>,<br>one conversation.',
      idx_ejes_eyebrow: 'Thematic tracks · 4th edition',
      idx_ejes_title_html: 'Nine simultaneous<br><em>conversations</em>.',
      idx_ponentes_eyebrow: 'Speakers · 4th edition',
      idx_ponentes_title_html: 'Voices of the <em>discussion</em>.',
      idx_programa_eyebrow: 'Preliminary program',
      idx_programa_title_html: 'Two days,<br>three <em>venues</em>.',
      idx_cfp_eyebrow: 'Editorial call',
      idx_cfp_title_html: 'Call for <em>Papers</em><br>4th edition.',
      idx_cfp_cta: 'Read full call',
      idx_comite_eyebrow: 'Organizing Committee',
      idx_comite_title_html: 'Those who make the Forum<br><em>possible</em>.',

      // ===== INSCRIPCION · RIBBON =====
      ins_ribbon_eyebrow: 'Registration · Fourth edition',
      ins_ribbon_title_html: 'Reserve your <em>seat</em><br>in the conversation.',
      ins_ribbon_lead_html: 'Access to the Forum is <strong>free</strong>. Your registration generates a unique QR code that serves as your digital credential. Attendees who accumulate <strong>20 effective hours</strong> of participation receive a certificate with academic credit value issued by the University of Guadalajara.',
      ins_meta_dates_label: 'Dates',
      ins_meta_dates_value: '21 & 22 Sep · 2026',
      ins_meta_venue_label: 'Venues',
      ins_meta_venue_value: 'CUCEA · CUGDL · Judicial City',
      ins_meta_modality_label: 'Format',
      ins_meta_modality_value: 'On-site and hybrid',
      ins_meta_cost_label: 'Cost',
      ins_meta_cost_value: 'Free',

      // ===== INSCRIPCION · TABS =====
      ins_tab1_title: 'Attend the Forum',
      ins_tab1_sub: 'General audience · QR + certificate',
      ins_tab2_title: 'Submit a paper',
      ins_tab2_sub: 'Call for Papers · edited volume',
      ins_tab3_title: 'Updates only',
      ins_tab3_sub: 'No commitment · low-friction',

      // ===== INSCRIPCION · PANEL ASISTENTE =====
      ins_panel1_eyebrow: 'Form · 2 minutes',
      ins_panel1_title_html: 'Attendee <em>registration</em>.',
      ins_panel1_intro: 'With your details we generate a unique QR code that you will receive by email. That QR is your digital credential during the two days of the Forum. On day 1, we validate your identity with a government-issued ID or UDG credential and place an official wristband that grants access to all three venues.',
      ins_label_nombre: 'Full name',
      ins_placeholder_nombre: 'As it will appear on your certificate',
      ins_hint_nombre: 'Verify accents and capitalization. The certificate is issued with this exact text.',
      ins_label_correo: 'Email address',
      ins_placeholder_correo: 'example@domain.com',
      ins_label_correo2: 'Confirm email',
      ins_placeholder_correo2: 'Repeat your email',
      ins_label_tipo: 'Type of participant',
      ins_tipo_estudiante_t: 'Student',
      ins_tipo_estudiante_d: 'Bachelor, master or doctoral',
      ins_tipo_academico_t: 'Academic / Researcher',
      ins_tipo_academico_d: 'Professor, full-time faculty, SNII researcher',
      ins_tipo_juridico_t: 'Legal professional',
      ins_tipo_juridico_d: 'Lawyer, notary, consultant',
      ins_tipo_publico_t: 'Public sector',
      ins_tipo_publico_d: 'Judge, magistrate, public official',
      ins_tipo_privado_t: 'Private sector',
      ins_tipo_privado_d: 'Company, consulting, LegalTech',
      ins_tipo_otro_t: 'Other / Community',
      ins_tipo_otro_d: 'Journalism, NGO, citizenship',
      ins_label_grado: 'Academic degree',
      ins_label_programa: 'Academic program',
      ins_placeholder_programa: 'e.g. Bachelor in Law',
      ins_label_snii: 'SNII (Mexican research system)',
      ins_label_area: 'Research area / line',
      ins_placeholder_area: 'e.g. AI and human rights',
      ins_label_institucion: 'Institution or organization',
      ins_placeholder_institucion: 'e.g. University of Guadalajara · CUCEA',
      ins_hint_institucion: 'If you are part of UDG, please specify your university center in the next field.',
      ins_label_pais: 'Country of origin',
      ins_label_modalidad: 'Attendance format',
      ins_mod_presencial_t: 'On-site',
      ins_mod_presencial_d: 'I will physically attend the venues',
      ins_mod_virtual_t: 'Virtual',
      ins_mod_virtual_d: 'Via the Forum official streaming',
      ins_mod_mixta_t: 'Hybrid',
      ins_mod_mixta_d: 'Some sessions on-site, others virtual',
      ins_label_fuente: 'How did you hear about the Forum?',
      ins_legal_aviso_html: 'I have read and accept the <a href="#" id="open-aviso">Privacy Notice</a> (in Spanish only, as required by Mexican LFPDPPP). I authorize the processing of my personal data for the Forum: certificate issuance, attendance control and official communication.<span class="req">*</span>',
      ins_legal_codigo_html: 'I accept the <a href="#" id="open-codigo">Code of Conduct</a> (in Spanish) of the Forum and understand that the event will be recorded for academic and dissemination purposes.<span class="req">*</span>',
      ins_legal_news_html: '<span class="opt">(Optional)</span> I want to receive communications about future editions of the Forum and activities of the Academic Body UDG-CA-1236 «Law and Technology».',
      ins_btn_submit: 'Generate my QR',
      ins_submit_note: 'Once submitted you will receive an email with your unique QR. If it does not arrive in 5 minutes, check your SPAM or Promotions folder.',

      // ===== INSCRIPCION · SUCCESS =====
      ins_success_title_html: 'Registration <em>received</em>.',
      ins_success_lead: 'We sent your unique QR code to your email — it will serve as your digital credential. Bring it on your phone or printed on the day of the event. On day 1 we validate your identity with ID/UDG credential and place the official wristband.',
      ins_success_label_folio: 'Folio',
      ins_success_label_nombre: 'Name',
      ins_success_label_correo: 'Email',
      ins_success_label_modalidad: 'Format',
      ins_success_btn_programa: 'See the program',
      ins_success_btn_otra: 'Register another person',

      // ===== INSCRIPCION · PANEL CFP =====
      ins_panel2_eyebrow: 'Call · Call for Papers',
      ins_panel2_title_html: 'Submit your <em>contribution</em>.',
      ins_panel2_intro: 'The Scientific Committee accepts proposals in Spanish, English and French on the nine thematic tracks of the fourth edition. Accepted papers are published in an edited volume by University of Guadalajara Press, with DOI per chapter.',

      // ===== INSCRIPCION · PANEL NEWSLETTER =====
      ins_panel3_eyebrow: 'Updates only',
      ins_panel3_title_html: 'Stay <em>posted</em>.',
      ins_panel3_intro: 'If you have not yet decided whether to attend but want to receive the final program, speaker announcements and post-event materials, leave your email. No commitment, no spam, one communication per month maximum.',
      ins_nl_label: 'Email address',
      ins_nl_btn: 'Subscribe',
      ins_nl_note: 'By subscribing you accept to receive communications from the International Forum on Law and Technology. You can unsubscribe at any time from the footer of any email.',

      // ===== INSCRIPCION · BANNER ERROR =====
      ins_error_title: 'We could not submit your registration.',
      ins_error_detail_html: 'Check your internet connection and try again. If the problem persists, write to <a href="mailto:emmanueldelva@cucea.udg.mx" style="color: inherit; text-decoration: underline;">emmanueldelva@cucea.udg.mx</a> with subject «registration error».',

      // ===== CFP =====
      cfp_eyebrow: 'Call for Papers · 2026',
      cfp_title: 'International Forum on Law and Technology',
      cfp_subtitle_html: '"Agents, Algorithms and Autonomy:<br>the Law before the Intelligence that Decides"',
      cfp_venue_html: '<strong>21 & 22 September 2026</strong>  ·  Hybrid format  ·  Zapopan, Jalisco',
      cfp_convoca_label: 'Convened by',
      cfp_convoca_value: 'University of Guadalajara · Academic Body UDG-CA-1236 «Law and Technology» · Center for Economic-Administrative Sciences (CUCEA) · University Center of Guadalajara (CUGDL) · Department of Social and Legal Sciences · Academy of Economic, Business and International Law',
      cfp_colab_label: 'In institutional collaboration with',
      cfp_colab_value: 'Supreme Court of Justice of the State of Jalisco · Judicial Power of the State of Jalisco',
      cfp_section1: 'I · ORGANIZING COMMITTEE',
      cfp_section2: 'II · PRESENTATION',
      cfp_section3: 'III · KEY DATES',
      cfp_section4: 'IV · THEMATIC TRACKS',
      cfp_section5: 'V · SUBMISSION AND SELECTION PROCESS',
      cfp_section6: 'VI · STRUCTURE AND PRESENTATION',
      cfp_section7: 'VII · REVIEW AND PUBLICATION',
      cfp_section8: 'VIII · STYLE AND CITATION GUIDELINES',
      cfp_role_direccion: 'Academic Direction',
      cfp_role_secretaria: 'Academic Secretariat',
      cfp_role_tecnologia_html: 'Technology and Logistics',
      cfp_role_editorial_html: 'Editorial Coordination<br>and Scientific Committee',
      cfp_role_director: 'Forum Director',
      cfp_role_comite: 'Organizing Committee',
      cfp_affil_lider: 'Head of the Academic Body UDG-CA-1236 «Law and Technology»',
      cfp_affil_miembro: 'Member of the Academic Body UDG-CA-1236 «Law and Technology»',
      cfp_affil_colab: 'Collaborator of the Academic Body UDG-CA-1236 «Law and Technology»',
      cfp_affil_depto: 'Department of Social and Legal Sciences · CUCEA-UDG',
      idx_comite_p1_role: 'Forum Director',
      idx_comite_p1_affil: 'Head of the Academic Body UDG-CA-1236 «Law and Technology»',
      idx_comite_role: 'Organizing Committee',
      idx_comite_affil_miembro: 'Member of the Academic Body UDG-CA-1236 «Law and Technology»',
      idx_comite_affil_colab: 'Collaborator of the Academic Body UDG-CA-1236 «Law and Technology»',
      idx_comite_affil_depto: 'Department of Social and Legal Sciences · CUCEA-UDG',
      // Roles específicos del comité (cada miembro tiene un cargo distinto)
      idx_comite_role_director: 'Forum Director',
      idx_comite_role_secacademica: 'Academic Secretariat',
      idx_comite_role_sectecnica: 'Technical Secretariat',
      idx_comite_role_coordeditorial: 'Editorial Coordination and Scientific Committee',
      idx_comite_role_tecnologia: 'Technology and Logistics',
      idx_comite_role_protocolo: 'Protocol and Cultural Liaison',
      // Mismo set para cfp.html (roles específicos en lugar del genérico Comité Organizador)
      cfp_role_secacademica: 'Academic Secretariat',
      cfp_role_sectecnica: 'Technical Secretariat',
      cfp_role_coordeditorial: 'Editorial Coordination and Scientific Committee',
      cfp_role_tecnologia: 'Technology and Logistics',
      cfp_role_protocolo: 'Protocol and Cultural Liaison',
      idx_comite_lead: 'The Forum is an academic initiative of the Academic Body UDG-CA-1236 «Law and Technology», coordinated with the Department of Social and Legal Sciences and the Academy of Economic, Business and International Law, both of CUCEA. The fourth edition is held in partnership with CUGDL University Center and the Judicial City of the State of Jalisco.',
      prog_eyebrow: 'Preliminary program',
      prog_title_html: 'In <em>preparation</em>.',
      prog_message_html: 'We are currently working on the program and the speakers\' schedule. The full program will be announced in the weeks leading up to the event, once the Scientific Committee has confirmed all speakers and panel compositions.',
      prog_subtext: 'In the meantime, you can already register, submit a paper or subscribe to receive the final program by email.',
      prog_cta_inscripcion: 'Register for the Forum',
      prog_cta_cfp: 'Read the call for papers',
      prog_cta_back: '← Back to the site',
      prog_meta_dates_label: 'Dates',
      prog_meta_dates_value: '21 & 22 Sep · 2026',
      prog_meta_venue_label: 'Venues',
      prog_meta_venue_value: 'CUCEA · CUGDL · Judicial City',
      prog_meta_modality_label: 'Format',
      prog_meta_modality_value: 'On-site and hybrid',

      // Ponentes placeholder + confirmados
      idx_ponente_pc: 'To be confirmed',
      idx_ponente_confirmed_badge: 'CONFIRMED',
      idx_ponentes_lead_html: 'The Scientific Committee is finalizing confirmations for the fourth edition. Invitations are announced weekly on the Forum\'s official channels. The curation preserves the balance between <strong>academia, judiciary and legislative sectors, private sector and national and international bodies with regulatory functions</strong> that has distinguished the event since the I edition. Among the first confirmed speakers are <em>Dr. Alejandro Axel Rivera Martínez</em>, Director General of the Jalisco Institute of Forensic Sciences, and <em>Dr. Manuel Raad Berrio</em>, Auxiliary Magistrate of the Superior Council of the Judiciary of Colombia.',
      idx_ponente_rivera_affil: 'Director General · Jalisco Institute of Forensic Sciences',
      idx_ponente_rivera_topic_html: 'Track iv · Digital Justice  |  Track v · Digital Human Rights',
      idx_ponente_rivera_talk: '«Technology, forensic sciences and rights: AI-based craniometric identification at the Jalisco Institute of Forensic Sciences»',
      idx_ponente_raad_affil: 'Auxiliary Magistrate · Superior Council of the Judiciary · Colombia',
      idx_ponente_raad_topic_html: 'Track iv · Digital Justice  |  Track iii · Emerging Technologies',
      idx_ponente_raad_talk: '«21st-century courts: emerging technologies and new paradigms in the administration of justice»',
      idx_ponentes_cta_text: 'List in progress · Confirmations are published weekly',
      idx_ponentes_cta_btn: 'Receive updates',

      // Trayectoria - 4 ediciones
      idx_trayectoria_lead_html: 'Since 2023, the Forum has gathered at CUCEA jurists, engineers, judges, regulators and academics from three continents to discuss how the law must respond to artificial intelligence, the crypto-economy, cybersecurity and digital intellectual property. Each edition is a chapter of the editorial series <em>Innovación Jurídica en la era digital</em>.',
      idx_edition_label: ' Edition',
      idx_status_memoria: 'Memoir',
      idx_status_proxima: 'Upcoming',
      idx_stat_presencial: 'On-site format',
      idx_stat_hibrida: 'Hybrid format',
      idx_ed1_title: 'Origin of the International Forum',
      idx_ed1_stat1: 'Founding edition',
      idx_ed2_title: 'Thematic consolidation and Scientific Committee',
      idx_ed2_stat1: '7 consolidated tracks',
      idx_ed3_title: 'International leap: 6 countries, 30+ speakers',
      idx_ed3_stat1: '6 countries',
      idx_ed3_stat2: '30+ speakers',
      idx_ed4_title: 'Agentic justice and regulated intelligence',
      idx_ed4_stat1: '9 tracks (7 + 2 emerging)',
      idx_ed4_stat2: 'Open call',

      // Ejes temáticos
      idx_eje_tag_eje: 'Track',
      idx_eje_tag_emergente: 'Emerging',
      idx_eje1_title: 'Artificial Intelligence<br>and Law',
      idx_eje1_desc: 'Regulation of foundation models, algorithmic governance, civil and criminal liability for autonomous systems.',
      idx_eje2_title: 'Privacy, Cybersecurity<br>and Citizen Security',
      idx_eje2_desc: 'Personal data protection, international transfers, state surveillance and digital rights.',
      idx_eje3_title: 'Blockchain, Crypto-assets<br>and Metaverses',
      idx_eje3_desc: 'Asset tokenization, FinTech regulation, digital identity and jurisdiction in virtual environments.',
      idx_eje4_title: 'Emerging Technologies<br>and Regulation',
      idx_eje4_desc: 'Regulatory sandboxes, algorithmic impact assessment, certification and technical standardization.',
      idx_eje5_title: 'Technology<br>and Environment',
      idx_eje5_desc: 'Environmental footprint of AI, digital ecological law, sustainability and planned obsolescence.',
      idx_eje6_title: 'Digital Law<br>and Intellectual Property',
      idx_eje6_desc: 'AI-generated works, right to repair, digital public domain and secondary markets.',
      idx_eje7_title: 'Innovation and Technology<br>in Conflict Resolution',
      idx_eje7_desc: 'ODR, AI-assisted mediation, predictive justice and digital access to justice.',
      idx_eje8_title: 'Agentic AI and Generative<br>Intellectual Property',
      idx_eje8_desc: 'Multi-agent systems, algorithmic authorship, synthetic licensing and protection of derivative works.',
      idx_eje9_title: 'Digital Health<br>and Biotechnologies',
      idx_eje9_desc: 'Telemedicine, genomic data, algorithmic medical devices and computational bioethics.',

      // Aliados
      idx_aliados_eyebrow: 'Institutional frameworks and associated networks',
      idx_aliados_title_html: 'The Forum <em>does not walk</em> alone.',

      // CFP del index
      idx_cfp_p1_html: 'The Scientific Committee invites researchers and professionals in law and technology to submit original contributions to the <strong>fourth edition</strong> of the International Forum on Law and Technology.',
      idx_cfp_p2_html: 'Accepted contributions will be published in the collective book of the series <strong><em>Innovación Jurídica en la era digital</em></strong>, after double-blind peer review by two members of the Scientific Committee.',
      idx_cfp_p3: 'Contributions are accepted in Spanish, English and French. The nine thematic tracks are open for submission.',
      idx_cfp_btn_full: 'Read full call',
      idx_cfp_btn_send: 'Submit contribution',
      idx_cfp_dates_title: 'Critical dates',
      idx_cfp_dl1_label: 'Call opens',
      idx_cfp_dl1_date: 'May · 2026',
      idx_cfp_dl2_label: 'Extended abstract submission',
      idx_cfp_dl2_date: 'Jun · 2026',
      idx_cfp_dl3_label: 'Acceptance notification',
      idx_cfp_dl3_date: 'Jul · 2026',
      idx_cfp_dl4_label: 'Final manuscript submission',
      idx_cfp_dl4_date: 'Aug · 2026',
      idx_cfp_dl5_label: 'Forum · IV edition',
      idx_cfp_dl5_date: '21-22 Sep · 2026',
      idx_cfp_dl6_label: 'Memoir publication',
      idx_cfp_dl6_date: '2027',
      idx_cfp_norms_title: 'Editorial standards',
      idx_cfp_norm1: '· Length: 15-20 pages per chapter',
      idx_cfp_norm2: '· Typography: Times New Roman 12 / 1.5',
      idx_cfp_norm3: '· Footnotes: TNR 10 single-spaced',
      idx_cfp_norm4: '· Citations: legal standard',
      idx_cfp_norm5: '· Numbering: I. → 1. → a.',
      idx_cfp_norm6: '· Double-blind · Scientific Committee',

      // CFP completo (cfp.html) - secciones largas
      cfp_pres_p1_html: 'The University of Guadalajara, through the Academic Body UDG-CA-1236 «Law and Technology», with the support of CUCEA and CUGDL, and in institutional collaboration with the Supreme Court of Justice of the State of Jalisco, invites researchers, academics, professionals and doctoral, master\'s and bachelor\'s students interested in the intersection of law and technology to contribute to the <em>fourth edition</em> of the International Forum on Law and Technology.',
      cfp_pres_p2: 'The opening day will take place at CUCEA, while the closing day will be itinerant between CUGDL and the Judicial City of the State of Jalisco, articulating a tripartite dialogue between academia, university teaching and the State judiciary.',
      cfp_pres_p3: 'This event seeks to foster dialogue on technological innovations in law, share best practices and explore new regulations that will shape the legal future in a constantly transforming global context.',
      cfp_pres_p4: 'We invite original, rigorous and proactive contributions that offer doctrinal analyses, comparative studies and concrete normative responses to the emerging challenges of the digital society.',
      cfp_topic1_d: 'Algorithmic governance, civil and criminal liability of autonomous systems, authorship of synthetic works, model training and AI Act in Latin America.',
      cfp_topic2_d: 'Quantum computing, neurotechnologies, extended realities, digital twins and anticipatory governance.',
      cfp_topic3_d: 'Personal data protection, new LFPDPPP, critical infrastructure and cyber-defense.',
      cfp_topic4_d: 'ODR, augmented legal intelligence, LegalTech, judicial automation and access to justice.',
      cfp_topic5_d: 'Algorithmic democracy, disinformation, neuro-rights and data economy.',
      cfp_topic6_d: 'Crypto-assets, DeFi, tokenization, central bank digital currencies and financial regulation.',
      cfp_topic7_d: 'Telemedicine, connected devices, biomedical data and gene editing.',
      cfp_envio_p1_html: 'Submissions will undergo double-blind peer review. Selected contributions will be published in a collective book with ISBN. Contributions are accepted in <strong>Spanish, English and French</strong>.',
      cfp_envelope_body_p_html: 'Include: <span class="badge">thematic track</span><span class="badge">title</span><span class="badge">position</span><span class="badge">institution</span> and <span class="badge">format</span> (on-site / online).',
      cfp_envelope_attach_p_html: 'Word format (<span class="mono">.doc</span> or <span class="mono">.docx</span>).',
      cfp_spec1_html: '<strong>Length.</strong> Minimum 15 and maximum 20 pages, including references and annexes.',
      cfp_spec2_html: '<strong>Heading.</strong> Title, full author name, single position and institutional affiliation.',
      cfp_spec3_html: '<strong>Index.</strong> Summary of the key points of the work. No <em>abstract</em> required.',
      cfp_spec4_html: '<strong>Font and format.</strong> Times New Roman 12 pt, line spacing 1.5 for main text; Times New Roman 10 pt, single line spacing for footnotes.',
      cfp_spec6_html: '<strong>Citations.</strong> In footnotes, according to the standards of legal publications (see section VIII).',
      cfp_rev_p1_html: 'The evaluation will be carried out under strict anonymity. Each contribution will receive a sequential number from the organizing committee; two members of the scientific committee, without prior knowledge of the authorship, will judge each work guaranteeing impartiality and judgment based on <em>quality, originality and relevance</em> of the content.',
      cfp_rev_p2_html: 'In a later phase, the scientific committee will deliberate to select the most outstanding contributions, considering the topicality of the subject, the uniqueness of the perspective, the clarity of exposition and the contribution to the Forum\'s dialogue. Accepted and presented works will be considered for inclusion in the <strong>commemorative collective book</strong> of the IV edition.',
      cfp_callout_body: 'Before submitting your proposal, carefully verify compliance with the style and citation standards established here. The quality of the presentation and adherence to these guidelines are determining factors in the selection process.',
      cfp_citas_intro: 'Citations must be presented in footnotes, with sufficient data for the precise location of each source. Reference examples are provided:',

      // Footer columns
      foot_col_edition: 'Edition IV',
      foot_col_institutional: 'Institutional',
      foot_col_memorias: 'Past editions',
      foot_col_contact: 'Contact',
      foot_memoria_i: 'I International Forum on Law and Technology',
      foot_memoria_ii: 'II International Forum on Law and Technology',
      foot_memoria_iii: 'III International Forum on Law and Technology',
      foot_brand_tagline_html: 'Law and Technology.<br>Four editions. An open conversation between law and what comes next.',

      // Memorias (genéricos)
      mem_meta_dates_label: 'Date',
      mem_meta_venue_label: 'Venue',
      mem_meta_modality_label: 'Format',
      mem_resena_title: 'Overview',
      mem_galeria_title: 'Gallery',
      mem_galeria_placeholder: 'Coming soon',
      mem_other_editions: 'Other editions',
      mem_link_iv: 'IV Forum · 2026',

      // Memoria I (2023)
      mem1_eyebrow: 'I Edition · 2023',
      mem1_title_html: 'I International Forum<br>on Law and <em>Technology</em>.',
      mem1_lead: 'Founding edition of the Forum. Inaugural gathering at CUCEA with the participation of the Academic Body UDG-CA-1236 «Law and Technology», dedicated to opening institutional dialogue between legal academia and the emerging challenges of the digital society.',
      mem1_meta_dates_value: '2023',
      mem1_meta_venue_value: 'CUCEA · University of Guadalajara',
      mem1_meta_modality_value: 'On-site',
      mem1_resena_p1: '[To be completed.] Reserved space for the detailed overview of the first edition of the Forum: institutional context, thematic tracks, main speakers, conclusions and resulting publications.',
      mem1_resena_p2: 'This first edition laid the foundations of the Forum as a plural academic space where lawyers, engineers, judges and regulators from Iberoamerica discuss how the law must respond to artificial intelligence, the crypto-economy, cybersecurity and digital intellectual property.',

      // ===== MEMORIA I (página completa) =====
      m1_badge: 'I Edition · 14–15 November 2023',
      m1_title_html: 'I International Forum<br>on Law and <em>Technology</em>.',
      m1_lede_html: 'The <strong>founding edition</strong>. Two days in which CUCEA brought together the Senate of the Republic, the Office of the CUCEA Rector and, throughout the program, the <strong>presidencies of the Supreme Court of Justice of the State of Jalisco, COFECE, INAI, the Mexican Academy of Cybersecurity and Digital Law (AMCID), the Mexican Academy of Computer Law (AMDI) and ALGDETIC</strong>, along with the international presidency of the <strong>Ibero-American Federation of Law and Informatics Associations (FIADI)</strong>. For the first time officially in Jalisco, the conversation between Mexican law and the technologies that are rewriting everything: artificial intelligence, cybersecurity, blockchain, digital ADR and privacy.',
      m1_stat1_k: 'Date',
      m1_stat1_v_html: '14–15 Nov<br>2023',
      m1_stat2_k: 'Venue',
      m1_stat2_v_html: 'CUCEA · UDG<br>Zapopan, Jalisco',
      m1_stat3_k: 'Format',
      m1_stat3_v_html: 'On-site<br>+ virtual',
      m1_stat4_k: 'Motto',
      m1_stat4_v_html: 'Legal innovation<br>in the digital era',
      // I Reseña
      m1_s1_label: 'Overview · The origin',
      m1_s1_title_html: 'When Mexican law <em>decided</em> to sit at the table with technology.',
      m1_s1_p1_html: 'On November 14, 2023, the Central Auditorium of CUCEA became something unusual: a real meeting point between <strong>legislative, judicial and executive branches, academia, private sector and civil society</strong>, all convened around the same question. <em>Senator Alejandra Lagunes Soto Ruiz</em> opened from the legislative side and <em>Mtro. Luis Gustavo Padilla Montes</em>, Rector of CUCEA, sealed the institutional support of the University of Guadalajara. From there, two intense days of panels addressing what was then barely named: cybersecurity regulation, online alternative justice, algorithmic audits, mental privacy and digital inheritance.',
      m1_s1_p2_html: 'The Forum was born with a clear vocation: <strong>not to be just another academic congress</strong>. From the first edition we sought the real crossing between those who legislate, those who judge, those who regulate and those who research. Throughout the two days, the presidencies of the <strong>Supreme Court of Justice of the State of Jalisco</strong> (Magistrate Daniel Espinoza Licón), the <strong>Federal Economic Competition Commission (COFECE)</strong> (Dr. Andrea Marvan Saltiel), the <strong>National Institute for Transparency, Access to Information and Personal Data Protection (INAI)</strong> (Mtra. Blanca Lilia Ibarra), the <strong>Mexican Academy of Cybersecurity and Digital Law</strong> (Dr. Ernesto Ibarra Sánchez), the <strong>Mexican Academy of Computer Law</strong> (Mtro. Joel Gómez Treviño) and the <strong>Latin American Network of Government, Law and New Technologies — ALGDETIC</strong> (Ing. Miguel Ángel Gaspar Villalba) participated in different panels and presentations, along with the international presidency of <strong>FIADI</strong> (Dr. Bibiana Luz Clara), the <strong>Ibero-American Federation of Law and Informatics Associations</strong>. Added to representatives from <em>California State University Dominguez Hills</em>, <em>Alfonso X El Sabio University</em>, <em>Newcastle University</em> and <em>CIDE</em>, they made CUCEA one of the few Mexican venues where, that year, the depth of what law could not yet answer to technology was discussed.',
      m1_s1_p3_html: 'From this edition came the institutional commitment to continuity. The Forum stopped being an idea to become an academic event with a vocation for permanence, organized by <em>the current members of the</em> <strong>Academic Body UDG-CA-1236 «Law and Technology»</strong> —then still in the process of formation—, together with the Academy of Economic Business Law, the Department of Social and Legal Sciences and the Master\'s in Conflict Resolution of CUCEA, under the permanent academic direction of <em>Dr. Juan Emmanuel Delva Benavides</em>.',
      // II Numeralia
      m1_s2_label: 'Numbers · I edition',
      m1_s2_title_html: 'The <em>numbers</em> of a beginning.',
      m1_s2_lbl1: 'Programmed presentations',
      m1_s2_lbl2: 'Days of on-site + virtual sessions',
      m1_s2_lbl3: 'Countries represented',
      m1_s2_lbl4: 'Thematic tracks addressed',
      m1_s2_lbl5: 'Institutional presidencies present — ALGDETIC · AMCID · AMDI · COFECE · INAI · STJ Jalisco',
      m1_s2_lbl6: 'International presidency — Dr. Bibiana Luz Clara',
      m1_s2_lbl7: 'Central Auditorium · Rectorate as institutional support',
      m1_s2_lbl8: 'Founding edition · first step of the Forum',
      // III Ejes
      m1_s3_label: 'Thematic tracks',
      m1_s3_title_html: 'Five <em>conversations</em> that opened the agenda.',
      m1_s3_intro: 'The I edition first traced the tracks that would later consolidate as the backbone of the Forum. The curation sought to cover the full spectrum: from the ongoing legislative debate to emerging use cases in courts.',
      m1_s3_eje1: 'Cybersecurity Regulation',
      m1_s3_eje2: 'ADR and technology use cases · Online Alternative Justice',
      m1_s3_eje3: 'Audit of recommendation algorithms',
      m1_s3_eje4: 'Regulation and cybersecurity in public entities',
      m1_s3_eje5: 'Mental privacy, neurosciences and quantum computing',
      // IV Ponentes
      m1_s4_label: 'Featured speakers',
      m1_s4_title_html: 'The <em>voices</em> that opened the way.',
      m1_s4_intro_html: 'The curation of the I edition preserved the balance that would later become a house brand: <strong>academia + judicial + legislative + regulatory + private sector + international bodies</strong>. What follows is a representative selection of those who actually participated; the full program covered 23 interventions.',
      m1_p1_role: 'Senate of the Republic',
      m1_p1_afil: 'Inauguration · Cybersecurity Regulation',
      m1_p2_role: 'Rectorate CUCEA · UDG',
      m1_p2_afil: 'Institutional support · Inaugural welcome',
      m1_p3_role: 'Presidency · FIADI',
      m1_p3_afil: 'Ibero-American Federation of Law and Informatics Associations · Online Alternative Justice',
      m1_p4_role: 'Presidency · STJ Jalisco',
      m1_p4_afil: 'Supreme Court of Justice of the State of Jalisco · Online Justice in the State',
      m1_p5_role: 'Presidency · COFECE',
      m1_p5_afil: 'Federal Economic Competition Commission · Regulation and cybersecurity in public entities',
      m1_p6_role: 'Presidency · INAI',
      m1_p6_afil: 'National Institute for Transparency, Access to Information and Personal Data Protection · Regulatory panel',
      m1_p7_role: 'Presidency · AMCID',
      m1_p7_afil: 'Mexican Academy of Cybersecurity and Digital Law · Cybersecurity in Mexico',
      m1_p8_role: 'Presidency · AMDI',
      m1_p8_afil: 'Mexican Academy of Computer Law · AI in the legal field',
      m1_p9_role: 'Presidency · ALGDETIC',
      m1_p9_afil: 'Latin American Network of Government, Law and New Technologies · Audit of recommendation algorithms',
      m1_p10_role: 'CSU Dominguez Hills · USA',
      m1_p10_afil: 'ADR and technology use cases',
      m1_p11_role: 'CIDE',
      m1_p11_afil: 'Mental privacy · AI, neurosciences and quantum computing',
      m1_p12_role: 'U. Newcastle · UAX Madrid · OMA',
      m1_p12_afil: 'Digital inheritance · AI in judicial process automation',
      // V Programa
      m1_s5_label: 'Program',
      m1_s5_title_html: 'Two <em>days</em>, an inaugural agenda.',
      m1_s5_day1: 'Tuesday, November 14 · Day 1',
      m1_s5_d1r1_topic: '<strong>Protocol acts · Welcome</strong>',
      m1_s5_d1r1_who: 'Sen. Alejandra Lagunes Soto Ruiz · Mtro. Luis Gustavo Padilla Montes (CUCEA Rector)',
      m1_s5_d1r2_topic: 'Panel · <strong>Cybersecurity Regulation</strong>',
      m1_s5_d1r2_who: 'Sen. Alejandra Lagunes Soto Ruiz',
      m1_s5_d1r3_topic: 'Panel · <strong>ADR and technology use cases</strong>',
      m1_s5_d1r3_who: 'Dr. René Castro · Dr. John Swarbrick (CSU Dominguez Hills)',
      m1_s5_d1r4_topic: '<strong>Online Alternative Justice</strong>',
      m1_s5_d1r4_who: 'Dr. Bibiana Luz Clara · FIADI Presidency',
      m1_s5_d1r5_topic: '<strong>Audit of Recommendation Algorithms</strong>',
      m1_s5_d1r5_who: 'Ing. Miguel Ángel Gaspar · ALGDETIC',
      m1_s5_day2: 'Wednesday, November 15 · Day 2',
      m1_s5_d2r1_topic: 'Panel · <strong>Regulation and cybersecurity in public entities</strong>',
      m1_s5_d2r1_who: 'Dr. Andrea Marvan (COFECE) · Mtra. Blanca Lilia Ibarra (INAI)',
      m1_s5_d2r2_topic: '<strong>Cybersecurity in Mexico</strong>',
      m1_s5_d2r2_who: 'Dr. Ernesto Ibarra · Mexican Academy of Cybersecurity',
      m1_s5_d2r3_topic: '<strong>Artificial intelligence in the legal field</strong>',
      m1_s5_d2r3_who: 'Mtro. Joel Gómez Treviño · Mexican Academy of Computer Law',
      m1_s5_d2r4_topic: '<strong>Inheritance in the digital world</strong>',
      m1_s5_d2r4_who: 'Dr. Mauricio Figueroa Torres · Newcastle University',
      m1_s5_d2r5_topic: '<strong>Mental privacy, AI, neurosciences and quantum computing</strong>',
      m1_s5_d2r5_who: 'Dr. Olivia Andrea Mendoza Enríquez · CIDE',
      m1_s5_d2r6_topic: '<strong>AI applied to judicial process automation</strong>',
      m1_s5_d2r6_who: 'Dr. María Luisa García Torres · Dr. Juliana Caicedo · UAX-OMA',
      m1_s5_d2r7_topic: '<strong>Online Justice in the State of Jalisco</strong>',
      m1_s5_d2r7_who: 'Magistrate Daniel Espinoza Licón · STJ Jalisco',
      // VI Galería
      m1_s6_label: 'Gallery',
      m1_s6_title_html: 'How it was <em>experienced</em>.',
      m1_g0: 'Official poster · I Edition 2023',
      m1_g1: 'Speaker presentation · CUCEA institutional sign',
      m1_g2: 'Main panel · CUCEA screen',
      m1_g3: 'Audience participation',
      m1_g4: 'CUCEA Auditorium · Nov 14, 2023',
      m1_g5: 'Inaugural panel · seven voices at the table',
      m1_g6: 'Virtual panel · UAX Madrid + CUCEA Rectorate',
      m1_g7: 'Group photo · authorities, speakers and audience',
      m1_g8: 'Certificate ceremony · CUCEA Government Hall',
      m1_g9: 'Parallel room · three CUCEA screens',
      m1_g10: 'Close conversation with the audience',
      // VII Legado
      m1_s7_label: 'Legacy',
      m1_s7_title_html: 'What <em>remained</em> after closing the curtain.',
      m1_s7_intro: 'The I edition was not an event that ended with its program. It laid four foundations that subsequent editions have been capitalizing on.',
      m1_s7_pillar1_h: 'Concentration of presidencies',
      m1_s7_pillar1_p_html: 'Throughout the program, the <strong>presidencies</strong> of FIADI, ALGDETIC, AMCID, AMDI, COFECE, INAI and STJ Jalisco participated. An institutional density difficult to repeat in a single academic venue.',
      m1_s7_pillar2_h: 'Interinstitutional network',
      m1_s7_pillar2_p: 'Operational articulation between CUCEA, FIADI, ALGDETIC, AMCID, AMDI, STJ Jalisco, COFECE and INAI as a continuity network for the following editions.',
      m1_s7_pillar3_h: 'Tracks framework',
      m1_s7_pillar3_p_html: 'First trace of the <strong>thematic tracks</strong> that in the II edition consolidate to 7 as the backbone of the Forum, and that in the IV expand to 9 with the incorporation of digital health and agentic AI.',
      m1_s7_pillar4_h: 'CUCEA support',
      m1_s7_pillar4_p_html: 'Explicit support from the <strong>CUCEA Rectorate</strong> to the Forum as a permanent academic event, officialized from this edition.',
      m1_s7_pillar5_h: 'Early internationalization',
      m1_s7_pillar5_p: 'Presence from day one of speakers from the United States, Spain, United Kingdom, Argentina, Colombia and Paraguay, setting the pace for the Iberoamerican character of the Forum.',
      m1_s7_pillar6_h: 'Permanent academic direction',
      m1_s7_pillar6_p_html: 'Consolidation of <strong>Dr. Juan Emmanuel Delva Benavides</strong> as permanent Academic Director of the Forum, a role that sustains the editorial and curatorial continuity of the following editions.',
      m1_s7_pillar7_h: 'Seed of the Academic Body',
      m1_s7_pillar7_p_html: 'This edition sowed the team of research professors who, two years later, would form the <strong>Academic Body UDG-CA-1236 «Law and Technology»</strong>, today formal organizer of the Forum.',
      // Footer
      m1_footer_meta: '© 2026 · IV International Forum on Law and Technology · CUCEA · University of Guadalajara · emmanueldelva@cucea.udg.mx',

      // Memoria II (2024)
      mem2_eyebrow: 'II Edition · 2024',
      mem2_title_html: 'II International Forum<br>on Law and <em>Technology</em>.',
      mem2_lead: 'Second edition of the Forum. Thematic consolidation and formation of the Scientific Committee. Hybrid format with broader international participation and deeper focus on AI, cybersecurity and digital intellectual property tracks.',
      mem2_meta_dates_value: '2024',
      mem2_meta_venue_value: 'CUCEA · University of Guadalajara',
      mem2_meta_modality_value: 'Hybrid',
      mem2_resena_p1: '[To be completed.] Reserved space for the detailed overview of the second edition of the Forum: institutional context, thematic tracks, main speakers, conclusions and resulting publications.',
      mem2_resena_p2: 'This second edition consolidated the foundations of the Forum as a plural academic space where lawyers, engineers, judges and regulators from Iberoamerica discuss how the law must respond to artificial intelligence, the crypto-economy, cybersecurity and digital intellectual property.',

      // Memoria III (2025)
      mem3_eyebrow: 'III Edition · 2025',
      mem3_title_html: 'III International Forum<br>on Law and <em>Technology</em>.',
      mem3_lead: 'Third edition of the Forum. International leap with speakers from six countries and expansion to FinTech, biotechnologies and digital human rights tracks. Launch of the collective book of the «Innovación Jurídica en la era digital» series.',
      mem3_meta_dates_value: '2025',
      mem3_meta_venue_value: 'CUCEA · University of Guadalajara',
      mem3_meta_modality_value: 'Hybrid',
      mem3_resena_p1: '[To be completed.] Reserved space for the detailed overview of the third edition of the Forum: institutional context, thematic tracks, main speakers, conclusions and resulting publications.',
      mem3_resena_p2: 'This third edition projected internationally the foundations of the Forum as a plural academic space where lawyers, engineers, judges and regulators from Iberoamerica discuss how the law must respond to artificial intelligence, the crypto-economy, cybersecurity and digital intellectual property.',
      cfp_date1_step: '01 · Reception',
      cfp_date1_label: 'paper submission',
      cfp_date1_value_html: '1 May —<br>15 July 2026',
      cfp_date2_step: '02 · Decision',
      cfp_date2_label: 'acceptance notification',
      cfp_date2_value_html: '20 August<br>2026',
      cfp_date3_step: '03 · Event',
      cfp_date3_label: 'forum dates',
      cfp_date3_value: '21 & 22 September 2026',
      cfp_topic1_t: 'Agentic AI and Generative Intellectual Property',
      cfp_topic2_t: 'Emerging Technologies',
      cfp_topic3_t: 'Cybersecurity and Digital Sovereignty',
      cfp_topic4_t: 'Digital Justice and Legal Innovation',
      cfp_topic5_t: 'Digital Human Rights',
      cfp_topic6_t: 'FinTech and Digital Economy',
      cfp_topic7_t: 'Digital Health and Biotechnologies',
      cfp_envelope_corr: 'Editorial correspondence',
      cfp_envelope_subject: 'Email subject',
      cfp_envelope_body: 'Email body',
      cfp_envelope_attach: 'Attachment',
      cfp_callout_title: 'Final reminder',

      // ===== FOOTER =====
      foot_copy: '© 2026 · IV International Forum on Law and Technology',
      foot_inst: 'CUCEA · University of Guadalajara'
    },

    fr: {
      // ===== NAV =====
      nav_back: 'Retour au site',
      nav_brand_sub: 'Droit · Technologie · 2026',
      nav_link_trayectoria: 'Historique',
      nav_link_ejes: 'Axes',
      nav_link_ponentes: 'Intervenants',
      nav_link_programa: 'Programme',
      nav_link_convocatoria: 'Appel',
      nav_link_comite: 'Comité',
      nav_cta_inscripcion: 'Inscription',

      // ===== INDEX · HERO =====
      idx_hero_eyebrow: 'Quatrième édition · 21 et 22 septembre · 2026',
      idx_hero_title_html: 'Forum International<br>du Droit<br><span class="accent">et de la Technologie</span>',
      idx_hero_lead: 'Deux journées itinérantes entre trois sites pour discuter de la manière dont le droit doit répondre à l\'intelligence artificielle, à la crypto-économie, à la cybersécurité et à la propriété intellectuelle numérique.',
      idx_hero_meta_dates_label: 'Dates',
      idx_hero_meta_dates_value: '21 et 22 sept. · 2026',
      idx_hero_meta_venue_label: 'Lieu',
      idx_hero_meta_venue_value: 'CUCEA · CUGDL · Cité Judiciaire',
      idx_hero_meta_modality_label: 'Modalité',
      idx_hero_meta_modality_value: 'Présentiel et hybride',
      idx_hero_meta_cost_label: 'Coût',
      idx_hero_meta_cost_value: 'Gratuit',
      idx_hero_cta_inscribirse: 'S\'inscrire',
      idx_hero_cta_programa: 'Programme préliminaire',

      // ===== INDEX · SECCIONES =====
      idx_trayectoria_eyebrow: 'Historique',
      idx_trayectoria_title_html: 'Quatre <em>éditions</em>,<br>une conversation.',
      idx_ejes_eyebrow: 'Axes thématiques · 4e édition',
      idx_ejes_title_html: 'Neuf <em>conversations</em><br>simultanées.',
      idx_ponentes_eyebrow: 'Intervenants · 4e édition',
      idx_ponentes_title_html: 'Voix de la <em>discussion</em>.',
      idx_programa_eyebrow: 'Programme préliminaire',
      idx_programa_title_html: 'Deux journées,<br>trois <em>sites</em>.',
      idx_cfp_eyebrow: 'Appel éditorial',
      idx_cfp_title_html: 'Call for <em>Papers</em><br>4e édition.',
      idx_cfp_cta: 'Voir l\'appel complet',
      idx_comite_eyebrow: 'Comité d\'organisation',
      idx_comite_title_html: 'Ceux qui rendent le Forum<br><em>possible</em>.',

      // ===== INSCRIPCION · RIBBON =====
      ins_ribbon_eyebrow: 'Inscription · Quatrième édition',
      ins_ribbon_title_html: 'Réservez votre <em>place</em><br>dans la conversation.',
      ins_ribbon_lead_html: 'L\'accès au Forum est <strong>gratuit</strong>. Votre inscription génère un code QR unique qui sert d\'identifiant numérique. Les participants qui cumulent <strong>20 heures effectives</strong> de participation reçoivent une attestation à valeur curriculaire émise par l\'Université de Guadalajara.',
      ins_meta_dates_label: 'Dates',
      ins_meta_dates_value: '21 et 22 sept. · 2026',
      ins_meta_venue_label: 'Lieux',
      ins_meta_venue_value: 'CUCEA · CUGDL · Cité Judiciaire',
      ins_meta_modality_label: 'Modalité',
      ins_meta_modality_value: 'Présentiel et hybride',
      ins_meta_cost_label: 'Coût',
      ins_meta_cost_value: 'Gratuit',

      // ===== INSCRIPCION · TABS =====
      ins_tab1_title: 'Assister au Forum',
      ins_tab1_sub: 'Public général · QR + attestation',
      ins_tab2_title: 'Soumettre une communication',
      ins_tab2_sub: 'Call for Papers · ouvrage collectif',
      ins_tab3_title: 'Mises à jour uniquement',
      ins_tab3_sub: 'Sans engagement · low-friction',

      // ===== INSCRIPCION · PANEL ASISTENTE =====
      ins_panel1_eyebrow: 'Formulaire · 2 minutes',
      ins_panel1_title_html: 'Inscription <em>participant</em>.',
      ins_panel1_intro: 'Avec vos données, nous générons un code QR unique que vous recevrez par courriel. Ce QR est votre identifiant numérique pendant les deux jours du Forum. Le jour 1, nous validons votre identité avec une pièce officielle ou la carte UDG et nous vous remettons un bracelet officiel donnant accès aux trois sites.',
      ins_label_nombre: 'Nom complet',
      ins_placeholder_nombre: 'Tel qu\'il apparaîtra sur votre attestation',
      ins_hint_nombre: 'Vérifiez accents et majuscules. L\'attestation est émise avec ce texte exact.',
      ins_label_correo: 'Courriel',
      ins_placeholder_correo: 'exemple@domaine.com',
      ins_label_correo2: 'Confirmer le courriel',
      ins_placeholder_correo2: 'Répétez votre courriel',
      ins_label_tipo: 'Type de participant',
      ins_tipo_estudiante_t: 'Étudiant',
      ins_tipo_estudiante_d: 'Licence, master ou doctorat',
      ins_tipo_academico_t: 'Académique / Chercheur',
      ins_tipo_academico_d: 'Professeur, enseignant-chercheur, chercheur SNII',
      ins_tipo_juridico_t: 'Professionnel du droit',
      ins_tipo_juridico_d: 'Avocat, notaire, consultant',
      ins_tipo_publico_t: 'Secteur public',
      ins_tipo_publico_d: 'Juge, magistrat, fonctionnaire',
      ins_tipo_privado_t: 'Secteur privé',
      ins_tipo_privado_d: 'Entreprise, conseil, LegalTech',
      ins_tipo_otro_t: 'Autre / Communauté',
      ins_tipo_otro_d: 'Journalisme, ONG, citoyenneté',
      ins_label_grado: 'Diplôme académique',
      ins_label_programa: 'Programme académique',
      ins_placeholder_programa: 'ex. Licence en Droit',
      ins_label_snii: 'SNII (système mexicain de chercheurs)',
      ins_label_area: 'Domaine / ligne de recherche',
      ins_placeholder_area: 'ex. IA et droits humains',
      ins_label_institucion: 'Institution ou organisation',
      ins_placeholder_institucion: 'ex. Université de Guadalajara · CUCEA',
      ins_hint_institucion: 'Si vous faites partie de l\'UDG, précisez votre centre universitaire dans le champ suivant.',
      ins_label_pais: 'Pays d\'origine',
      ins_label_modalidad: 'Modalité de participation',
      ins_mod_presencial_t: 'Présentiel',
      ins_mod_presencial_d: 'Je serai physiquement sur place',
      ins_mod_virtual_t: 'Virtuel',
      ins_mod_virtual_d: 'Via le streaming officiel du Forum',
      ins_mod_mixta_t: 'Hybride',
      ins_mod_mixta_d: 'Certaines sessions sur place, d\'autres virtuelles',
      ins_label_fuente: 'Comment avez-vous connu le Forum ?',
      ins_legal_aviso_html: 'J\'ai lu et j\'accepte l\'<a href="#" id="open-aviso">Avis de Confidentialité</a> (en espagnol uniquement, conformément à la LFPDPPP mexicaine). J\'autorise le traitement de mes données personnelles aux fins du Forum : émission de l\'attestation, contrôle de présence et communication officielle.<span class="req">*</span>',
      ins_legal_codigo_html: 'J\'accepte le <a href="#" id="open-codigo">Code de Conduite</a> (en espagnol) du Forum et je comprends que l\'événement sera enregistré à des fins académiques et de diffusion.<span class="req">*</span>',
      ins_legal_news_html: '<span class="opt">(Optionnel)</span> Je souhaite recevoir des communications sur les futures éditions du Forum et les activités du Corps Académique UDG-CA-1236 «Droit et Technologie».',
      ins_btn_submit: 'Générer mon QR',
      ins_submit_note: 'Une fois soumis, vous recevrez un courriel avec votre QR unique. S\'il n\'arrive pas dans les 5 minutes, vérifiez votre dossier SPAM ou Promotions.',

      // ===== INSCRIPCION · SUCCESS =====
      ins_success_title_html: 'Inscription <em>reçue</em>.',
      ins_success_lead: 'Nous avons envoyé à votre courriel le code QR unique qui servira d\'identifiant numérique. Apportez-le sur votre téléphone ou imprimé le jour de l\'événement. Le jour 1, nous validons votre identité avec votre pièce officielle/carte UDG et nous vous remettons le bracelet officiel.',
      ins_success_label_folio: 'Folio',
      ins_success_label_nombre: 'Nom',
      ins_success_label_correo: 'Courriel',
      ins_success_label_modalidad: 'Modalité',
      ins_success_btn_programa: 'Voir le programme',
      ins_success_btn_otra: 'Inscrire une autre personne',

      // ===== INSCRIPCION · PANEL CFP =====
      ins_panel2_eyebrow: 'Appel · Call for Papers',
      ins_panel2_title_html: 'Soumettez votre <em>contribution</em>.',
      ins_panel2_intro: 'Le Comité Scientifique reçoit des propositions en espagnol, anglais et français sur les neuf axes thématiques de la quatrième édition. Les contributions acceptées sont publiées dans un ouvrage collectif aux Presses de l\'Université de Guadalajara, avec DOI par chapitre.',

      // ===== INSCRIPCION · PANEL NEWSLETTER =====
      ins_panel3_eyebrow: 'Mises à jour uniquement',
      ins_panel3_title_html: 'Restez <em>informé</em>.',
      ins_panel3_intro: 'Si vous n\'avez pas encore décidé d\'assister mais souhaitez recevoir le programme final, les annonces des intervenants et le matériel post-événement, laissez votre courriel. Sans engagement, sans spam, une communication par mois maximum.',
      ins_nl_label: 'Courriel',
      ins_nl_btn: 'M\'abonner',
      ins_nl_note: 'En vous abonnant, vous acceptez de recevoir des communications du Forum International du Droit et de la Technologie. Vous pouvez vous désabonner à tout moment depuis le pied de page de tout courriel.',

      // ===== INSCRIPCION · BANNER ERROR =====
      ins_error_title: 'Nous n\'avons pas pu soumettre votre inscription.',
      ins_error_detail_html: 'Vérifiez votre connexion Internet et réessayez. Si le problème persiste, écrivez à <a href="mailto:emmanueldelva@cucea.udg.mx" style="color: inherit; text-decoration: underline;">emmanueldelva@cucea.udg.mx</a> avec l\'objet «erreur inscription».',

      // ===== CFP =====
      cfp_eyebrow: 'Call for Papers · 2026',
      cfp_title: 'Forum International du Droit et de la Technologie',
      cfp_subtitle_html: '« Agents, Algorithmes et Autonomie :<br>le Droit face à l\'Intelligence qui Décide »',
      cfp_venue_html: '<strong>21 et 22 septembre 2026</strong>  ·  Format hybride  ·  Zapopan, Jalisco',
      cfp_convoca_label: 'Convoqué par',
      cfp_convoca_value: 'Université de Guadalajara · Corps Académique UDG-CA-1236 « Droit et Technologie » · Centre Universitaire de Sciences Économiques et Administratives (CUCEA) · Centre Universitaire de Guadalajara (CUGDL) · Département de Sciences Sociales et Juridiques · Académie de Droit Économique, Commercial et International',
      cfp_colab_label: 'En collaboration institutionnelle avec',
      cfp_colab_value: 'Cour Suprême de Justice de l\'État de Jalisco · Pouvoir Judiciaire de l\'État de Jalisco',
      cfp_section1: 'I · COMITÉ D\'ORGANISATION',
      cfp_section2: 'II · PRÉSENTATION',
      cfp_section3: 'III · DATES CLÉS',
      cfp_section4: 'IV · AXES THÉMATIQUES',
      cfp_section5: 'V · SOUMISSION ET PROCESSUS DE SÉLECTION',
      cfp_section6: 'VI · STRUCTURE ET PRÉSENTATION',
      cfp_section7: 'VII · ÉVALUATION ET PUBLICATION',
      cfp_section8: 'VIII · NORMES DE STYLE ET CITATION',
      cfp_role_direccion: 'Direction Académique',
      cfp_role_secretaria: 'Secrétariat Académique',
      cfp_role_tecnologia_html: 'Technologie et Logistique',
      cfp_role_editorial_html: 'Coordination Éditoriale<br>et Comité Scientifique',
      cfp_role_director: 'Directeur du Forum',
      cfp_role_comite: 'Comité d\'Organisation',
      cfp_affil_lider: 'Responsable du Corps Académique UDG-CA-1236 « Droit et Technologie »',
      cfp_affil_miembro: 'Membre du Corps Académique UDG-CA-1236 « Droit et Technologie »',
      cfp_affil_colab: 'Collaborateur du Corps Académique UDG-CA-1236 « Droit et Technologie »',
      cfp_affil_depto: 'Département de Sciences Sociales et Juridiques · CUCEA-UDG',
      idx_comite_p1_role: 'Directeur du Forum',
      idx_comite_p1_affil: 'Responsable du Corps Académique UDG-CA-1236 « Droit et Technologie »',
      idx_comite_role: 'Comité d\'Organisation',
      idx_comite_affil_miembro: 'Membre du Corps Académique UDG-CA-1236 « Droit et Technologie »',
      idx_comite_affil_colab: 'Collaborateur du Corps Académique UDG-CA-1236 « Droit et Technologie »',
      idx_comite_affil_depto: 'Département de Sciences Sociales et Juridiques · CUCEA-UDG',
      // Rôles spécifiques du comité
      idx_comite_role_director: 'Directeur du Forum',
      idx_comite_role_secacademica: 'Secrétariat Académique',
      idx_comite_role_sectecnica: 'Secrétariat Technique',
      idx_comite_role_coordeditorial: 'Coordination Éditoriale et Comité Scientifique',
      idx_comite_role_tecnologia: 'Technologie et Logistique',
      idx_comite_role_protocolo: 'Protocole et Liaison Culturelle',
      // Même série pour cfp.html
      cfp_role_secacademica: 'Secrétariat Académique',
      cfp_role_sectecnica: 'Secrétariat Technique',
      cfp_role_coordeditorial: 'Coordination Éditoriale et Comité Scientifique',
      cfp_role_tecnologia: 'Technologie et Logistique',
      cfp_role_protocolo: 'Protocole et Liaison Culturelle',
      idx_comite_lead: 'Le Forum est une initiative académique du Corps Académique UDG-CA-1236 « Droit et Technologie », en coordination avec le Département de Sciences Sociales et Juridiques et l\'Académie de Droit Économique, Commercial et International, tous deux du CUCEA. La quatrième édition se tient en partenariat avec le Centre Universitaire CUGDL et la Cité Judiciaire de l\'État de Jalisco.',
      prog_eyebrow: 'Programme préliminaire',
      prog_title_html: 'En <em>préparation</em>.',
      prog_message_html: 'Nous travaillons actuellement sur le programme et l\'horaire des intervenants. Le programme complet sera annoncé dans les semaines précédant l\'événement, une fois que le Comité Scientifique aura confirmé tous les intervenants et la composition des panels.',
      prog_subtext: 'En attendant, vous pouvez déjà vous inscrire, soumettre une communication ou vous abonner pour recevoir le programme final par courriel.',
      prog_cta_inscripcion: 'S\'inscrire au Forum',
      prog_cta_cfp: 'Voir l\'appel à contributions',
      prog_cta_back: '← Retour au site',
      prog_meta_dates_label: 'Dates',
      prog_meta_dates_value: '21 et 22 sept. · 2026',
      prog_meta_venue_label: 'Lieux',
      prog_meta_venue_value: 'CUCEA · CUGDL · Cité Judiciaire',
      prog_meta_modality_label: 'Modalité',
      prog_meta_modality_value: 'Présentiel et hybride',

      // Ponentes placeholder + confirmados
      idx_ponente_pc: 'À confirmer',
      idx_ponente_confirmed_badge: 'CONFIRMÉ',
      idx_ponentes_lead_html: 'Le Comité Scientifique est en train de finaliser les confirmations pour la quatrième édition. Les invitations sont annoncées chaque semaine sur les canaux officiels du Forum. La curation préserve l\'équilibre entre <strong>académie, secteurs judiciaire et législatif, secteur privé et organismes nationaux et internationaux à fonction régulatrice</strong> qui distingue l\'événement depuis la I édition. Parmi les premiers intervenants confirmés figurent le <em>Dr. Alejandro Axel Rivera Martínez</em>, Directeur Général de l\'Institut Jaliscien des Sciences Forensiques, et le <em>Dr. Manuel Raad Berrio</em>, Magistrat Auxiliaire du Conseil Supérieur de la Magistrature de Colombie.',
      idx_ponente_rivera_affil: 'Directeur Général · Institut Jaliscien des Sciences Forensiques',
      idx_ponente_rivera_topic_html: 'Axe iv · Justice Numérique  |  Axe v · Droits Humains Numériques',
      idx_ponente_rivera_talk: '« Technologie, sciences forensiques et droits : identification craniométrique avec IA à l\'Institut Jaliscien des Sciences Forensiques »',
      idx_ponente_raad_affil: 'Magistrat Auxiliaire · Conseil Supérieur de la Magistrature · Colombie',
      idx_ponente_raad_topic_html: 'Axe iv · Justice Numérique  |  Axe iii · Technologies Émergentes',
      idx_ponente_raad_talk: '« Tribunaux du XXIe siècle : technologies émergentes et nouveaux paradigmes dans l\'administration de la justice »',
      idx_ponentes_cta_text: 'Liste en construction · Les confirmations sont publiées chaque semaine',
      idx_ponentes_cta_btn: 'Recevoir les mises à jour',

      // Trayectoria - 4 éditions
      idx_trayectoria_lead_html: 'Depuis 2023, le Forum a réuni au CUCEA juristes, ingénieurs, juges, régulateurs et académiques de trois continents pour discuter de la manière dont le droit doit répondre à l\'intelligence artificielle, à la crypto-économie, à la cybersécurité et à la propriété intellectuelle numérique. Chaque édition est un chapitre de la série éditoriale <em>Innovación Jurídica en la era digital</em>.',
      idx_edition_label: ' Édition',
      idx_status_memoria: 'Mémoire',
      idx_status_proxima: 'À venir',
      idx_stat_presencial: 'Format présentiel',
      idx_stat_hibrida: 'Format hybride',
      idx_ed1_title: 'Origine du Forum International',
      idx_ed1_stat1: 'Édition fondatrice',
      idx_ed2_title: 'Consolidation thématique et Comité Scientifique',
      idx_ed2_stat1: '7 axes consolidés',
      idx_ed3_title: 'Saut international : 6 pays, 30+ intervenants',
      idx_ed3_stat1: '6 pays',
      idx_ed3_stat2: '30+ intervenants',
      idx_ed4_title: 'Justice agentique et intelligence régulée',
      idx_ed4_stat1: '9 axes (7 + 2 émergents)',
      idx_ed4_stat2: 'Appel ouvert',

      // Axes thématiques
      idx_eje_tag_eje: 'Axe',
      idx_eje_tag_emergente: 'Émergent',
      idx_eje1_title: 'Intelligence Artificielle<br>et Droit',
      idx_eje1_desc: 'Régulation des modèles fondationnels, gouvernance algorithmique, responsabilité civile et pénale des systèmes autonomes.',
      idx_eje2_title: 'Vie privée, Cybersécurité<br>et Sécurité Citoyenne',
      idx_eje2_desc: 'Protection des données personnelles, transferts internationaux, surveillance étatique et droits numériques.',
      idx_eje3_title: 'Blockchain, Crypto-actifs<br>et Métavers',
      idx_eje3_desc: 'Tokenisation d\'actifs, régulation FinTech, identité numérique et juridiction dans les environnements virtuels.',
      idx_eje4_title: 'Technologies Émergentes<br>et Régulation',
      idx_eje4_desc: 'Bacs à sable réglementaires, évaluation d\'impact algorithmique, certification et normalisation technique.',
      idx_eje5_title: 'Technologie<br>et Environnement',
      idx_eje5_desc: 'Empreinte environnementale de l\'IA, droit écologique numérique, durabilité et obsolescence programmée.',
      idx_eje6_title: 'Droit Numérique<br>et Propriété Intellectuelle',
      idx_eje6_desc: 'Œuvres générées par IA, droit à la réparation, domaine public numérique et marchés secondaires.',
      idx_eje7_title: 'Innovation et Technologie<br>en Résolution de Conflits',
      idx_eje7_desc: 'ODR, médiation assistée par IA, justice prédictive et accès numérique à la justice.',
      idx_eje8_title: 'IA Agentique et Propriété<br>Intellectuelle Générative',
      idx_eje8_desc: 'Systèmes multi-agents, autorité algorithmique, licence synthétique et protection des œuvres dérivées.',
      idx_eje9_title: 'Santé Numérique<br>et Biotechnologies',
      idx_eje9_desc: 'Télémédecine, données génomiques, dispositifs médicaux algorithmiques et bioéthique computationnelle.',

      // Aliados
      idx_aliados_eyebrow: 'Cadres institutionnels et réseaux associés',
      idx_aliados_title_html: 'Le Forum <em>ne marche pas</em> seul.',

      // CFP de l\'index
      idx_cfp_p1_html: 'Le Comité Scientifique invite les chercheurs et professionnels du droit et de la technologie à soumettre des contributions originales pour la <strong>quatrième édition</strong> du Forum International du Droit et de la Technologie.',
      idx_cfp_p2_html: 'Les contributions acceptées seront publiées dans le livre collectif de la série <strong><em>Innovación Jurídica en la era digital</em></strong>, après évaluation en double aveugle par deux membres du Comité Scientifique.',
      idx_cfp_p3: 'Les contributions sont acceptées en espagnol, anglais et français. Les neuf axes thématiques sont ouverts à la soumission.',
      idx_cfp_btn_full: 'Voir l\'appel complet',
      idx_cfp_btn_send: 'Soumettre une contribution',
      idx_cfp_dates_title: 'Dates critiques',
      idx_cfp_dl1_label: 'Ouverture de l\'appel',
      idx_cfp_dl1_date: 'Mai · 2026',
      idx_cfp_dl2_label: 'Soumission du résumé',
      idx_cfp_dl2_date: 'Juin · 2026',
      idx_cfp_dl3_label: 'Notification d\'acceptation',
      idx_cfp_dl3_date: 'Juil · 2026',
      idx_cfp_dl4_label: 'Soumission du manuscrit final',
      idx_cfp_dl4_date: 'Août · 2026',
      idx_cfp_dl5_label: 'Forum · IV édition',
      idx_cfp_dl5_date: '21-22 sept. · 2026',
      idx_cfp_dl6_label: 'Publication du mémoire',
      idx_cfp_dl6_date: '2027',
      idx_cfp_norms_title: 'Normes éditoriales',
      idx_cfp_norm1: '· Longueur : 15-20 pages par chapitre',
      idx_cfp_norm2: '· Typographie : Times New Roman 12 / 1,5',
      idx_cfp_norm3: '· Notes de bas de page : TNR 10 simple',
      idx_cfp_norm4: '· Citations : standard juridique',
      idx_cfp_norm5: '· Numérotation : I. → 1. → a.',
      idx_cfp_norm6: '· Double aveugle · Comité Scientifique',

      // CFP complet (cfp.html) - sections longues
      cfp_pres_p1_html: 'L\'Université de Guadalajara, à travers le Corps Académique UDG-CA-1236 « Droit et Technologie », avec le soutien du CUCEA et du CUGDL, et en collaboration institutionnelle avec la Cour Suprême de Justice de l\'État de Jalisco, invite chercheurs, académiques, professionnels et étudiants en doctorat, master et licence intéressés par l\'intersection du droit et de la technologie à contribuer à la <em>quatrième édition</em> du Forum International du Droit et de la Technologie.',
      cfp_pres_p2: 'La journée d\'ouverture aura lieu au CUCEA, tandis que la journée de clôture sera itinérante entre le CUGDL et la Cité Judiciaire de l\'État de Jalisco, articulant un dialogue tripartite entre l\'académie, l\'enseignement universitaire et la magistrature de l\'État.',
      cfp_pres_p3: 'Cet événement vise à favoriser le dialogue sur les innovations technologiques dans le droit, à partager les meilleures pratiques et à explorer les nouvelles régulations qui façonneront l\'avenir juridique dans un contexte mondial en transformation permanente.',
      cfp_pres_p4: 'Nous invitons à soumettre des contributions originales, rigoureuses et avec une vocation propositionnelle, qui offrent des analyses doctrinales, des études comparatives et des réponses normatives concrètes aux défis émergents de la société numérique.',
      cfp_topic1_d: 'Gouvernance algorithmique, responsabilité civile et pénale des systèmes autonomes, autorité d\'œuvres synthétiques, entraînement de modèles et AI Act en Amérique Latine.',
      cfp_topic2_d: 'Informatique quantique, neurotechnologies, réalités étendues, jumeaux numériques et gouvernance anticipative.',
      cfp_topic3_d: 'Protection des données personnelles, nouvelle LFPDPPP, infrastructure critique et cyber-défense.',
      cfp_topic4_d: 'ODR, intelligence juridique augmentée, LegalTech, automatisation judiciaire et accès à la justice.',
      cfp_topic5_d: 'Démocratie algorithmique, désinformation, neuro-droits et économie des données.',
      cfp_topic6_d: 'Crypto-actifs, DeFi, tokenisation, monnaies numériques de banque centrale et régulation financière.',
      cfp_topic7_d: 'Télémédecine, dispositifs connectés, données biomédicales et édition génétique.',
      cfp_envio_p1_html: 'Les soumissions seront évaluées en double aveugle. Les contributions sélectionnées seront publiées dans un livre collectif avec ISBN. Les contributions sont acceptées en <strong>espagnol, anglais et français</strong>.',
      cfp_envelope_body_p_html: 'Inclure : <span class="badge">axe thématique</span><span class="badge">titre</span><span class="badge">poste</span><span class="badge">institution</span> et <span class="badge">modalité</span> (présentiel / en ligne).',
      cfp_envelope_attach_p_html: 'Format Word (<span class="mono">.doc</span> ou <span class="mono">.docx</span>).',
      cfp_spec1_html: '<strong>Longueur.</strong> Minimum 15 et maximum 20 pages, références et annexes incluses.',
      cfp_spec2_html: '<strong>En-tête.</strong> Titre, nom complet de l\'auteur, un seul poste et une institution d\'affiliation.',
      cfp_spec3_html: '<strong>Index.</strong> Résumé des points clés du travail. Pas d\'<em>abstract</em> requis.',
      cfp_spec4_html: '<strong>Police et format.</strong> Times New Roman 12 pt, interligne 1,5 pour le texte principal ; Times New Roman 10 pt, interligne simple pour les notes de bas de page.',
      cfp_spec6_html: '<strong>Citations.</strong> En notes de bas de page, conformément aux standards des publications juridiques (voir section VIII).',
      cfp_rev_p1_html: 'L\'évaluation sera réalisée sous strict anonymat. Chaque contribution recevra un numéro corrélatif du comité d\'organisation ; deux membres du comité scientifique, sans connaissance préalable de l\'autorité, jugeront chaque travail garantissant l\'impartialité et un jugement fondé sur la <em>qualité, originalité et pertinence</em> du contenu.',
      cfp_rev_p2_html: 'Dans une phase ultérieure, le comité scientifique délibérera pour sélectionner les contributions les plus remarquables, en tenant compte de l\'actualité du sujet, de la singularité de la perspective, de la clarté de l\'exposition et de l\'apport au dialogue du Forum. Les travaux acceptés et présentés seront pris en compte pour inclusion dans le <strong>livre collectif commémoratif</strong> de la IV édition.',
      cfp_callout_body: 'Avant de soumettre votre proposition, vérifiez soigneusement la conformité aux normes de style et formats de citation établis ici. La qualité de la présentation et le respect de ces directives sont des facteurs déterminants dans le processus de sélection.',
      cfp_citas_intro: 'Les citations doivent être présentées en notes de bas de page, avec suffisamment de données pour la localisation précise de chaque source. Des exemples de référence sont fournis :',

      // Footer columns
      foot_col_edition: 'Édition IV',
      foot_col_institutional: 'Institutionnel',
      foot_col_memorias: 'Éditions précédentes',
      foot_col_contact: 'Contact',
      foot_memoria_i: 'I Forum International du Droit et de la Technologie',
      foot_memoria_ii: 'II Forum International du Droit et de la Technologie',
      foot_memoria_iii: 'III Forum International du Droit et de la Technologie',
      foot_brand_tagline_html: 'Droit et Technologie.<br>Quatre éditions. Une conversation ouverte entre le droit et ce qui vient.',

      // Memorias (génériques)
      mem_meta_dates_label: 'Date',
      mem_meta_venue_label: 'Lieu',
      mem_meta_modality_label: 'Modalité',
      mem_resena_title: 'Aperçu',
      mem_galeria_title: 'Galerie',
      mem_galeria_placeholder: 'Bientôt disponible',
      mem_other_editions: 'Autres éditions',
      mem_link_iv: 'IV Forum · 2026',

      // Memoria I (2023)
      mem1_eyebrow: 'I Édition · 2023',
      mem1_title_html: 'I Forum International<br>du Droit et de la <em>Technologie</em>.',
      mem1_lead: 'Édition fondatrice du Forum. Réunion inaugurale au CUCEA avec la participation du Corps Académique UDG-CA-1236 « Droit et Technologie », consacrée à ouvrir le dialogue institutionnel entre l\'académie juridique et les défis émergents de la société numérique.',
      mem1_meta_dates_value: '2023',
      mem1_meta_venue_value: 'CUCEA · Université de Guadalajara',
      mem1_meta_modality_value: 'Présentiel',
      mem1_resena_p1: '[À compléter.] Espace réservé pour l\'aperçu détaillé de la première édition du Forum : contexte institutionnel, axes thématiques, principaux intervenants, conclusions et publications dérivées.',
      mem1_resena_p2: 'Cette première édition a posé les bases du Forum comme espace académique pluriel où juristes, ingénieurs, juges et régulateurs d\'Ibéro-Amérique discutent de la manière dont le droit doit répondre à l\'intelligence artificielle, à la crypto-économie, à la cybersécurité et à la propriété intellectuelle numérique.',

      // ===== MEMORIA I (page complète) =====
      m1_badge: 'I Édition · 14–15 novembre 2023',
      m1_title_html: 'I Forum International<br>du Droit et de la <em>Technologie</em>.',
      m1_lede_html: 'L\'<strong>édition fondatrice</strong>. Deux jours pendant lesquels CUCEA a réuni le Sénat de la République, le Rectorat du CUCEA et, tout au long du programme, les <strong>présidences de la Cour Suprême de Justice de l\'État de Jalisco, de la COFECE, de l\'INAI, de l\'Académie Mexicaine de Cybersécurité et Droit Numérique (AMCID), de l\'Académie Mexicaine de Droit Informatique (AMDI) et d\'ALGDETIC</strong>, avec la présidence internationale de la <strong>Fédération Ibéro-Américaine des Associations de Droit et Informatique (FIADI)</strong>. Pour la première fois officiellement à Jalisco, la conversation entre le droit mexicain et les technologies qui réécrivent tout : intelligence artificielle, cybersécurité, blockchain, ADR numérique et vie privée.',
      m1_stat1_k: 'Date',
      m1_stat1_v_html: '14–15 nov.<br>2023',
      m1_stat2_k: 'Lieu',
      m1_stat2_v_html: 'CUCEA · UDG<br>Zapopan, Jalisco',
      m1_stat3_k: 'Modalité',
      m1_stat3_v_html: 'Présentiel<br>+ virtuel',
      m1_stat4_k: 'Devise',
      m1_stat4_v_html: 'Innovation juridique<br>à l\'ère numérique',
      // I Aperçu
      m1_s1_label: 'Aperçu · L\'origine',
      m1_s1_title_html: 'Quand le droit mexicain <em>a décidé</em> de s\'asseoir à la table avec la technologie.',
      m1_s1_p1_html: 'Le 14 novembre 2023, l\'Auditorium Central du CUCEA est devenu quelque chose d\'inhabituel : un véritable point de rencontre entre <strong>pouvoirs législatif, judiciaire et exécutif, académie, secteur privé et société civile</strong>, tous convoqués autour de la même question. La <em>Sénatrice Alejandra Lagunes Soto Ruiz</em> a ouvert depuis le côté législatif et <em>Mtro. Luis Gustavo Padilla Montes</em>, Recteur du CUCEA, a scellé le soutien institutionnel de l\'Université de Guadalajara. À partir de là, deux jours intenses de panels qui ont abordé ce qui était alors à peine nommé : régulation de la cybersécurité, justice alternative en ligne, audits algorithmiques, vie privée mentale et successions numériques.',
      m1_s1_p2_html: 'Le Forum est né avec une vocation claire : <strong>ne pas être un congrès académique de plus</strong>. Dès la première édition, on a recherché le véritable croisement entre ceux qui légifèrent, ceux qui jugent, ceux qui régulent et ceux qui font de la recherche. Tout au long des deux jours, les présidences de la <strong>Cour Suprême de Justice de l\'État de Jalisco</strong> (Magistrat Daniel Espinoza Licón), de la <strong>Commission Fédérale de Concurrence Économique (COFECE)</strong> (Dr. Andrea Marvan Saltiel), de l\'<strong>Institut National de Transparence, Accès à l\'Information et Protection des Données Personnelles (INAI)</strong> (Mtra. Blanca Lilia Ibarra), de l\'<strong>Académie Mexicaine de Cybersécurité et Droit Numérique</strong> (Dr. Ernesto Ibarra Sánchez), de l\'<strong>Académie Mexicaine de Droit Informatique</strong> (Mtro. Joel Gómez Treviño) et du <strong>Réseau Latino-Américain de Gouvernement, Droit et Nouvelles Technologies — ALGDETIC</strong> (Ing. Miguel Ángel Gaspar Villalba) ont participé à divers panels et présentations, avec la présidence internationale de <strong>FIADI</strong> (Dr. Bibiana Luz Clara), la <strong>Fédération Ibéro-Américaine des Associations de Droit et Informatique</strong>. Ajoutés aux représentants de <em>California State University Dominguez Hills</em>, l\'<em>Université Alfonso X El Sabio</em>, l\'<em>Université de Newcastle</em> et le <em>CIDE</em>, ils ont fait du CUCEA l\'un des rares lieux mexicains où, cette année-là, on a discuté avec cette profondeur ce que le droit ne savait pas encore répondre à la technologie.',
      m1_s1_p3_html: 'De cette édition est sorti l\'engagement institutionnel de continuité. Le Forum a cessé d\'être une idée pour devenir un événement académique avec une vocation de permanence, organisé par <em>les membres actuels du</em> <strong>Corps Académique UDG-CA-1236 « Droit et Technologie »</strong> —alors encore en cours de formation—, avec l\'Académie de Droit Économique des Affaires, le Département de Sciences Sociales et Juridiques et le Master en Résolution des Conflits du CUCEA, sous la direction académique permanente du <em>Dr. Juan Emmanuel Delva Benavides</em>.',
      // II Numéralia
      m1_s2_label: 'Chiffres · I édition',
      m1_s2_title_html: 'Les <em>chiffres</em> d\'un commencement.',
      m1_s2_lbl1: 'Présentations au programme',
      m1_s2_lbl2: 'Journées présentiel + virtuel',
      m1_s2_lbl3: 'Pays représentés',
      m1_s2_lbl4: 'Axes thématiques abordés',
      m1_s2_lbl5: 'Présidences institutionnelles présentes — ALGDETIC · AMCID · AMDI · COFECE · INAI · STJ Jalisco',
      m1_s2_lbl6: 'Présidence internationale — Dr. Bibiana Luz Clara',
      m1_s2_lbl7: 'Auditorium Central · Rectorat comme soutien institutionnel',
      m1_s2_lbl8: 'Édition fondatrice · premier pas du Forum',
      // III Axes
      m1_s3_label: 'Axes thématiques',
      m1_s3_title_html: 'Cinq <em>conversations</em> qui ont ouvert l\'agenda.',
      m1_s3_intro: 'La I édition a tracé pour la première fois les axes qui se consolideraient ensuite comme colonne vertébrale du Forum. La curation a cherché à couvrir le spectre complet : du débat législatif en cours aux cas d\'usage émergents dans les tribunaux.',
      m1_s3_eje1: 'Régulation en matière de Cybersécurité',
      m1_s3_eje2: 'ADR et cas d\'usage technologiques · Justice Alternative en ligne',
      m1_s3_eje3: 'Audit d\'algorithmes de recommandation',
      m1_s3_eje4: 'Régulation et cybersécurité dans les entités publiques',
      m1_s3_eje5: 'Vie privée mentale, neurosciences et informatique quantique',
      // IV Intervenants
      m1_s4_label: 'Intervenants en vedette',
      m1_s4_title_html: 'Les <em>voix</em> qui ont ouvert le chemin.',
      m1_s4_intro_html: 'La curation de la I édition a préservé l\'équilibre qui deviendrait plus tard la marque de la maison : <strong>académie + secteur judiciaire + législatif + régulateur + secteur privé + organismes internationaux</strong>. Ce qui suit est une sélection représentative de ceux qui ont effectivement participé ; le programme complet a couvert 23 interventions.',
      m1_p1_role: 'Sénat de la République',
      m1_p1_afil: 'Inauguration · Régulation de Cybersécurité',
      m1_p2_role: 'Rectorat CUCEA · UDG',
      m1_p2_afil: 'Soutien institutionnel · Bienvenue inaugurale',
      m1_p3_role: 'Présidence · FIADI',
      m1_p3_afil: 'Fédération Ibéro-Américaine des Associations de Droit et Informatique · La Justice Alternative en ligne',
      m1_p4_role: 'Présidence · STJ Jalisco',
      m1_p4_afil: 'Cour Suprême de Justice de l\'État de Jalisco · Justice en ligne dans l\'État',
      m1_p5_role: 'Présidence · COFECE',
      m1_p5_afil: 'Commission Fédérale de Concurrence Économique · Régulation et cybersécurité dans les entités publiques',
      m1_p6_role: 'Présidence · INAI',
      m1_p6_afil: 'Institut National de Transparence, Accès à l\'Information et Protection des Données Personnelles · Panel régulateur',
      m1_p7_role: 'Présidence · AMCID',
      m1_p7_afil: 'Académie Mexicaine de Cybersécurité et Droit Numérique · Cybersécurité au Mexique',
      m1_p8_role: 'Présidence · AMDI',
      m1_p8_afil: 'Académie Mexicaine de Droit Informatique · IA dans le domaine juridique',
      m1_p9_role: 'Présidence · ALGDETIC',
      m1_p9_afil: 'Réseau Latino-Américain de Gouvernement, Droit et Nouvelles Technologies · Audit d\'algorithmes de recommandation',
      m1_p10_role: 'CSU Dominguez Hills · USA',
      m1_p10_afil: 'ADR et cas d\'usage technologiques',
      m1_p11_role: 'CIDE',
      m1_p11_afil: 'Vie privée mentale · IA, neurosciences et informatique quantique',
      m1_p12_role: 'U. Newcastle · UAX Madrid · OMA',
      m1_p12_afil: 'Successions numériques · IA dans l\'automatisation des processus judiciaires',
      // V Programme
      m1_s5_label: 'Programme',
      m1_s5_title_html: 'Deux <em>journées</em>, un agenda inaugural.',
      m1_s5_day1: 'Mardi 14 novembre · Jour 1',
      m1_s5_d1r1_topic: '<strong>Actes protocolaires · Bienvenue</strong>',
      m1_s5_d1r1_who: 'Sén. Alejandra Lagunes Soto Ruiz · Mtro. Luis Gustavo Padilla Montes (Recteur CUCEA)',
      m1_s5_d1r2_topic: 'Panel · <strong>Régulation en matière de Cybersécurité</strong>',
      m1_s5_d1r2_who: 'Sén. Alejandra Lagunes Soto Ruiz',
      m1_s5_d1r3_topic: 'Panel · <strong>ADR et cas d\'usage technologiques</strong>',
      m1_s5_d1r3_who: 'Dr. René Castro · Dr. John Swarbrick (CSU Dominguez Hills)',
      m1_s5_d1r4_topic: '<strong>La Justice Alternative en ligne</strong>',
      m1_s5_d1r4_who: 'Dr. Bibiana Luz Clara · Présidence FIADI',
      m1_s5_d1r5_topic: '<strong>Audit d\'Algorithmes de Recommandation</strong>',
      m1_s5_d1r5_who: 'Ing. Miguel Ángel Gaspar · ALGDETIC',
      m1_s5_day2: 'Mercredi 15 novembre · Jour 2',
      m1_s5_d2r1_topic: 'Panel · <strong>Régulation et cybersécurité dans les entités publiques</strong>',
      m1_s5_d2r1_who: 'Dr. Andrea Marvan (COFECE) · Mtra. Blanca Lilia Ibarra (INAI)',
      m1_s5_d2r2_topic: '<strong>Cybersécurité au Mexique</strong>',
      m1_s5_d2r2_who: 'Dr. Ernesto Ibarra · Académie Mexicaine de Cybersécurité',
      m1_s5_d2r3_topic: '<strong>Intelligence artificielle dans le domaine juridique</strong>',
      m1_s5_d2r3_who: 'Mtro. Joel Gómez Treviño · Académie Mexicaine de Droit Informatique',
      m1_s5_d2r4_topic: '<strong>Les successions dans le monde numérique</strong>',
      m1_s5_d2r4_who: 'Dr. Mauricio Figueroa Torres · Université de Newcastle',
      m1_s5_d2r5_topic: '<strong>Vie privée mentale, IA, neurosciences et informatique quantique</strong>',
      m1_s5_d2r5_who: 'Dr. Olivia Andrea Mendoza Enríquez · CIDE',
      m1_s5_d2r6_topic: '<strong>IA appliquée à l\'automatisation des processus judiciaires</strong>',
      m1_s5_d2r6_who: 'Dr. María Luisa García Torres · Dr. Juliana Caicedo · UAX-OMA',
      m1_s5_d2r7_topic: '<strong>Justice en ligne dans l\'État de Jalisco</strong>',
      m1_s5_d2r7_who: 'Magistrat Daniel Espinoza Licón · STJ Jalisco',
      // VI Galerie
      m1_s6_label: 'Galerie',
      m1_s6_title_html: 'Comment ça s\'est <em>vécu</em>.',
      m1_g0: 'Affiche officielle · I Édition 2023',
      m1_g1: 'Présentation d\'intervenant · panneau institutionnel CUCEA',
      m1_g2: 'Panel principal · écran CUCEA',
      m1_g3: 'Participation de l\'auditoire',
      m1_g4: 'Auditorium CUCEA · 14 nov. 2023',
      m1_g5: 'Panel inaugural · sept voix à la table',
      m1_g6: 'Panel virtuel · UAX Madrid + Rectorat CUCEA',
      m1_g7: 'Photo de groupe · autorités, intervenants et auditoire',
      m1_g8: 'Remise de certificat · Salle du Gouvernement CUCEA',
      m1_g9: 'Salle parallèle · trois écrans CUCEA',
      m1_g10: 'Conversation rapprochée avec l\'auditoire',
      // VII Héritage
      m1_s7_label: 'Héritage',
      m1_s7_title_html: 'Ce qui <em>est resté</em> après la chute du rideau.',
      m1_s7_intro: 'La I édition n\'a pas été un événement qui s\'est épuisé dans son programme. Elle a posé quatre fondements que les éditions suivantes ont capitalisé.',
      m1_s7_pillar1_h: 'Concentration de présidences',
      m1_s7_pillar1_p_html: 'Tout au long du programme, les <strong>présidences</strong> de FIADI, ALGDETIC, AMCID, AMDI, COFECE, INAI et STJ Jalisco ont participé. Une densité institutionnelle difficile à reproduire dans un seul lieu académique.',
      m1_s7_pillar2_h: 'Réseau interinstitutionnel',
      m1_s7_pillar2_p: 'Articulation opérationnelle entre CUCEA, FIADI, ALGDETIC, AMCID, AMDI, STJ Jalisco, COFECE et INAI comme réseau de continuité pour les éditions suivantes.',
      m1_s7_pillar3_h: 'Cadre des axes',
      m1_s7_pillar3_p_html: 'Premier tracé des <strong>axes thématiques</strong> qui dans la II édition se consolident à 7 comme colonne vertébrale du Forum, et qui dans la IV s\'étendent à 9 avec l\'incorporation de santé numérique et IA agentique.',
      m1_s7_pillar4_h: 'Soutien CUCEA',
      m1_s7_pillar4_p_html: 'Soutien explicite du <strong>Rectorat du CUCEA</strong> au Forum comme événement académique permanent, officialisé depuis cette édition.',
      m1_s7_pillar5_h: 'Internationalisation précoce',
      m1_s7_pillar5_p: 'Présence dès le premier jour d\'intervenants des États-Unis, d\'Espagne, du Royaume-Uni, d\'Argentine, de Colombie et du Paraguay, marquant le ton du caractère ibéro-américain du Forum.',
      m1_s7_pillar6_h: 'Direction académique permanente',
      m1_s7_pillar6_p_html: 'Consolidation du <strong>Dr. Juan Emmanuel Delva Benavides</strong> comme Directeur Académique permanent du Forum, rôle qui soutient la continuité éditoriale et curatoriale des éditions suivantes.',
      m1_s7_pillar7_h: 'Semence du Corps Académique',
      m1_s7_pillar7_p_html: 'Cette édition a semé l\'équipe de professeurs-chercheurs qui, deux ans plus tard, formerait le <strong>Corps Académique UDG-CA-1236 « Droit et Technologie »</strong>, aujourd\'hui organisateur formel du Forum.',
      // Pied de page
      m1_footer_meta: '© 2026 · IV Forum International du Droit et de la Technologie · CUCEA · Université de Guadalajara · emmanueldelva@cucea.udg.mx',

      // Memoria II (2024)
      mem2_eyebrow: 'II Édition · 2024',
      mem2_title_html: 'II Forum International<br>du Droit et de la <em>Technologie</em>.',
      mem2_lead: 'Deuxième édition du Forum. Consolidation thématique et constitution du Comité Scientifique. Format hybride avec une participation internationale élargie et un approfondissement sur les axes IA, cybersécurité et propriété intellectuelle numérique.',
      mem2_meta_dates_value: '2024',
      mem2_meta_venue_value: 'CUCEA · Université de Guadalajara',
      mem2_meta_modality_value: 'Hybride',
      mem2_resena_p1: '[À compléter.] Espace réservé pour l\'aperçu détaillé de la deuxième édition du Forum : contexte institutionnel, axes thématiques, principaux intervenants, conclusions et publications dérivées.',
      mem2_resena_p2: 'Cette deuxième édition a consolidé les bases du Forum comme espace académique pluriel où juristes, ingénieurs, juges et régulateurs d\'Ibéro-Amérique discutent de la manière dont le droit doit répondre à l\'intelligence artificielle, à la crypto-économie, à la cybersécurité et à la propriété intellectuelle numérique.',

      // Memoria III (2025)
      mem3_eyebrow: 'III Édition · 2025',
      mem3_title_html: 'III Forum International<br>du Droit et de la <em>Technologie</em>.',
      mem3_lead: 'Troisième édition du Forum. Saut international avec des intervenants de six pays et expansion vers les axes FinTech, biotechnologies et droits humains numériques. Lancement du livre collectif de la série « Innovación Jurídica en la era digital ».',
      mem3_meta_dates_value: '2025',
      mem3_meta_venue_value: 'CUCEA · Université de Guadalajara',
      mem3_meta_modality_value: 'Hybride',
      mem3_resena_p1: '[À compléter.] Espace réservé pour l\'aperçu détaillé de la troisième édition du Forum : contexte institutionnel, axes thématiques, principaux intervenants, conclusions et publications dérivées.',
      mem3_resena_p2: 'Cette troisième édition a projeté internationalement les bases du Forum comme espace académique pluriel où juristes, ingénieurs, juges et régulateurs d\'Ibéro-Amérique discutent de la manière dont le droit doit répondre à l\'intelligence artificielle, à la crypto-économie, à la cybersécurité et à la propriété intellectuelle numérique.',
      cfp_date1_step: '01 · Réception',
      cfp_date1_label: 'envoi des contributions',
      cfp_date1_value_html: '1 mai —<br>15 juillet 2026',
      cfp_date2_step: '02 · Décision',
      cfp_date2_label: 'notification d\'acceptation',
      cfp_date2_value_html: '20 août<br>2026',
      cfp_date3_step: '03 · Événement',
      cfp_date3_label: 'dates du forum',
      cfp_date3_value: '21 et 22 septembre 2026',
      cfp_topic1_t: 'IA Agentique et Propriété Intellectuelle Générative',
      cfp_topic2_t: 'Technologies Émergentes',
      cfp_topic3_t: 'Cybersécurité et Souveraineté Numérique',
      cfp_topic4_t: 'Justice Numérique et Innovation Juridique',
      cfp_topic5_t: 'Droits Humains Numériques',
      cfp_topic6_t: 'FinTech et Économie Numérique',
      cfp_topic7_t: 'Santé Numérique et Biotechnologies',
      cfp_envelope_corr: 'Correspondance éditoriale',
      cfp_envelope_subject: 'Objet du courriel',
      cfp_envelope_body: 'Corps du courriel',
      cfp_envelope_attach: 'Pièce jointe',
      cfp_callout_title: 'Rappel final',

      // ===== FOOTER =====
      foot_copy: '© 2026 · IV Forum International du Droit et de la Technologie',
      foot_inst: 'CUCEA · Université de Guadalajara'
    }
  };

  // ============ NÚCLEO ============
  // WeakMap para capturar el HTML/texto original del DOM en la carga inicial.
  // Cuando el usuario cambia a 'es' (default), restauramos desde aquí en lugar
  // de usar el diccionario es — así el HTML siempre es la fuente de verdad
  // para el idioma por defecto y evitamos drift entre JS y HTML.
  const ORIGINAL = new WeakMap();
  let captured = false;

  function captureOriginals() {
    if (captured) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      ORIGINAL.set(el, { text: el.textContent });
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const prev = ORIGINAL.get(el) || {};
      prev.html = el.innerHTML;
      ORIGINAL.set(el, prev);
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const spec = el.getAttribute('data-i18n-attr');
      const attrs = {};
      spec.split(',').forEach(pair => {
        const idx = pair.indexOf(':');
        if (idx === -1) return;
        const attr = pair.substring(0, idx).trim();
        attrs[attr] = el.getAttribute(attr);
      });
      const prev = ORIGINAL.get(el) || {};
      prev.attrs = attrs;
      ORIGINAL.set(el, prev);
    });
    captured = true;
  }

  function getLang() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('lang');
    if (fromUrl && SUPPORTED.indexOf(fromUrl) !== -1) return fromUrl;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.indexOf(stored) !== -1) return stored;
    } catch (e) { /* sandboxed iframe / disabled storage */ }
    return DEFAULT_LANG;
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) return;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    applyI18n(lang);
    updateSwitcher(lang);
    document.documentElement.setAttribute('lang', lang);
  }

  function applyI18n(lang) {
    captureOriginals();

    // Para el idioma por defecto (es), restauramos los originales del HTML
    // — no usamos el diccionario es, así evitamos cualquier drift entre lo
    // que dice el HTML y lo que dice el diccionario.
    if (lang === DEFAULT_LANG) {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const o = ORIGINAL.get(el);
        if (o && o.text !== undefined) el.textContent = o.text;
      });
      document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const o = ORIGINAL.get(el);
        if (o && o.html !== undefined) el.innerHTML = o.html;
      });
      document.querySelectorAll('[data-i18n-attr]').forEach(el => {
        const o = ORIGINAL.get(el);
        if (o && o.attrs) {
          for (const attr in o.attrs) {
            if (o.attrs[attr] !== null) el.setAttribute(attr, o.attrs[attr]);
          }
        }
      });
      return;
    }

    // Para en/fr: aplica del diccionario; si una key falta, restaura el original.
    const dict = D[lang] || {};

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) {
        el.textContent = dict[key];
      } else {
        const o = ORIGINAL.get(el);
        if (o && o.text !== undefined) el.textContent = o.text;
      }
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (dict[key] !== undefined) {
        el.innerHTML = dict[key];
      } else {
        const o = ORIGINAL.get(el);
        if (o && o.html !== undefined) el.innerHTML = o.html;
      }
    });

    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const spec = el.getAttribute('data-i18n-attr');
      spec.split(',').forEach(pair => {
        const idx = pair.indexOf(':');
        if (idx === -1) return;
        const attr = pair.substring(0, idx).trim();
        const key = pair.substring(idx + 1).trim();
        if (dict[key] !== undefined) {
          el.setAttribute(attr, dict[key]);
        } else {
          const o = ORIGINAL.get(el);
          if (o && o.attrs && o.attrs[attr] !== undefined && o.attrs[attr] !== null) {
            el.setAttribute(attr, o.attrs[attr]);
          }
        }
      });
    });
  }

  function updateSwitcher(lang) {
    document.querySelectorAll('.lang [data-lang]').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-lang') === lang);
    });
  }

  function bindSwitcher() {
    document.querySelectorAll('.lang [data-lang]').forEach(el => {
      el.addEventListener('click', () => {
        const lang = el.getAttribute('data-lang');
        setLang(lang);
      });
    });
  }

  function init() {
    const lang = getLang();
    bindSwitcher();
    applyI18n(lang);
    updateSwitcher(lang);
    document.documentElement.setAttribute('lang', lang);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expone API mínima para debug (no usar en código de producción)
  window.foroI18n = { setLang: setLang, getLang: getLang };
})();
