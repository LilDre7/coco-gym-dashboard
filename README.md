Coco Gym Fitness Dashboard
Panel de administración para Coco Gym Fitness - Playas del Coco, enfocado en la gestión de miembros, suscripciones y estadísticas del gimnasio.
​

🚀 Características principales
Gestión de miembros: creación, edición y eliminación de usuarios.
​

Control de suscripciones: estado activo, por vencer y expirado.
​

Métricas clave: total de miembros, activos, por expirar en 7 días y expirados.
​

Filtros por disciplina y estado.
​

Búsqueda rápida por nombre.
​

Acceso directo a contacto por WhatsApp desde la tabla de miembros.
​

🧱 Stack tecnológico
Frontend: React / Next.js (indica la versión que uses).

Estilos/UI: Tailwind CSS / shadcn/ui / Chakra UI (ajusta según tu caso).

Deploy: Vercel (https://coco-gym-dashboard.vercel.app/).[1]

Integraciones: Enlace directo a WhatsApp mediante número de teléfono del miembro.
​

📦 Requisitos previos
Node.js (v18+ recomendado).

npm, pnpm o yarn instalado globalmente.

🔧 Instalación y ejecución
bash
# Clonar el repositorio
git clone https://github.com/LilDre7/coco-gym-dashboard
cd coco-gym-dashboard

# Instalar dependencias
npm install
# o
yarn
# o
pnpm install

# Ejecutar en desarrollo
npm run dev
# o
yarn dev
# o
pnpm dev
La aplicación se ejecutará en http://localhost:3000 (ajusta el puerto si es diferente).

⚙️ Variables de entorno
Crea un archivo .env.local en la raíz del proyecto y configura las variables necesarias, por ejemplo:

text
NEXT_PUBLIC_API_BASE_URL=https://api.midominio.com
WHATSAPP_DEFAULT_PREFIX=+506

🧮 Módulo de miembros
La sección Members permite:
​

Visualizar una tabla con: nombre, disciplina, mensualidad, fecha de expiración, días restantes, estado, tiempo en gimnasio, teléfono y acciones.
​

Filtrar por disciplina (All Disciplines, etc.) y por estado (All Status, Active, Expiring, Expired).
​

Añadir nuevos miembros mediante el botón Add Member.
​

Editar datos del miembro y gestionar su estado de suscripción.
​

📁 Estructura sugerida del proyecto
text
src/
  app/ o pages/
  components/
    members/
    layout/
  lib/
  hooks/
  styles/
(Ajusta este árbol para que refleje tu estructura real.)

✅ Scripts disponibles
En package.json (ejemplo):

json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
🗺️ Roadmap
Integrar autenticación para staff del gimnasio.

Agregar módulo de pagos e historial de asistencia.

Reportes exportables (CSV/PDF) para membresías y estados.

Dashboard de analytics más detallado (ingresos, retención, etc.).

📄 Licencia
Especifica aquí la licencia del proyecto (MIT, GPL, privada, etc.).

