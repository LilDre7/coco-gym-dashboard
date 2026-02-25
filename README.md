<div align="right">

# 🥥 Coco Gym Fitness Dashboard

### Panel de administración para **Coco Gym Fitness** — Playas del Coco, Costa Rica

[![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://coco-gym-dashboard.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

> Solución web escalable para la gestión integral de membresías, suscripciones y analíticas del gimnasio.

**[🌐 Ver Demo en Vivo](https://coco-gym-dashboard.vercel.app/)** · **[🐛 Reportar Bug](https://github.com/LilDre7/coco-gym-dashboard/issues)** · **[💡 Solicitar Feature](https://github.com/LilDre7/coco-gym-dashboard/issues)**

</div>

## ✨ Características principales

| Feature | Descripción |
|---|---|
| 👥 **Gestión de miembros** | Crear, editar y eliminar miembros con datos completos |
| 📋 **Control de suscripciones** | Estados: `Activo`, `Por vencer` y `Expirado` con indicadores visuales |
| 📊 **Métricas clave** | Total de miembros, activos, próximos a expirar (7 días) y expirados |
| 🔍 **Búsqueda y filtros** | Búsqueda por nombre + filtros por disciplina y estado |
| 💬 **Integración WhatsApp** | Contacto directo al miembro con un clic desde la tabla |
| 📅 **Días restantes** | Indicador en tiempo real de días hasta expiración por membresía |

---

## 🧱 Stack tecnológico

```
Frontend   →  React 18 + Next.js 14 (App Router)
Estilos    →  Tailwind CSS + shadcn/ui
Deploy     →  Vercel
Integrac.  →  WhatsApp API (deep link por número de teléfono)
```

---

## 📦 Requisitos previos

- **Node.js** v18 o superior — [descargar aquí](https://nodejs.org/)
- **npm**, **pnpm** o **yarn** instalado globalmente

---

## 🔧 Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/LilDre7/coco-gym-dashboard
cd coco-gym-dashboard

# 2. Instalar dependencias
npm install       # con npm
# pnpm install    # con pnpm
# yarn            # con yarn

# 3. Configurar variables de entorno
cp .env.example .env.local
# → Edita .env.local con tus valores (ver sección siguiente)

# 4. Ejecutar en desarrollo
npm run dev
```

La aplicación estará disponible en **[http://localhost:3000](http://localhost:3000)**.

---

## ⚙️ Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# URL base de tu API o backend
NEXT_PUBLIC_API_BASE_URL=https://api.midominio.com

# Prefijo de país para generación de links WhatsApp
WHATSAPP_DEFAULT_PREFIX=+506
```

> ⚠️ **Nunca subas `.env.local` a tu repositorio.** Está incluido en `.gitignore` por defecto.

---

## 🧮 Módulo de miembros

La sección **Members** centraliza toda la gestión de usuarios del gimnasio:

**Tabla de miembros** — columnas disponibles:

| Campo | Descripción |
|---|---|
| Nombre | Nombre completo del miembro |
| Disciplina | Tipo de actividad (CrossFit, Yoga, Musculación, etc.) |
| Mensualidad | Monto de la suscripción |
| Fecha de expiración | Vencimiento de la membresía activa |
| Días restantes | Contador en tiempo real |
| Estado | Badge: `Active` / `Expiring` / `Expired` |
| Tiempo en gimnasio | Antigüedad como miembro |
| Teléfono | Número de contacto |
| Acciones | Editar · Eliminar · WhatsApp |

**Controles disponibles:**

- **Add Member** — formulario para registrar un nuevo miembro
- **Filtro por disciplina** — selector desplegable (`All Disciplines`, `CrossFit`, `Yoga`, etc.)
- **Filtro por estado** — selector (`All Status`, `Active`, `Expiring`, `Expired`)
- **Búsqueda** — campo de texto con filtro en tiempo real por nombre

---

## 📁 Estructura del proyecto

```
coco-gym-dashboard/
├── public/                  # Assets estáticos
├── src/
│   ├── app/                 # App Router de Next.js (layouts, páginas)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── members/
│   ├── components/
│   │   ├── members/         # Tabla, formularios, badges de estado
│   │   ├── dashboard/       # Métricas y tarjetas KPI
│   │   └── layout/          # Sidebar, navbar, footer
│   ├── hooks/               # Custom hooks (useMemberFilter, etc.)
│   ├── lib/                 # Utilidades, helpers, config
│   └── styles/              # Estilos globales
├── .env.local               # Variables de entorno (no versionado)
├── .env.example             # Plantilla de variables
├── next.config.js
├── tailwind.config.ts
└── package.json
```

> Ajusta este árbol para que refleje la estructura real de tu proyecto.

---

## ✅ Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo con hot-reload
npm run build    # Build de producción optimizado
npm run start    # Servidor de producción local
npm run lint     # Análisis estático con ESLint
```

---

## 🗺️ Roadmap

- [ ] 🔐 Autenticación y roles para staff del gimnasio
- [ ] 💳 Módulo de pagos e historial de transacciones
- [ ] 📅 Registro de asistencia diaria
- [ ] 📤 Exportar reportes en **CSV** y **PDF**
- [ ] 📈 Dashboard de analytics avanzado (ingresos, retención, churn)
- [ ] 📱 PWA / App móvil para miembros

---

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Para colaborar:

1. Haz fork del repositorio
2. Crea una branch: `git checkout -b feature/nueva-funcionalidad`
3. Realiza tus cambios y haz commit: `git commit -m 'feat: agrega nueva funcionalidad'`
4. Push a tu branch: `git push origin feature/nueva-funcionalidad`
5. Abre un **Pull Request**

---

## 📄 Licencia

Distribuido bajo la licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más información.

---

<div align="center">

Hecho con ❤️ para **Coco Gym Fitness** — Playas del Coco, Costa Rica 🇨🇷

</div>
