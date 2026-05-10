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

      // Ponentes placeholder
      idx_ponente_pc: 'To be confirmed',

      // Footer columns
      foot_col_edition: 'Edition IV',
      foot_col_institutional: 'Institutional',
      foot_col_memorias: 'Past editions',
      foot_col_contact: 'Contact',
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

      // Ponentes placeholder
      idx_ponente_pc: 'À confirmer',

      // Footer columns
      foot_col_edition: 'Édition IV',
      foot_col_institutional: 'Institutionnel',
      foot_col_memorias: 'Éditions précédentes',
      foot_col_contact: 'Contact',
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
