import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface ArchivoGuardado {
  id: number;            // mismo id que el documento (local o del servidor)
  blob: Blob;
  nombreArchivo: string;
  mimeType: string;
  tamaño: number;
  guardadoEn: string;
}

interface ServicioTrackDB extends DBSchema {
  documentos: {
    key: number;
    value: ArchivoGuardado;
    indexes: { 'by-fecha': string };
  };
}

const DB_NAME = 'serviciotrack-documentos';
// v2: la clave es el id del documento (en v1 era un autoincremento que no
// coincidía con el documento y mezclaba archivos).
const DB_VERSION = 2;
const STORE_NAME = 'documentos';

let dbPromise: Promise<IDBPDatabase<ServicioTrackDB>> | null = null;

function getDB(): Promise<IDBPDatabase<ServicioTrackDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ServicioTrackDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Los archivos de v1 no se pueden asociar a su documento: se descartan.
        if (db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME);
        }
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by-fecha', 'guardadoEn');
      },
    });
  }
  return dbPromise;
}

/**
 * Guarda (o reemplaza) el archivo del documento `id`.
 */
export async function guardarArchivoIDB(
  id: number,
  blob: Blob,
  nombreArchivo: string,
  mimeType: string
): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, {
    id,
    blob,
    nombreArchivo,
    mimeType,
    tamaño: blob.size,
    guardadoEn: new Date().toISOString(),
  });
}

/**
 * Obtiene el Blob del archivo del documento `id`.
 */
export async function obtenerArchivoIDB(id: number): Promise<Blob | undefined> {
  const db = await getDB();
  const record = await db.get(STORE_NAME, id);
  return record?.blob;
}

/**
 * Obtiene el registro completo (metadatos + blob) del documento `id`.
 */
export async function obtenerRegistroArchivoIDB(id: number): Promise<ArchivoGuardado | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

/**
 * Cambia la clave de un archivo (por ejemplo, del id local al id que asignó
 * el servidor al sincronizar).
 */
export async function moverArchivoIDB(desde: number, hacia: number): Promise<void> {
  if (desde === hacia) return;
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const record = await tx.store.get(desde);
  if (record) {
    await tx.store.put({ ...record, id: hacia });
    await tx.store.delete(desde);
  }
  await tx.done;
}

/**
 * Elimina el archivo del documento `id`.
 */
export async function eliminarArchivoIDB(id: number): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

/**
 * Elimina los archivos cuyo documento ya no existe.
 */
export async function limpiarArchivosHuerfanos(idsValidos: number[]): Promise<number> {
  const db = await getDB();
  const validos = new Set(idsValidos);
  const todos = await db.getAllKeys(STORE_NAME);
  let eliminados = 0;
  for (const id of todos) {
    if (!validos.has(id)) {
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
