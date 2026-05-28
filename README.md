# GEMACUU Portal — Event Manager

Sistema de Gestión Estratégica de Mantenimiento y Atención Chihuahua — Módulo de Eventos

## Emergent App Builder

- **Project:** gemacuu-portal
- **Latest Build:** 1c0b5641-e5ee-434f-8581-d3cfd8dd130a
- **Track:** https://app.emergent.sh/home?job_id=1c0b5641-e5ee-434f-8581-d3cfd8dd130a

## Features

### Public Registration Form (`/registro?actividad=evento30mayo`)
- Nombre Completo, Número Celular, Subir Fotos
- Geofencing: 400m del Centro de Convenciones Chihuahua (28.6353, -106.0889)
- Fuera de rango → blocked. Dentro → submit allowed
- Post-submit: "Gracias" + "Guardado"
- Mobile-first, sin branding, alto contraste

### Admin Dashboard (`/admin`) — Dark Theme
- TOTAL OPERANDO: registrados
- AVANCE ACTIVIDAD: X / 164
- SUMA DE TOTALES: registros con fotos
- Pendientes por Padrino (no registrados, agrupados)
- Registrados por Padrino (conteo)
- Gestión de Actividades con "Compartir Link" (copy to clipboard)
- Excel export con columna Padrino

### Sponsor Cross-Reference (RapidFuzz)
- 164 personas, 3 padrinos: Fernando Amezcua, Martin Yáñez, Rene Espinoza
- Fuzzy matching: `fuzz.token_sort_ratio()`, threshold >= 75
- Auto-asigna padrino al registrarse

## Configuration (Environment Variables)

```
SUPABASE_URL=<set in environment>
SUPABASE_KEY=<set in environment>
CLOUDINARY_CLOUD_NAME=<set in environment>
CLOUDINARY_API_KEY=<set in environment>
CLOUDINARY_API_SECRET=<set in environment>
```

## Database Tables (Supabase)
- `activities` — id, nombre, tipo, lat, lng, radio, is_active, created_at
- `personnel_list` — id, nombre_completo, padrino
- `event_registrations` — id, activity_name, nombre_completo, celular, padrino, photo_urls, geolocation, created_at

## Stack
- Backend: Python FastAPI + RapidFuzz
- Frontend: React
- Storage: Cloudinary (`gemacuu/{actividad}/{nombre}/`)
- Database: Supabase
