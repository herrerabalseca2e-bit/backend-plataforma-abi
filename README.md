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

## Desplegar en Vercel

1. Crea un proyecto de Vercel apuntando a esta carpeta `backend`.
2. Configura `FRONTEND_URL` con la URL del frontend desplegado.
3. Despliega.

## Variables

- `PORT`: puerto local opcional.
- `FRONTEND_URL`: origen permitido para CORS. Para este proyecto usa `https://aula-de-abi.vercel.app`.
- `STORAGE_DIR`: carpeta de almacenamiento opcional.

En Vercel el almacenamiento local usa `/tmp`, por lo que no es persistente entre reinicios. Para datos permanentes conviene conectar una base de datos o almacenamiento externo.
