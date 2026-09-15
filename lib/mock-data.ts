// GENERADO — no editar a mano.
// Fuente: data/raw-data.json + data/raw-historico.json (datos reales de GAIP,
// corte 10 sep 2026 · 08:30). Regenerar con: node scripts/build-mock-data.mjs

export type Estado = 'Detectada' | 'Filtrada' | 'En trabajo' | 'Construcción' | 'Fallo';

export type Tarea = { nombre: string; area: 'Económica' | 'Técnica' | 'Precio'; avance: number; responsable: string };

export type Licitacion = {
  id: string;
  numero: string;
  nombre: string;
  nombreFuente: string;
  dependencia: string;
  entidad: string;
  estado: Estado;
  estatus: string;
  tipo: string;
  aclaraciones: string;
  apertura: string;
  fallo?: string;
  nueva?: boolean;
  esExterna?: boolean;
  tareas?: Tarea[];
  fechaAceptacion?: string;
  fechaVisitaObra?: string;
};

export const licitaciones: Licitacion[] = [
  {
    "id": "XLS-LO09217009217002N1052026",
    "numero": "LO-09-217-009217002-N-105-2026",
    "nombre": "Supervisión Centros De Educación Y Cuidado Infantil Lagos De Moreno, Jalisco",
    "nombreFuente": "SUPERVISIÓN CENTROS DE EDUCACIÓN Y CUIDADO INFANTIL LAGOS DE MORENO, JALISCO",
    "dependencia": "SICT",
    "entidad": "Por confirmar",
    "estado": "Fallo",
    "estatus": "Seguimiento externo",
    "tipo": "Sin clasificar",
    "esExterna": true,
    "aclaraciones": "18 ago 2026",
    "apertura": "27 ago 2026",
    "fallo": "11 sep 2026",
    "nueva": false,
    "tareas": [
      {
        "nombre": "Elaborar propuesta económica",
        "area": "Económica",
        "avance": 100,
        "responsable": "ALICIA"
      },
      {
        "nombre": "Integrar presupuesto",
        "area": "Económica",
        "avance": 100,
        "responsable": "ALICIA"
      },
      {
        "nombre": "Subir propuesta económica",
        "area": "Económica",
        "avance": 100,
        "responsable": "ALICIA"
      },
      {
        "nombre": "Aceptación de precio",
        "area": "Precio",
        "avance": 100,
        "responsable": "JEMO"
      },
      {
        "nombre": "Validar precio interno",
        "area": "Precio",
        "avance": 100,
        "responsable": "JEMO"
      },
      {
        "nombre": "Elaborar propuesta técnica",
        "area": "Técnica",
        "avance": 100,
        "responsable": "JAVIER/BRENDA"
      },
      {
        "nombre": "Preparar reporte técnico",
        "area": "Técnica",
        "avance": 100,
        "responsable": "JAVIER/BRENDA"
      },
      {
        "nombre": "Subir propuesta técnica",
        "area": "Técnica",
        "avance": 100,
        "responsable": "JAVIER/BRENDA"
      }
    ],
    "fechaAceptacion": "2026-08-16",
    "fechaVisitaObra": "2026-08-18"
  },
  {
    "id": "E-2026-00093484",
    "numero": "LO-13-J2Z-013J2Z999-N-15-2026",
    "nombre": "Supervisión Para El Control De Calidad De La Obra Mejoramiento Etapa 2",
    "nombreFuente": "SUPERVISIÓN PARA EL CONTROL DE CALIDAD DE LA OBRA MEJORAMIENTO ETAPA 2",
    "dependencia": "ASIPONAGUAYMAS",
    "entidad": "Sonora",
    "estado": "Fallo",
    "estatus": "Vigente",
    "tipo": "Servicios Relacionados Con La Obra",
    "esExterna": false,
    "aclaraciones": "25 ago 2026 · 11:00",
    "apertura": "01 sep 2026 · 11:00",
    "fallo": "11 sep 2026",
    "nueva": false,
    "tareas": [
      {
        "nombre": "Elaborar propuesta económica",
        "area": "Económica",
        "avance": 50,
        "responsable": "LUIS"
      },
      {
        "nombre": "Integrar presupuesto",
        "area": "Económica",
        "avance": 90,
        "responsable": "LUIS"
      },
      {
        "nombre": "Subir propuesta económica",
        "area": "Económica",
        "avance": 0,
        "responsable": "LUIS"
      },
      {
        "nombre": "Aceptación de precio",
        "area": "Precio",
        "avance": 100,
        "responsable": "JEMO"
      },
      {
        "nombre": "Validar precio interno",
        "area": "Precio",
        "avance": 100,
        "responsable": "JEMO"
      },
      {
        "nombre": "Elaborar propuesta técnica",
        "area": "Técnica",
        "avance": 90,
        "responsable": "BRENDA"
      },
      {
        "nombre": "Preparar reporte técnico",
        "area": "Técnica",
        "avance": 90,
        "responsable": "BRENDA"
      },
      {
        "nombre": "Subir propuesta técnica",
        "area": "Técnica",
        "avance": 0,
        "responsable": "BRENDA"
      }
    ],
    "fechaAceptacion": "2026-08-16",
    "fechaVisitaObra": "2026-08-21"
  },
  {
    "id": "XLS-SIOPESMA0BLP05692026",
    "numero": "SIOP-E-SMA-0B-LP-0569-2026",
    "nombre": "Construcción De Estructura, Albañilerías En Talleres Del Centro De Autismo De Puerto Vallarta, Jalisco,",
    "nombreFuente": "Construcción de estructura, albañilerías en talleres del Centro de Autismo de Puerto Vallarta, Jalisco,",
    "dependencia": "SIOP",
    "entidad": "Por confirmar",
    "estado": "Fallo",
    "estatus": "Seguimiento externo",
    "tipo": "Sin clasificar",
    "esExterna": true,
    "aclaraciones": "19 ago 2026",
    "apertura": "07 sep 2026",
    "fallo": "17 sep 2026",
    "nueva": false,
    "tareas": [
      {
        "nombre": "Elaborar propuesta económica",
        "area": "Económica",
        "avance": 0,
        "responsable": "ALICIA"
      },
      {
        "nombre": "Integrar presupuesto",
        "area": "Económica",
        "avance": 0,
        "responsable": "ALICIA"
      },
      {
        "nombre": "Subir propuesta económica",
        "area": "Económica",
        "avance": 0,
        "responsable": "ALICIA"
      },
      {
        "nombre": "Aceptación de precio",
        "area": "Precio",
        "avance": 0,
        "responsable": "JEMO"
      },
      {
        "nombre": "Validar precio interno",
        "area": "Precio",
        "avance": 0,
        "responsable": "JEMO"
      },
      {
        "nombre": "Elaborar propuesta técnica",
        "area": "Técnica",
        "avance": 0,
        "responsable": "JAVIER/BRENDA"
      },
      {
        "nombre": "Preparar reporte técnico",
        "area": "Técnica",
        "avance": 0,
        "responsable": "JAVIER/BRENDA"
      },
      {
        "nombre": "Subir propuesta técnica",
        "area": "Técnica",
        "avance": 0,
        "responsable": "JAVIER/BRENDA"
      }
    ],
    "fechaAceptacion": "2026-08-17",
    "fechaVisitaObra": "2026-08-17"
  },
  {
    "id": "E-2026-00099510",
    "numero": "LO-09-217-009217002-N-110-2026",
    "nombre": "Proyecto Integral Centro De Educación Y Cuidado Infantil Torreón, Coahuila",
    "nombreFuente": "PROYECTO INTEGRAL CENTRO DE EDUCACIÓN Y CUIDADO INFANTIL TORREÓN, COAHUILA",
    "dependencia": "SICT",
    "entidad": "Coahuila De Zaragoza",
    "estado": "En trabajo",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 13:00",
    "apertura": "18 sep 2026 · 12:00",
    "nueva": true
  },
  {
    "id": "E-2026-00080053",
    "numero": "LO-09-JZO-009JZO001-N-33-2026",
    "nombre": "Supervisión, Control Y Seguimiento De La Construcción Y Diseño De 57 Km Tramo II",
    "nombreFuente": "SUPERVISIÓN, CONTROL Y SEGUIMIENTO DE LA CONSTRUCCIÓN Y DISEÑO DE 57 KM TRAMO II",
    "dependencia": "ATTRAPI",
    "entidad": "Ciudad De México",
    "estado": "En trabajo",
    "estatus": "En Aclaraciones",
    "tipo": "Servicios Relacionados Con La Obra",
    "esExterna": false,
    "aclaraciones": "19 ago 2026 · 11:00",
    "apertura": "23 sep 2026",
    "fallo": "08 oct 2026",
    "nueva": false,
    "tareas": [
      {
        "nombre": "Elaborar propuesta económica",
        "area": "Económica",
        "avance": 15,
        "responsable": "ALICIA"
      },
      {
        "nombre": "Integrar presupuesto",
        "area": "Económica",
        "avance": 60,
        "responsable": "ALICIA"
      },
      {
        "nombre": "Subir propuesta económica",
        "area": "Económica",
        "avance": 0,
        "responsable": "ALICIA"
      },
      {
        "nombre": "Aceptación de precio",
        "area": "Precio",
        "avance": 0,
        "responsable": "JEMO"
      },
      {
        "nombre": "Validar precio interno",
        "area": "Precio",
        "avance": 15,
        "responsable": "JEMO"
      },
      {
        "nombre": "Elaborar propuesta técnica",
        "area": "Técnica",
        "avance": 30,
        "responsable": "JAVIER/BRENDA"
      },
      {
        "nombre": "Preparar reporte técnico",
        "area": "Técnica",
        "avance": 30,
        "responsable": "JAVIER/BRENDA"
      },
      {
        "nombre": "Subir propuesta técnica",
        "area": "Técnica",
        "avance": 0,
        "responsable": "JAVIER/BRENDA"
      }
    ],
    "fechaAceptacion": "2026-08-15",
    "fechaVisitaObra": "2026-08-18"
  },
  {
    "id": "XLS-LO09JZO009JZO001N342026",
    "numero": "LO-09-JZO-009JZO001-N-34-2026",
    "nombre": "Supervisión, Control Y Seguimiento De La Construcción Y Diseño De 93 Km Tramo III",
    "nombreFuente": "SUPERVISIÓN, CONTROL Y SEGUIMIENTO DE LA CONSTRUCCIÓN Y DISEÑO DE 93 KM TRAMOIII",
    "dependencia": "ATTRAPI",
    "entidad": "Por confirmar",
    "estado": "En trabajo",
    "estatus": "Seguimiento externo",
    "tipo": "Sin clasificar",
    "esExterna": true,
    "aclaraciones": "25 ago 2026",
    "apertura": "25 sep 2026",
    "fallo": "30 sep 2026",
    "nueva": false,
    "tareas": [
      {
        "nombre": "Elaborar propuesta económica",
        "area": "Económica",
        "avance": 0,
        "responsable": "ALICIA"
      },
      {
        "nombre": "Integrar presupuesto",
        "area": "Económica",
        "avance": 0,
        "responsable": "ALICIA"
      },
      {
        "nombre": "Subir propuesta económica",
        "area": "Económica",
        "avance": 0,
        "responsable": "ALICIA"
      },
      {
        "nombre": "Aceptación de precio",
        "area": "Precio",
        "avance": 0,
        "responsable": "JEMO"
      },
      {
        "nombre": "Validar precio interno",
        "area": "Precio",
        "avance": 0,
        "responsable": "JEMO"
      },
      {
        "nombre": "Elaborar propuesta técnica",
        "area": "Técnica",
        "avance": 0,
        "responsable": "JAVIER/BRENDA"
      },
      {
        "nombre": "Preparar reporte técnico",
        "area": "Técnica",
        "avance": 0,
        "responsable": "JAVIER/BRENDA"
      },
      {
        "nombre": "Subir propuesta técnica",
        "area": "Técnica",
        "avance": 0,
        "responsable": "JAVIER/BRENDA"
      }
    ],
    "fechaAceptacion": "2026-08-21",
    "fechaVisitaObra": "2026-08-24"
  },
  {
    "id": "E-2026-00084041",
    "numero": "LO-09-JZO-009JZO001-N-35-2026",
    "nombre": "Supervisión, Control Y Seguimiento De La Construcción Y Diseño De 82.00 Km Del…",
    "nombreFuente": "“SUPERVISIÓN, CONTROL Y SEGUIMIENTO DE LA CONSTRUCCIÓN Y DISEÑO DE 82.00 KM DEL",
    "dependencia": "ATTRAPI",
    "entidad": "Ciudad De México",
    "estado": "En trabajo",
    "estatus": "Vigente",
    "tipo": "Servicios Relacionados Con La Obra",
    "esExterna": false,
    "aclaraciones": "03 ago 2026 · 11:00",
    "apertura": "11 sep 2026 · 12:00",
    "nueva": false,
    "tareas": [
      {
        "nombre": "Elaborar propuesta económica",
        "area": "Económica",
        "avance": 60,
        "responsable": "LUIS"
      },
      {
        "nombre": "Integrar presupuesto",
        "area": "Económica",
        "avance": 80,
        "responsable": "LUIS"
      },
      {
        "nombre": "Subir propuesta económica",
        "area": "Económica",
        "avance": 0,
        "responsable": "LUIS"
      },
      {
        "nombre": "Aceptación de precio",
        "area": "Precio",
        "avance": 100,
        "responsable": "JEMO"
      },
      {
        "nombre": "Validar precio interno",
        "area": "Precio",
        "avance": 100,
        "responsable": "JEMO"
      },
      {
        "nombre": "Elaborar propuesta técnica",
        "area": "Técnica",
        "avance": 90,
        "responsable": "JAVIER/BRENDA"
      },
      {
        "nombre": "Preparar reporte técnico",
        "area": "Técnica",
        "avance": 85,
        "responsable": "JAVIER/BRENDA"
      },
      {
        "nombre": "Subir propuesta técnica",
        "area": "Técnica",
        "avance": 0,
        "responsable": "JAVIER/BRENDA"
      }
    ],
    "fechaAceptacion": "2026-07-29",
    "fechaVisitaObra": "2026-07-31"
  },
  {
    "id": "E-2026-00087263",
    "numero": "LO-09-JZO-009JZO001-N-51-2026",
    "nombre": "Supervisión, Control Y Seg De La Construcción Y Diseño De 15.69 Km Del Tramo V",
    "nombreFuente": "SUPERVISIÓN, CONTROL Y SEG DE LA CONSTRUCCIÓN Y DISEÑO DE 15.69 KM DEL TRAMO V",
    "dependencia": "ATTRAPI",
    "entidad": "Ciudad De México",
    "estado": "En trabajo",
    "estatus": "Vigente",
    "tipo": "Servicios Relacionados Con La Obra",
    "esExterna": false,
    "aclaraciones": "04 sep 2026 · 13:00",
    "apertura": "02 oct 2026 · 11:00",
    "nueva": true
  },
  {
    "id": "E-2026-00095723",
    "numero": "LO-09-JZO-009JZO001-N-56-2026",
    "nombre": "Supervisión, Control Y Seguimiento De La Construcción Y Diseño De 3 Estaciones",
    "nombreFuente": "SUPERVISIÓN, CONTROL Y SEGUIMIENTO DE LA CONSTRUCCIÓN Y DISEÑO DE 3 ESTACIONES",
    "dependencia": "ATTRAPI",
    "entidad": "Ciudad De México",
    "estado": "En trabajo",
    "estatus": "Vigente",
    "tipo": "Servicios Relacionados Con La Obra",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 12:00",
    "apertura": "08 oct 2026 · 12:00",
    "nueva": false
  },
  {
    "id": "E-2026-00100127",
    "numero": "LO-38-91C-03891C999-N-166-2026",
    "nombre": "Anteproyectos Arquitectónicos-Proyectos Ejecutivos De El Colef Juárez Y Nogales",
    "nombreFuente": "ANTEPROYECTOS ARQUITECTÓNICOS-PROYECTOS EJECUTIVOS DE EL COLEF JUÁREZ Y NOGALES",
    "dependencia": "COLEF",
    "entidad": "Baja California",
    "estado": "En trabajo",
    "estatus": "Vigente",
    "tipo": "Servicios Relacionados Con La Obra",
    "esExterna": false,
    "aclaraciones": "18 sep 2026 · 11:00",
    "apertura": "28 sep 2026 · 11:00",
    "nueva": true
  },
  {
    "id": "E-2026-00100399",
    "numero": "LO-51-GYN-051GYN001-N-188-2026",
    "nombre": "Supervisión Y Control Trabajos Clínica Hospital Chilpancingo",
    "nombreFuente": "SUPERVISIÓN Y CONTROL TRABAJOS  CLÍNICA HOSPITAL CHILPANCINGO",
    "dependencia": "ISSSTE",
    "entidad": "Ciudad De México",
    "estado": "En trabajo",
    "estatus": "Vigente",
    "tipo": "Servicios Relacionados Con La Obra",
    "esExterna": false,
    "aclaraciones": "11 sep 2026 · 14:00",
    "apertura": "18 sep 2026 · 11:00",
    "nueva": true
  },
  {
    "id": "EXT-1A274D55",
    "numero": "No. LPL 654/2026",
    "nombre": "Adquisición De Servicio De Mantenimiento A Láminas De Cubierta Existente Y Aplicación De Pintura Para El Auditorio Benito Juárez",
    "nombreFuente": "ADQUISICIÓN DE SERVICIO DE MANTENIMIENTO A LÁMINAS DE CUBIERTA EXISTENTE Y APLICACIÓN DE PINTURA PARA EL AUDITORIO BENITO JUÁREZ",
    "dependencia": "SECRETARIA DE ADMINISTRACIÓN",
    "entidad": "Jalisco",
    "estado": "En trabajo",
    "estatus": "Seguimiento externo",
    "tipo": "Sin clasificar",
    "esExterna": true,
    "aclaraciones": "25 ago 2026",
    "apertura": "11 sep 2026",
    "nueva": false
  },
  {
    "id": "E-2026-00091321",
    "numero": "LA-06-G1C-006G1C003-N-36-2026",
    "nombre": "Supervisión Etapa Construcción O Modernización Tramo 8 Corredor Golfo México",
    "nombreFuente": "SUPERVISIÓN ETAPA CONSTRUCCIÓN O MODERNIZACIÓN TRAMO 8 CORREDOR GOLFO MÉXICO",
    "dependencia": "BANOBRAS",
    "entidad": "Ciudad De México",
    "estado": "Construcción",
    "estatus": "En Aclaraciones",
    "tipo": "Servicios",
    "esExterna": false,
    "aclaraciones": "01 sep 2026 · 10:00",
    "apertura": "14 sep 2026 · 10:00",
    "nueva": false
  },
  {
    "id": "E-2026-00097551",
    "numero": "LA-07-110-007000999-T-657-2026",
    "nombre": "Construccion De Instalaciones Del Cuartel General Del Campo Militar Estrategico",
    "nombreFuente": "CONSTRUCCION DE INSTALACIONES DEL CUARTEL GENERAL DEL CAMPO MILITAR ESTRATEGICO",
    "dependencia": "SEDENA",
    "entidad": "Ciudad De México",
    "estado": "Construcción",
    "estatus": "En Aclaraciones",
    "tipo": "Adquisiciones",
    "esExterna": false,
    "aclaraciones": "10 sep 2026 · 08:00",
    "apertura": "06 oct 2026 · 09:00",
    "nueva": false
  },
  {
    "id": "E-2026-00099356",
    "numero": "LA-07-110-007000999-T-664-2026",
    "nombre": "Construcción De La 5/A. Sección Del Hosp. Cntl. Mil.: Especialidades Pediátricas",
    "nombreFuente": "CONSTRUCCIÓN DE LA 5/A. SECCIÓN DEL HOSP. CNTL. MIL.: ESPECIALIDADES PEDIÁTRICAS",
    "dependencia": "SEDENA",
    "entidad": "Ciudad De México",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Adquisiciones",
    "esExterna": false,
    "aclaraciones": "23 sep 2026 · 08:00",
    "apertura": "14 oct 2026 · 09:00",
    "nueva": false
  },
  {
    "id": "E-2026-00101223",
    "numero": "LA-07-110-007000999-T-677-2026",
    "nombre": "Reubicación Y Construcción Del H.M.Z. De Ixtepec, Oax., 2/A. Vuelta",
    "nombreFuente": "REUBICACIÓN Y CONSTRUCCIÓN DEL H.M.Z. DE IXTEPEC, OAX., 2/A. VUELTA",
    "dependencia": "SEDENA",
    "entidad": "Ciudad De México",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Adquisiciones",
    "esExterna": false,
    "aclaraciones": "18 sep 2026 · 08:00",
    "apertura": "30 sep 2026 · 09:00",
    "nueva": true
  },
  {
    "id": "E-2026-00099527",
    "numero": "LO-09-210-009000999-N-924-2026",
    "nombre": "Construcción Del Puente \"las Pilas\"",
    "nombreFuente": "CONSTRUCCIÓN DEL PUENTE \"LAS PILAS\"",
    "dependencia": "SICT",
    "entidad": "Hidalgo",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 10:00",
    "apertura": "15 sep 2026 · 10:00",
    "nueva": false
  },
  {
    "id": "E-2026-00099528",
    "numero": "LO-09-210-009000999-N-925-2026",
    "nombre": "Reconstrucción Del Puente \"xuchipantla\"",
    "nombreFuente": "RECONSTRUCCIÓN DEL PUENTE \"XUCHIPANTLA\"",
    "dependencia": "SICT",
    "entidad": "Hidalgo",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 10:30",
    "apertura": "15 sep 2026 · 11:00",
    "nueva": false
  },
  {
    "id": "E-2026-00100480",
    "numero": "LO-09-210-009000999-N-930-2026",
    "nombre": "Supervisión De La Construcción De Retorno Tipo “herradura”",
    "nombreFuente": "SUPERVISIÓN DE LA CONSTRUCCIÓN DE RETORNO TIPO “HERRADURA”",
    "dependencia": "SICT",
    "entidad": "Aguascalientes",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Servicios Relacionados Con La Obra",
    "esExterna": false,
    "aclaraciones": "11 sep 2026 · 14:00",
    "apertura": "18 sep 2026 · 14:00",
    "nueva": false
  },
  {
    "id": "E-2026-00098211",
    "numero": "LO-09-210-009000999-N-939-2026",
    "nombre": "Construcción De Retorno Tipo “herradura”",
    "nombreFuente": "CONSTRUCCIÓN DE RETORNO TIPO “HERRADURA”",
    "dependencia": "SICT",
    "entidad": "Aguascalientes",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "15 sep 2026 · 10:00",
    "apertura": "22 sep 2026 · 10:00",
    "nueva": true
  },
  {
    "id": "E-2026-00076620",
    "numero": "LO-09-JZO-009JZO001-I-26-2026",
    "nombre": "Construcción Y Diseño De 68.00 Km Del Tramo I Ferroviario Del Tren De Pasajeros…",
    "nombreFuente": "“CONSTRUCCIÓN Y DISEÑO DE 68.00 KM DEL TRAMO I FERROVIARIO DEL TREN DE PASAJEROS",
    "dependencia": "ATTRAPI",
    "entidad": "Ciudad De México",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "25 ago 2026 · 12:00",
    "apertura": "18 sep 2026 · 11:00",
    "nueva": false
  },
  {
    "id": "E-2026-00086682",
    "numero": "LO-09-JZO-009JZO001-I-42-2026",
    "nombre": "Construcción Y Diseño De 82.00 Km Del Tramo II Ferroviario Del Tren De Pasajero…",
    "nombreFuente": "“CONSTRUCCIÓN Y DISEÑO DE 82.00 KM DEL TRAMO II FERROVIARIO DEL TREN DE PASAJERO",
    "dependencia": "ATTRAPI",
    "entidad": "Ciudad De México",
    "estado": "Construcción",
    "estatus": "En Aclaraciones",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "31 ago 2026 · 11:00",
    "apertura": "02 oct 2026 · 11:00",
    "nueva": false
  },
  {
    "id": "E-2026-00095047",
    "numero": "LO-09-JZO-009JZO001-I-53-2026",
    "nombre": "Construcción Y Diseño De 45.50 Km Del Tramo III Ferroviario Del Tren De Pasajer…",
    "nombreFuente": "“CONSTRUCCIÓN Y DISEÑO DE 45.50 KM DEL TRAMO III FERROVIARIO DEL TREN DE PASAJER",
    "dependencia": "ATTRAPI",
    "entidad": "Ciudad De México",
    "estado": "Construcción",
    "estatus": "En Aclaraciones",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "07 sep 2026 · 11:00",
    "apertura": "15 oct 2026 · 11:00",
    "nueva": false
  },
  {
    "id": "E-2026-00093327",
    "numero": "LO-09-JZO-009JZO001-I-54-2026",
    "nombre": "Construcción Y Diseño De 57.00 Km Del Tramo II Subtramo: Charcas - Vanegas",
    "nombreFuente": "CONSTRUCCIÓN Y DISEÑO DE 57.00 KM DEL TRAMO II SUBTRAMO: CHARCAS - VANEGAS",
    "dependencia": "ATTRAPI",
    "entidad": "Ciudad De México",
    "estado": "Construcción",
    "estatus": "En Aclaraciones",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 12:00",
    "apertura": "19 oct 2026 · 12:00",
    "nueva": false
  },
  {
    "id": "E-2026-00080086",
    "numero": "LO-09-JZO-009JZO001-N-34-2026",
    "nombre": "Supervisión, Control Y Seguimiento De La Construcción Y Diseño De 93 Km Tramo III",
    "nombreFuente": "SUPERVISIÓN, CONTROL Y SEGUIMIENTO DE LA CONSTRUCCIÓN Y DISEÑO DE 93 KM TRAMOIII",
    "dependencia": "ATTRAPI",
    "entidad": "Ciudad De México",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Servicios Relacionados Con La Obra",
    "esExterna": false,
    "aclaraciones": "25 ago 2026 · 11:00",
    "apertura": "25 sep 2026 · 11:00",
    "nueva": false
  },
  {
    "id": "E-2026-00089666",
    "numero": "LO-09-JZO-009JZO001-N-44-2026",
    "nombre": "Supervisión, Control Y Seguimiento De La Construcción Y Diseño De 45.50 Km Del…",
    "nombreFuente": "“SUPERVISIÓN, CONTROL Y SEGUIMIENTO DE LA CONSTRUCCIÓN Y DISEÑO DE 45.50 KM DEL",
    "dependencia": "ATTRAPI",
    "entidad": "Ciudad De México",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Servicios Relacionados Con La Obra",
    "esExterna": false,
    "aclaraciones": "18 ago 2026 · 11:00",
    "apertura": "15 sep 2026 · 11:00",
    "nueva": false,
    "tareas": [
      {
        "nombre": "Elaborar propuesta económica",
        "area": "Económica",
        "avance": 0,
        "responsable": "LUIS"
      },
      {
        "nombre": "Integrar presupuesto",
        "area": "Económica",
        "avance": 0,
        "responsable": "LUIS"
      },
      {
        "nombre": "Subir propuesta económica",
        "area": "Económica",
        "avance": 0,
        "responsable": "LUIS"
      },
      {
        "nombre": "Aceptación de precio",
        "area": "Precio",
        "avance": 0,
        "responsable": "JEMO"
      },
      {
        "nombre": "Validar precio interno",
        "area": "Precio",
        "avance": 0,
        "responsable": "JEMO"
      },
      {
        "nombre": "Elaborar propuesta técnica",
        "area": "Técnica",
        "avance": 0,
        "responsable": "JAVIER/BRENDA"
      },
      {
        "nombre": "Preparar reporte técnico",
        "area": "Técnica",
        "avance": 0,
        "responsable": "JAVIER/BRENDA"
      },
      {
        "nombre": "Subir propuesta técnica",
        "area": "Técnica",
        "avance": 0,
        "responsable": "JAVIER/BRENDA"
      }
    ],
    "fechaAceptacion": "2026-08-15",
    "fechaVisitaObra": "2026-08-17"
  },
  {
    "id": "E-2026-00093977",
    "numero": "LO-09-JZO-009JZO001-N-49-2026",
    "nombre": "Supervisión De La Construcción De La Obra Civil Y Obras Complementarias Observ",
    "nombreFuente": "SUPERVISIÓN DE LA CONSTRUCCIÓN DE LA OBRA CIVIL Y OBRAS COMPLEMENTARIAS OBSERV",
    "dependencia": "ATTRAPI",
    "entidad": "Ciudad De México",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Servicios Relacionados Con La Obra",
    "esExterna": false,
    "aclaraciones": "07 sep 2026 · 13:00",
    "apertura": "25 sep 2026 · 12:00",
    "nueva": false
  },
  {
    "id": "E-2026-00089236",
    "numero": "LO-13-J2U-013J2U002-N-10-2026",
    "nombre": "Dragado De Construcción Y Conformación De La Plataforma Norte De 40 Hectáreas",
    "nombreFuente": "DRAGADO DE CONSTRUCCIÓN Y CONFORMACIÓN DE LA PLATAFORMA NORTE DE 40 HECTÁREAS",
    "dependencia": "ASIPONA-Progreso",
    "entidad": "Yucatán",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 16:00",
    "apertura": "17 sep 2026 · 10:00",
    "nueva": false
  },
  {
    "id": "E-2026-00098796",
    "numero": "LO-16-B00-016B00985-N-167-2026",
    "nombre": "Reconstrucción Del Sistema De Agua Potable (la Ceiba), Xicotepec, Puebla.",
    "nombreFuente": "RECONSTRUCCIÓN DEL SISTEMA DE AGUA POTABLE (LA CEIBA), XICOTEPEC, PUEBLA.",
    "dependencia": "CONAGUA",
    "entidad": "Ciudad De México",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 16:00",
    "apertura": "15 sep 2026 · 11:00",
    "nueva": false
  },
  {
    "id": "E-2026-00099301",
    "numero": "LO-16-B00-016B00985-N-170-2026",
    "nombre": "Construcción De Planta De Bombeo Ancón.",
    "nombreFuente": "CONSTRUCCIÓN DE PLANTA DE BOMBEO ANCÓN.",
    "dependencia": "CONAGUA",
    "entidad": "Ciudad De México",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "10 sep 2026 · 13:00",
    "apertura": "17 sep 2026 · 13:00",
    "nueva": false
  },
  {
    "id": "E-2026-00098439",
    "numero": "LO-38-90Y-03890Y999-N-117-2026",
    "nombre": "Construcción De Edificación Para Laboratorios De Agua, Energía Y Salud.",
    "nombreFuente": "CONSTRUCCIÓN DE EDIFICACIÓN PARA LABORATORIOS DE AGUA, ENERGÍA Y SALUD.",
    "dependencia": "CIATEQ",
    "entidad": "Querétaro",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "21 sep 2026 · 16:20",
    "apertura": "28 sep 2026 · 11:00",
    "nueva": true
  },
  {
    "id": "E-2026-00099514",
    "numero": "LO-62-002-803003988-N-3-2026",
    "nombre": "Construcción De La Primera Etapa De La Ptar De La Localidad De Los Planes",
    "nombreFuente": "CONSTRUCCIÓN DE LA PRIMERA ETAPA DE LA PTAR DE LA LOCALIDAD DE LOS PLANES",
    "dependencia": "OOMSAPAS",
    "entidad": "Baja California Sur",
    "estado": "Construcción",
    "estatus": "En Aclaraciones",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "09 sep 2026 · 10:00",
    "apertura": "14 sep 2026 · 14:00",
    "nueva": false
  },
  {
    "id": "E-2026-00099761",
    "numero": "LO-67-018-908040997-N-11-2026",
    "nombre": "Construcción De La 2da Etapa De Ampliación Al Sistema De Alcantarillado La Cruz",
    "nombreFuente": "CONSTRUCCIÓN DE LA 2DA ETAPA DE AMPLIACIÓN AL SISTEMA DE ALCANTARILLADO LA CRUZ",
    "dependencia": "JCAS",
    "entidad": "Chihuahua",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "10 sep 2026 · 14:30",
    "apertura": "17 sep 2026 · 10:00",
    "nueva": false
  },
  {
    "id": "E-2026-00097909",
    "numero": "LO-73-R96-914004997-N-28-2026",
    "nombre": "Construcción Carriles Cent. Carr.gdl - Chapala, K.10+700 Al Km.11+420 L-Pte L-5",
    "nombreFuente": "CONSTRUCCIÓN CARRILES CENT. CARR.GDL - CHAPALA, K.10+700 AL KM.11+420 L-PTE L-5",
    "dependencia": "073R96",
    "entidad": "Jalisco",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 10:00",
    "apertura": "29 sep 2026 · 09:00",
    "nueva": false
  },
  {
    "id": "E-2026-00097926",
    "numero": "LO-73-R96-914004997-N-29-2026",
    "nombre": "Construcción Carriles Cent. Carr.gdl - Chapala, K.10+760 Al Km. 11+420 L-Ote L-5",
    "nombreFuente": "CONSTRUCCIÓN CARRILES CENT. CARR.GDL - CHAPALA, K.10+760 AL KM. 11+420 L-OTE L-5",
    "dependencia": "073R96",
    "entidad": "Jalisco",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 10:15",
    "apertura": "29 sep 2026 · 09:45",
    "nueva": false
  },
  {
    "id": "E-2026-00097931",
    "numero": "LO-73-R96-914004997-N-30-2026",
    "nombre": "Construcción Estación No. 1 P/El Sistema Interconectado De Electromovilidad L-5",
    "nombreFuente": "CONSTRUCCIÓN ESTACIÓN NO. 1 P/EL SISTEMA INTERCONECTADO DE ELECTROMOVILIDAD L-5",
    "dependencia": "073R96",
    "entidad": "Jalisco",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 10:30",
    "apertura": "29 sep 2026 · 10:30",
    "nueva": false
  },
  {
    "id": "E-2026-00097934",
    "numero": "LO-73-R96-914004997-N-31-2026",
    "nombre": "Construcción Estación No. 2 P/El Sistema Interconectado De Electromovilidad L-5",
    "nombreFuente": "CONSTRUCCIÓN ESTACIÓN NO. 2 P/EL SISTEMA INTERCONECTADO DE ELECTROMOVILIDAD L-5",
    "dependencia": "073R96",
    "entidad": "Jalisco",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 10:45",
    "apertura": "29 sep 2026 · 11:15",
    "nueva": false
  },
  {
    "id": "E-2026-00097938",
    "numero": "LO-73-R96-914004997-N-32-2026",
    "nombre": "Construcción Estación No. 3 P/El Sistema Interconectado De Electromovilidad L-5",
    "nombreFuente": "CONSTRUCCIÓN ESTACIÓN NO. 3 P/EL SISTEMA INTERCONECTADO DE ELECTROMOVILIDAD L-5",
    "dependencia": "073R96",
    "entidad": "Jalisco",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 11:00",
    "apertura": "29 sep 2026 · 12:00",
    "nueva": false
  },
  {
    "id": "E-2026-00097942",
    "numero": "LO-73-R96-914004997-N-33-2026",
    "nombre": "Construcción Estación No. 4 P/El Sistema Interconectado De Electromovilidad L-5",
    "nombreFuente": "CONSTRUCCIÓN ESTACIÓN NO. 4 P/EL SISTEMA INTERCONECTADO DE ELECTROMOVILIDAD L-5",
    "dependencia": "073R96",
    "entidad": "Jalisco",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 11:15",
    "apertura": "29 sep 2026 · 12:45",
    "nueva": false
  },
  {
    "id": "E-2026-00097944",
    "numero": "LO-73-R96-914004997-N-34-2026",
    "nombre": "Construcción Estación No. 5 P/El Sistema Interconectado De Electromovilidad L-5",
    "nombreFuente": "CONSTRUCCIÓN ESTACIÓN NO. 5 P/EL SISTEMA INTERCONECTADO DE ELECTROMOVILIDAD L-5",
    "dependencia": "073R96",
    "entidad": "Jalisco",
    "estado": "Construcción",
    "estatus": "En Aclaraciones",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 11:30",
    "apertura": "29 sep 2026 · 13:30",
    "nueva": false
  },
  {
    "id": "E-2026-00097946",
    "numero": "LO-73-R96-914004997-N-35-2026",
    "nombre": "Construcción Puente Peatonal Estación 1 Sist.interconectado Electromovilidad L-5",
    "nombreFuente": "CONSTRUCCIÓN PUENTE PEATONAL ESTACIÓN 1 SIST.INTERCONECTADO ELECTROMOVILIDAD L-5",
    "dependencia": "073R96",
    "entidad": "Jalisco",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 11:45",
    "apertura": "29 sep 2026 · 14:15",
    "nueva": false
  },
  {
    "id": "E-2026-00097948",
    "numero": "LO-73-R96-914004997-N-36-2026",
    "nombre": "Construcción Puente Peatonal Estación 2 Sist.interconectado Electromovilidad L-5",
    "nombreFuente": "CONSTRUCCIÓN PUENTE PEATONAL ESTACIÓN 2 SIST.INTERCONECTADO ELECTROMOVILIDAD L-5",
    "dependencia": "073R96",
    "entidad": "Jalisco",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 12:00",
    "apertura": "29 sep 2026 · 15:00",
    "nueva": false
  },
  {
    "id": "E-2026-00097949",
    "numero": "LO-73-R96-914004997-N-37-2026",
    "nombre": "Construcción Puente Peatonal Estación 3 Sist.interconectado Electromovilidad L-5",
    "nombreFuente": "CONSTRUCCIÓN PUENTE PEATONAL ESTACIÓN 3 SIST.INTERCONECTADO ELECTROMOVILIDAD L-5",
    "dependencia": "073R96",
    "entidad": "Jalisco",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 12:15",
    "apertura": "29 sep 2026 · 15:45",
    "nueva": false
  },
  {
    "id": "E-2026-00097950",
    "numero": "LO-73-R96-914004997-N-38-2026",
    "nombre": "Construcción Puente Peatonal Estación 4 Sist.interconectado Electromovilidad L-5",
    "nombreFuente": "CONSTRUCCIÓN PUENTE PEATONAL ESTACIÓN 4 SIST.INTERCONECTADO ELECTROMOVILIDAD L-5",
    "dependencia": "073R96",
    "entidad": "Jalisco",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 12:30",
    "apertura": "29 sep 2026 · 16:30",
    "nueva": false
  },
  {
    "id": "E-2026-00097951",
    "numero": "LO-73-R96-914004997-N-39-2026",
    "nombre": "Construcción Puente Peatonal Estación 5 Sist.interconectado Electromovilidad L-5",
    "nombreFuente": "CONSTRUCCIÓN PUENTE PEATONAL ESTACIÓN 5 SIST.INTERCONECTADO ELECTROMOVILIDAD L-5",
    "dependencia": "073R96",
    "entidad": "Jalisco",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 12:45",
    "apertura": "29 sep 2026 · 17:15",
    "nueva": false
  },
  {
    "id": "E-2026-00096715",
    "numero": "LO-74-136-815012826-N-1-2026",
    "nombre": "Construcción De Tanque De Agua Potable En La Calle La Joya, Localidad De Santa C",
    "nombreFuente": "CONSTRUCCIÓN DE TANQUE DE AGUA POTABLE EN LA CALLE LA JOYA, LOCALIDAD DE SANTA C",
    "dependencia": "074136",
    "entidad": "México",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 12:00",
    "apertura": "14 sep 2026 · 10:00",
    "nueva": false
  },
  {
    "id": "E-2026-00096436",
    "numero": "LO-79-010-920024998-N-6-2026",
    "nombre": "Construcción De 33 Sanitarios Con Biodigestor, San Isidro El Cuil.",
    "nombreFuente": "CONSTRUCCIÓN DE 33 SANITARIOS CON BIODIGESTOR, SAN ISIDRO EL CUIL.",
    "dependencia": "CEA",
    "entidad": "Oaxaca",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "02 sep 2026 · 11:00",
    "apertura": "14 sep 2026 · 02:00",
    "nueva": false
  },
  {
    "id": "E-2026-00097530",
    "numero": "LO-79-010-920024998-N-8-2026",
    "nombre": "Construcción De 50 Sanitarios Con Biodigestor, En Santa María Guelacé, Oaxaca.",
    "nombreFuente": "CONSTRUCCIÓN DE 50 SANITARIOS CON BIODIGESTOR, EN SANTA MARÍA GUELACÉ, OAXACA.",
    "dependencia": "CEA",
    "entidad": "Oaxaca",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "02 sep 2026 · 10:00",
    "apertura": "15 sep 2026 · 11:00",
    "nueva": false
  },
  {
    "id": "E-2026-00097434",
    "numero": "LO-87-J16-828012977-N-1-2026",
    "nombre": "Primera Etapa De La Construcción De Obra De Captación",
    "nombreFuente": "PRIMERA ETAPA DE LA CONSTRUCCIÓN DE OBRA DE CAPTACIÓN",
    "dependencia": "087J16",
    "entidad": "Tamaulipas",
    "estado": "Construcción",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "07 sep 2026 · 12:00",
    "apertura": "14 sep 2026 · 12:00",
    "nueva": false
  },
  {
    "id": "E-2026-00093457",
    "numero": "LA-07-110-007000999-I-640-2026",
    "nombre": "Adquisicion De Sistemas De Supervision De Comunicaciones Militares 3/A. Fase",
    "nombreFuente": "ADQUISICION DE SISTEMAS DE SUPERVISION DE COMUNICACIONES MILITARES 3/A. FASE",
    "dependencia": "SEDENA",
    "entidad": "Ciudad De México",
    "estado": "Filtrada",
    "estatus": "Vigente",
    "tipo": "Adquisiciones",
    "esExterna": false,
    "aclaraciones": "26 ago 2026 · 08:00",
    "apertura": "14 sep 2026 · 09:00",
    "nueva": false
  },
  {
    "id": "E-2026-00096212",
    "numero": "LA-13-KDN-013KDN001-I-311-2026",
    "nombre": "Adquisicion De Insumos Para La Subgerencia De Equipos Mecánicos Y Apoyos Visuale",
    "nombreFuente": "ADQUISICION DE INSUMOS PARA LA SUBGERENCIA DE EQUIPOS MECÁNICOS Y APOYOS VISUALE",
    "dependencia": "AICM",
    "entidad": "Ciudad De México",
    "estado": "Filtrada",
    "estatus": "Vigente",
    "tipo": "Adquisiciones",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 10:00",
    "apertura": "15 sep 2026 · 11:00",
    "nueva": false
  },
  {
    "id": "E-2026-00098012",
    "numero": "LO-09-217-009217002-N-111-2026",
    "nombre": "Proyecto Integral Hospital Comunitario De 15 Camas De Atlixtac, Guerrero",
    "nombreFuente": "PROYECTO INTEGRAL HOSPITAL COMUNITARIO DE 15 CAMAS DE ATLIXTAC, GUERRERO",
    "dependencia": "SICT",
    "entidad": "Guerrero",
    "estado": "Filtrada",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "10 sep 2026 · 17:00",
    "apertura": "21 sep 2026 · 10:00",
    "nueva": false
  },
  {
    "id": "E-2026-00100317",
    "numero": "LO-09-217-009217002-N-112-2026",
    "nombre": "Supervisión Externa Proyecto Integral Hospital 15 Camas De Atlixtac, Guerrero",
    "nombreFuente": "SUPERVISIÓN EXTERNA PROYECTO INTEGRAL HOSPITAL 15 CAMAS DE ATLIXTAC, GUERRERO",
    "dependencia": "SICT",
    "entidad": "Guerrero",
    "estado": "Filtrada",
    "estatus": "Vigente",
    "tipo": "Servicios Relacionados Con La Obra",
    "esExterna": false,
    "aclaraciones": "10 sep 2026 · 12:00",
    "apertura": "21 sep 2026 · 11:00",
    "nueva": false
  },
  {
    "id": "E-2026-00091538",
    "numero": "LO-10-LAU-010LAU001-N-176-2026",
    "nombre": "Barrenación De Diamante Proyecto Los Picos",
    "nombreFuente": "BARRENACIÓN DE DIAMANTE PROYECTO LOS PICOS",
    "dependencia": "SGM",
    "entidad": "Hidalgo",
    "estado": "Filtrada",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "11 sep 2026 · 14:00",
    "apertura": "17 sep 2026 · 10:00",
    "nueva": false
  },
  {
    "id": "E-2026-00097794",
    "numero": "LO-79-010-920024998-N-9-2026",
    "nombre": "Supervisión Técnica Proagua 2026 (2 Localidades Urbanas)",
    "nombreFuente": "SUPERVISIÓN TÉCNICA PROAGUA 2026 (2 LOCALIDADES URBANAS)",
    "dependencia": "CEA",
    "entidad": "Oaxaca",
    "estado": "Filtrada",
    "estatus": "Vigente",
    "tipo": "Servicios Relacionados Con La Obra",
    "esExterna": false,
    "aclaraciones": "08 sep 2026 · 13:00",
    "apertura": "15 sep 2026 · 13:00",
    "nueva": false
  },
  {
    "id": "E-2026-00092827",
    "numero": "LA-07-HZI-007HZI999-N-170-2026",
    "nombre": "Servicio De Mantenimiento Y Conservación Al Sistema De Monitoreo Y Control Scada",
    "nombreFuente": "SERVICIO DE MANTENIMIENTO Y CONSERVACIÓN AL SISTEMA DE MONITOREO Y CONTROL SCADA",
    "dependencia": "AIFA",
    "entidad": "México",
    "estado": "Detectada",
    "estatus": "Vigente",
    "tipo": "Servicios",
    "esExterna": false,
    "aclaraciones": "15 sep 2026 · 09:00",
    "apertura": "21 sep 2026 · 09:00",
    "nueva": true
  },
  {
    "id": "E-2026-00100533",
    "numero": "LA-10-LAU-010LAU001-T-179-2026",
    "nombre": "Adquisicion De Equipo De Campo",
    "nombreFuente": "ADQUISICION DE EQUIPO DE CAMPO",
    "dependencia": "SGM",
    "entidad": "Hidalgo",
    "estado": "Detectada",
    "estatus": "Vigente",
    "tipo": "Adquisiciones",
    "esExterna": false,
    "aclaraciones": "22 sep 2026 · 11:00",
    "apertura": "29 sep 2026 · 11:00",
    "nueva": true
  },
  {
    "id": "E-2026-00098628",
    "numero": "LA-50-GYR-050GYR001-N-99-2026",
    "nombre": "Servicio Integral De Digitalización E Imagen",
    "nombreFuente": "SERVICIO INTEGRAL DE DIGITALIZACIÓN E IMAGEN",
    "dependencia": "IMSS",
    "entidad": "Guerrero",
    "estado": "Detectada",
    "estatus": "Vigente",
    "tipo": "Servicios",
    "esExterna": false,
    "aclaraciones": "14 sep 2026 · 09:00",
    "apertura": "21 sep 2026 · 09:00",
    "nueva": true
  },
  {
    "id": "E-2026-00101329",
    "numero": "LA-50-GYR-050GYR035-N-93-2026",
    "nombre": "Programa De Diálisis Peritoneal Continua Ambulatoria (dpca) Para Pacientes Nuevo",
    "nombreFuente": "PROGRAMA DE DIÁLISIS PERITONEAL CONTINUA AMBULATORIA (DPCA) PARA PACIENTES NUEVO",
    "dependencia": "IMSS",
    "entidad": "Nuevo León",
    "estado": "Detectada",
    "estatus": "Vigente",
    "tipo": "Adquisiciones",
    "esExterna": false,
    "aclaraciones": "22 sep 2026 · 09:00",
    "apertura": "28 sep 2026 · 10:00",
    "nueva": true
  },
  {
    "id": "E-2026-00101261",
    "numero": "LA-85-W83-926014991-I-94-2026",
    "nombre": "Adquisición De Equipos De Cómputo",
    "nombreFuente": "ADQUISICIÓN DE EQUIPOS DE CÓMPUTO",
    "dependencia": "ITSON",
    "entidad": "Sonora",
    "estado": "Detectada",
    "estatus": "Vigente",
    "tipo": "Adquisiciones",
    "esExterna": false,
    "aclaraciones": "22 sep 2026 · 09:00",
    "apertura": "30 sep 2026 · 11:00",
    "nueva": true
  },
  {
    "id": "E-2026-00100992",
    "numero": "LO-50-GYR-050GYR971-N-11-2026",
    "nombre": "Trabajos De Mantenimiento Correctivo",
    "nombreFuente": "TRABAJOS DE MANTENIMIENTO CORRECTIVO",
    "dependencia": "IMSS",
    "entidad": "San Luis Potosí",
    "estado": "Detectada",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "14 sep 2026 · 10:00",
    "apertura": "24 sep 2026 · 10:00",
    "nueva": true
  },
  {
    "id": "E-2026-00101248",
    "numero": "LO-50-GYR-050GYR977-N-18-2026",
    "nombre": "Trab O C Mant Y Mejora Ductos, Electrico Hgsz N2 Cozumel",
    "nombreFuente": "TRAB O C MANT Y MEJORA DUCTOS, ELECTRICO HGSZ N2 COZUMEL",
    "dependencia": "IMSS",
    "entidad": "Quintana Roo",
    "estado": "Detectada",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "18 sep 2026 · 09:00",
    "apertura": "24 sep 2026 · 09:00",
    "nueva": true
  },
  {
    "id": "E-2026-00101260",
    "numero": "LO-50-GYR-050GYR977-N-19-2026",
    "nombre": "Trab Obra Civil Mantto Y Mejora Séptico, Nutrición Y Banco De Leches Hgop N7",
    "nombreFuente": "TRAB OBRA CIVIL MANTTO Y MEJORA  SÉPTICO,  NUTRICIÓN Y BANCO DE LECHES HGOP N7",
    "dependencia": "IMSS",
    "entidad": "Quintana Roo",
    "estado": "Detectada",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "18 sep 2026 · 12:00",
    "apertura": "24 sep 2026 · 12:00",
    "nueva": true
  },
  {
    "id": "E-2026-00101273",
    "numero": "LO-50-GYR-050GYR977-N-20-2026",
    "nombre": "Trab Obra Civil Mantto Y Mejora De Baños E Imper Sub Delegacion Playa Carmen",
    "nombreFuente": "TRAB OBRA CIVIL MANTTO Y MEJORA  DE BAÑOS E IMPER SUB DELEGACION PLAYA CARMEN",
    "dependencia": "IMSS",
    "entidad": "Quintana Roo",
    "estado": "Detectada",
    "estatus": "Vigente",
    "tipo": "Obra Pública",
    "esExterna": false,
    "aclaraciones": "18 sep 2026 · 15:00",
    "apertura": "24 sep 2026 · 15:00",
    "nueva": true
  }
];

