export type TipoDocumento =
  | 'carta_presentacion'
  | 'carta_aceptacion'
  | 'evaluacion_bimestral'
  | 'reporte_bimestral'
  | 'otro';

export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  carta_presentacion: 'Carta de Presentación',
  carta_aceptacion: 'Carta de Aceptación',
  evaluacion_bimestral: 'Evaluación Bimestral',
  reporte_bimestral: 'Reporte Bimestral',
  otro: 'Otro',
};

export const TIPO_DOCUMENTO_ICONOS: Record<TipoDocumento, string> = {
  carta_presentacion: '📋',
  carta_aceptacion: '✅',
  evaluacion_bimestral: '📊',
  reporte_bimestral: '📄',
  otro: '📎',
};

export type EstadoDocumento = 'pendiente' | 'entregado' | 'vencido';

export interface DocumentoServicio {
  id: number;
  tipo: TipoDocumento;
  periodo?: string;               // "2026-01", "2026-03"… (solo bimestrales)
  estado: EstadoDocumento;
  fechaLimite: string;            // YYYY-MM-DD
  fechaEntrega?: string;          // cuando marques "entregado"
  nombreArchivo: string;          // original: "evaluacion_ene_feb.docx"
  mimeType: string;               // "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/pdf"
  tamaño: number;                 // bytes
  archivoBase64?: string;         // SOLO en frontend (offline); backend usa archivo físico
  notas?: string;
  creadoEn: string;               // ISO
  actualizadoEn: string;          // ISO
}

export interface DocumentoConArchivo extends DocumentoServicio {
  archivo?: Blob;                 // Para descarga directa en frontend
}

// Tipos para formularios
export interface NuevoDocumentoData {
  tipo: TipoDocumento;
  periodo?: string;
  fechaLimite: string;
  archivo: File;
  notas?: string;
}

export interface ActualizarDocumentoData {
  tipo?: TipoDocumento;
  periodo?: string;
  fechaLimite?: string;
  estado?: EstadoDocumento;
  fechaEntrega?: string;
  archivo?: File;                 // Opcional: reemplazar archivo
  notas?: string;
}

// Utilidades
export function esBimestral(tipo: TipoDocumento): boolean {
  return tipo === 'evaluacion_bimestral' || tipo === 'reporte_bimestral';
}

export function getEstadoCalculado(doc: DocumentoServicio): EstadoDocumento {
  if (doc.estado === 'entregado') return 'entregado';
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(doc.fechaLimite + 'T00:00:00');
  return limite < hoy ? 'vencido' : 'pendiente';
}

export function formatearTamaño(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MIME_TYPES_PERMITIDOS = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword',                                                       // .doc
  'application/pdf',                                                          // .pdf
] as const;

export function esMimeValido(mime: string): boolean {
  return MIME_TYPES_PERMITIDOS.includes(mime as any);
}

export function getExtensionFromMime(mime: string): string {
  switch (mime) {
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return '.docx';
    case 'application/msword':
      return '.doc';
    case 'application/pdf':
      return '.pdf';
    default:
      return '';
  }
}