# 🎓 ServicioTrack - Plataforma de Control de Servicio Social

**ServicioTrack** es una aplicación moderna, offline-first e institucional diseñada para que estudiantes gestionen, monitoreen y generen reportes oficiales de sus horas de servicio social (meta estándar de 500 horas).

---

## 🌟 Características Principales

* 📊 **Dashboard y Métricas:** Visualización de horas realizadas, horas restantes, porcentaje de avance, días acumulados, promedio diario y fecha del último registro.
* 📈 **Barra de Progreso Interactiva:** Indicador visual animado con marcadores de hitos (0h, 125h, 250h, 375h, 500h).
* 📝 **Registro de Actividades:** Formulario para altas y edición de actividades con validaciones estrictas (sin horas negativas, máximo 24h/día, tope de meta y bloqueo de fechas futuras).
* 📋 **Historial Cronológico con Búsqueda:** Vista feed de actividades con buscador en vivo, filtro por mes, cálculo de horas filtradas y exportación rápida.
* 💾 **Respaldo y Exportación de Datos:** Descarga de reportes en Excel (CSV con acumulados) y respaldo completo en JSON con herramienta de importación y restauración.
* 👤 **Perfil del Estudiante:** Configuración de datos institucionales (Nombre, Matrícula, Carrera, Institución, Fechas límite y Horas objetivo).
* 💡 **Alertas y Fechas Límite:** Cálculo automático de días restantes hasta la fecha de entrega y ritmo recomendado en horas/día.
* 📄 **Generador de Reportes PDF:** Creación de reportes institucionales por periodo o rango de fechas con formato imprimible y área de firmas de autorización.
* 📱 **PWA & Offline-First:** Diseñado para instalarse en PC y celulares Android/iOS, funcionando sin conexión a internet. Las operaciones realizadas en offline se guardan en una cola local y se sincronizan automáticamente con el backend al recuperar la conexión.

---

## 🛠️ Stack Tecnológico

### Frontend
* **React 19** + **TypeScript**
* **Vite 8**
* **Tailwind CSS v4** (Diseño institucional, dark mode y responsive)
* **PWA** (Web App Manifest + Offline-First)

### Backend & Persistencia
* **Node.js** + **Express** + **TypeScript**
* **Drizzle ORM** (Tipado estricto extremo a extremo)
* **libSQL / SQLite local** (Cero dependencias externas para desarrollo) y compatibilidad 100% con **Turso** en la nube.

---

## 🚀 Guía de Inicio Rápido

### 1. Clonar el repositorio
```bash
git clone https://github.com/cornelioalexis65-cyber/SERVICIOTRACK.git
cd SERVICIOTRACK
```

### 2. Iniciar el Backend
```bash
cd backend
npm install
npm run dev
```
> El servidor iniciará en `http://localhost:3001` y creará automáticamente la base de datos `serviciotrack.db`.

### 3. Iniciar el Frontend
En otra terminal, desde la raíz del proyecto:
```bash
npm install
npm run dev
```
> La aplicación estará disponible en `http://localhost:5173`.

---

## ☁️ Publicar el backend en Vercel + Turso

El backend corre en Vercel como una función serverless y los datos (incluidos los documentos, de hasta 4 MB) se guardan en Turso.

1. **Turso:** crea una base de datos y copia su URL (`libsql://…`) y un token de acceso.
2. **Contraseña:** en `backend/`, ejecuta `npm run hash-password` y copia `APP_PASSWORD_HASH` y `SESSION_SECRET`.
3. **Vercel:** importa el repositorio con **Root Directory = `backend`** y añade estas variables de entorno:
   `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_PASSWORD_HASH`, `SESSION_SECRET` y `CORS_ORIGINS=https://cornelioalexis65-cyber.github.io`.
4. **GitHub:** en *Settings → Secrets and variables → Actions → Variables*, crea `VITE_API_URL` con `https://<tu-proyecto>.vercel.app/api` y vuelve a lanzar el workflow.
5. **En la app:** *Configuración → Nube y Respaldo → Iniciar sesión*. La primera vez, si el servidor está vacío, se suben los registros, el perfil y los documentos que ya tenías en el dispositivo.

---

## 📡 Endpoints de la API REST

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado del servidor y comprobación de salud (pública) |
| `POST` | `/api/login` | Inicia sesión con la contraseña y devuelve una sesión de 30 días |
| `GET` | `/api/sesion` | Comprueba que la sesión es válida |
| `GET` | `/api/registros` | Obtiene todos los registros ordenados por fecha |
| `POST` | `/api/registros` | Crea un nuevo registro con validación en servidor |
| `PUT` | `/api/registros/:id` | Actualiza un registro existente |
| `DELETE` | `/api/registros/:id` | Elimina un registro por ID |
| `GET` | `/api/perfil` | Obtiene los datos del perfil del estudiante |
| `PUT` | `/api/perfil` | Actualiza los datos del perfil del estudiante |

---

## 🔒 Arquitectura de Seguridad
* Validación y sanitización dual (Frontend + Backend).
* Variables de entorno y bases de datos locales excluidas en `.gitignore`.
* Sin almacenamiento de secretos en el control de versiones.
* **Inicio de sesión con contraseña:** la contraseña solo existe en el servidor como hash scrypt (`APP_PASSWORD_HASH`). Al iniciar sesión, el servidor entrega una sesión firmada con HMAC (`SESSION_SECRET`) que dura 30 días. Todas las rutas salvo `/api/health` y `/api/login` la exigen. Tras 10 intentos fallidos desde una IP, el inicio de sesión se bloquea 15 minutos. Cambiar `SESSION_SECRET` cierra todas las sesiones.
* **Nada secreto en la app:** la URL del backend se fija al compilar (`VITE_API_URL`, que no es secreta) y la sesión se obtiene al iniciar sesión en **Configuración → Nube y Respaldo**.
* **Modo local:** sin `APP_PASSWORD_HASH` ni `SESSION_SECRET`, el servidor no pide contraseña y solo escucha en `127.0.0.1`.
* **CORS restringido:** solo se aceptan los orígenes de desarrollo (`localhost:5173` y `localhost:4173`) y los que añadas en `CORS_ORIGINS`.
* **Cola offline robusta:** los archivos pendientes se guardan en IndexedDB con el id de su documento. Si el servidor rechaza una operación (400 o 404), se descarta con un aviso en lugar de bloquear el resto de la cola.
