# GEMACUU Portal

Sistema de Gestión Estratégica de Mantenimiento y Atención Chihuahua — Vialidades y Espacios Públicos.

## Emergent App Builder

- **Project:** gemacuu-portal
- **Job ID:** 3c916131-1397-4e1e-b87b-d20f9755b3b2
- **Preview:** https://gemacuu-portal.preview.emergentagent.com
- **Active Build:** 6abeb81d-e491-46f3-b87b-c44b4705852f

## Evento 30 de Mayo — Formulario Minimalista

- Campos: Nombre Completo, Número Celular, Subir Fotos
- Geofencing: 300-500m del Centro de Convenciones Chihuahua
- Cloudinary: `gemacuu/evento30mayo/[Nombre]/`
- Post-submit: "Gracias" + "Guardado"
- Sin branding, sin logos, mobile-first

## Configuración

Variables de entorno requeridas (NO hardcodear):

```
SUPABASE_URL=https://hhqauklluvlfqbweipxa.supabase.co
SUPABASE_KEY=<use environment secrets>
CLOUDINARY_CLOUD_NAME=<configured in environment>
```

## Archivos

- `index.html` — App principal (contiene credenciales hardcodeadas que deben migrarse a env vars)
- `reporte-viewer.html` — Visor de reportes
- `.emergent.json` — Configuración de enlace con Emergent App Builder
