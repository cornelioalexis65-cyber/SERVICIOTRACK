import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface ServicioTrackDB extends DBSchema {
  documentos: {
    key: number;
    value: {
      id: number;
      blob: Blob;
      nombreArchivo: string;
      mimeType: string;
      tamaño: number;
      guardadoEn: string;
    };
    indexes: { 'by-fecha': string };
  };
}

const DB_NAME = 'serviciotrack-documentos';
const DB_VERSION = 1;
const STORE_NAME = 'documentos';

let dbPromise: Promise<IDBPDatabase<ServicioTrackDB>> | null = null;

function getDB(): Promise<IDBPDatabase<ServicioTrackDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ServicioTrackDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('by-fecha', 'guardadoEn');
      },
    });
  }
  return dbPromise;
}

/**
 * Guarda un archivo (Blob) en IndexedDB y devuelve el ID asignado.
 */
export async function guardarArchivoIDB(
  blob: Blob,
  nombreArchivo: string,
  mimeType: string
): Promise<number> {
  const db = await getDB();
  const id = await db.add(STORE_NAME, {
    blob,
    nombreArchivo,
    mimeType,
    tamaño: blob.size,
    guardadoEn: new Date().toISOString(),
  } as any); // id is auto-generated
  return id as number;
}

/**
 * Obtiene el Blob de un archivo por su ID.
 */
export async function obtenerArchivoIDB(id: number): Promise<Blob | undefined> {
  const db = await getDB();
  const record = await db.get(STORE_NAME, id);
  return record?.blob;
}

/**
 * Obtiene el registro completo (metadatos + blob) por ID.
 */
export async function obtenerRegistroArchivoIDB(id: number): Promise<{
  id: number;
  blob: Blob;
  nombreArchivo: string;
  mimeType: string;
  tamaño: number;
  guardadoEn: string;
} | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

/**
 * Elimina un archivo de IndexedDB.
 */
export async function eliminarArchivoIDB(id: number): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

/**
 * Limpia archivos huérfanos (que no tienen metadatos en localStorage).
 * Útil para mantenimiento periódico.
 */
export async function limpiarArchivosHuerfanos(idsValidos: number[]): Promise<number> {
  const db = await getDB();
  const todos = await db.getAllKeys(STORE_NAME);
  let eliminados = 0;
  for (const id of todos) {
    if (!idsValidos.includes(id)) {
      await db.delete(STORE_NAME, id);
      eliminados++;
    }
  }
  return eliminados;
}

/**
 * Obtiene estadísticas de uso de IndexedDB.
 */
export async function getIDBStats(): Promise<{ count: number; totalSize: number }> {
  const db = await getDB();
  const todos = await db.getAll(STORE_NAME);
  const totalSize = todos.reduce((acc, r) => acc + r.tamaño, 0);
  return { count: todos.length, totalSize };
}