export const stages: { label: Estado; value: number; color: string }[] = [
  {
    "label": "Detectada",
    "value": 12,
    "color": "#6c7a86"
  },
  {
    "label": "Filtrada",
    "value": 17,
    "color": "#4b81a3"
  },
  {
    "label": "En trabajo",
    "value": 9,
    "color": "#1e9b6c"
  },
  {
    "label": "Construcción",
    "value": 40,
    "color": "#d6a33a"
  },
  {
    "label": "Fallo",
    "value": 3,
    "color": "#d76554"
  }
];

export const ofertas = [
  {
    "id": "bbccdcff",
    "empresa": "KIVA",
    "proyecto": "Via Sentera",
    "servicio": "Supervisión",
    "monto": "$17,218,000",
    "estatus": "En seguimiento",
    "fechaCierre": null,
    "fechaLimite": null,
    "fechaSeguimiento": null
  }
];

// Se mantiene 'oferta' (singular) para compatibilidad con la UI actual: única oferta activa al corte.
export const oferta = ofertas[0];

export type Nota = { id: string; responsable: string; texto: string; ligadaA?: string };

export const notas: Nota[] = [
  {
    "id": "a4db9cb1",
    "responsable": "ALICIA",
    "texto": "VISE"
  },
  {
    "id": "939f72e3",
    "responsable": "ALICIA",
    "texto": "LOPEZ MATEOS"
  },
  {
    "id": "dc4fe1d2",
    "responsable": "JEMO",
    "texto": "DMIT"
  },
  {
    "id": "616b416e",
    "responsable": "JEMO",
    "texto": "TODO SANTOS"
  }
];

