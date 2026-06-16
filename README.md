# Backend Aula Escolar

API separada de la aplicacion Angular.

## Ejecutar localmente

```bash
npm install
npm run dev
```

La API queda disponible en:

```text
http://localhost:4000
```

La API desplegada esta en:

```text
https://backend-plataforma-abi.vercel.app
```

## Desplegar en Vercel

1. Crea un proyecto de Vercel apuntando a esta carpeta `backend`.
2. En Supabase abre SQL Editor y ejecuta el archivo `database.sql`.
3. Configura `DATABASE_URL` con la URL de PostgreSQL.
4. Configura `FRONTEND_URL` con la URL del frontend desplegado.
5. Despliega.

## Variables

- `PORT`: puerto local opcional.
- `DATABASE_URL`: cadena de conexion PostgreSQL de Supabase.
- `FRONTEND_URL`: origen permitido para CORS. Para este proyecto usa `https://aula-de-abi.vercel.app`.

## Base de datos

El backend guarda usuarios, progreso, evaluaciones y videos completados en PostgreSQL. Los archivos de video los gestiona el frontend y no se guardan en tablas del backend. Ejecuta este archivo en Supabase:

```text
database.sql
```

## Comandos necesarios

```bash
npm install
npm run build
```
