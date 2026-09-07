# 🎓 ServicioTrack - Plataforma de Control de Servicio Social

**ServicioTrack** es una aplicación moderna, offline-first e institucional diseñada para que estudiantes gestionen, monitoreen y generen reportes oficiales de sus horas de servicio social (meta estándar de 500 horas).

---

## 🌟 Características Principales

* 📊 **Dashboard y Métricas:** Visualización de horas realizadas, horas restantes, porcentaje de avance, días acumulados, promedio diario y fecha del último registro.
* 📈 **Barra de Progreso Interactiva:** Indicador visual animado con marcadores de hitos (0h, 125h, 250h, 375h, 500h).
* 📝 **Registro de Actividades:** Formulario para altas y edición de actividades con validaciones estrictas (sin horas negativas, máximo 24h/día, tope de meta y bloqueo de fechas futuras).
* 📋 **Historial Cronológico:** Vista feed de actividades con acciones rápidas de edición y eliminación.
* 👤 **Perfil del Estudiante:** Configuración de datos institucionales (Nombre, Matrícula, Carrera, Institución, Fechas límite y Horas objetivo).
* 💡 **Alertas y Fechas Límite:** Cálculo automático de días restantes hasta la fecha de entrega y ritmo recomendado en horas/día.
* 📄 **Generador de Reportes PDF:** Creación de reportes institucionales por periodo o rango de fechas con formato imprimible y área de firmas de autorización.
* 📱 **PWA & Offline-First:** Diseñado para instalarse en PC y celulares Android/iOS, funcionando sin conexión a internet y sincronizándose al reconectar.

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

## 📡 Endpoints de la API REST

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado del servidor y comprobación de salud |
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