export const carga = [
  {
    "nombre": "Brenda",
    "avance": 60,
    "asignaciones": 3
  },
  {
    "nombre": "Jemo",
    "avance": 44,
    "asignaciones": 14
  },
  {
    "nombre": "Alicia",
    "avance": 31,
    "asignaciones": 12
  },
  {
    "nombre": "Luis",
    "avance": 31,
    "asignaciones": 9
  },
  {
    "nombre": "Javier/Brenda",
    "avance": 30,
    "asignaciones": 18
  }
];

export const porEntidad = [
  {
    "name": "Ciudad De México",
    "value": 20
  },
  {
    "name": "Jalisco",
    "value": 13
  },
  {
    "name": "Hidalgo",
    "value": 4
  },
  {
    "name": "Por confirmar",
    "value": 3
  },
  {
    "name": "Oaxaca",
    "value": 3
  },
  {
    "name": "Guerrero",
    "value": 3
  }
];

export const hitos = [
  {
    "id": "XLS-LO09217009217002N1052026",
    "fecha": "11 sep 2026",
    "dependencia": "SICT",
    "nombre": "Supervisión Centros De Educación Y Cuidado Infantil Lagos De Moreno, Jalisco"
  },
  {
    "id": "E-2026-00093484",
    "fecha": "11 sep 2026",
    "dependencia": "ASIPONAGUAYMAS",
    "nombre": "Supervisión Para El Control De Calidad De La Obra Mejoramiento Etapa 2"
  },
  {
    "id": "XLS-SIOPESMA0BLP05692026",
    "fecha": "17 sep 2026",
    "dependencia": "SIOP",
    "nombre": "Construcción De Estructura, Albañilerías En Talleres Del Centro De Autismo De Puerto Vallarta, Jalisco,"
  },
  {
    "id": "XLS-LO09JZO009JZO001N342026",
    "fecha": "30 sep 2026",
    "dependencia": "ATTRAPI",
    "nombre": "Supervisión, Control Y Seguimiento De La Construcción Y Diseño De 93 Km Tramo III"
  },
  {
    "id": "E-2026-00080053",
    "fecha": "08 oct 2026",
    "dependencia": "ATTRAPI",
    "nombre": "Supervisión, Control Y Seguimiento De La Construcción Y Diseño De 57 Km Tramo II"
  }
];

export const historicoResumen = {
  "totalExpedientes": 3217,
  "totalSnapshots": 60,
  "generado": "2026-09-10T19:50:56.344Z"
};

export const fuentes = {
  "corte": "10 sep 2026 · 08:30",
  "corteAnterior": "09 sep 2026 · 08:30",
  "totalListasOrigen": 5,
  "totalRegistrosRecibidos": 81,
  "totalProcesosUnicos": 64,
  "totalDuplicados": 17,
  "totalInvitacionesSinProcesar": 247
};
