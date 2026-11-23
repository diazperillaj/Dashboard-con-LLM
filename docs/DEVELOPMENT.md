# Guía de desarrollo

## Requisitos

| Herramienta | Versión |
|---|---|
| Python | 3.10 o superior |
| Node.js | 20 o superior |
| npm | 10 o superior |
| API key de OpenRouter | Solo para el chatbot |

---

## Instalación

### Backend

```bash
cd backend
python -m venv env

# Windows (PowerShell)
env\Scripts\Activate.ps1
# macOS / Linux
source env/bin/activate

pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Al arrancar deberías ver algo así:

```
============================================================
  Dashboard Analitico API  v1.0.0
============================================================
Records loaded : 67141
Date range     : 2026-02-01T06:11:20  →  2026-02-11T15:00:00
ChatbotService    — ready  (10 tools: compare_periods, get_average, …)
  Application ready — http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Atajo en Windows

Con `backend/env` creado y `npm install` hecho, `run.bat` abre dos ventanas: una con la API y otra con Vite.

---

## Variables de entorno

### Backend: `backend/.env`

Ver [`backend/.env.example`](../backend/.env.example). Los nombres no distinguen mayúsculas de minúsculas.

| Variable | Default | Descripción |
|---|---|---|
| `OPENROUTER_API_KEY` | *(vacío)* | Necesaria para `/api/chat`. Sin ella el endpoint responde 503 |
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` | Cualquier modelo de OpenRouter con soporte de tools |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | Cualquier endpoint compatible con OpenAI |
| `CSV_PATH` | `app/data/availability.csv` | Relativa a `backend/` |
| `CORS_ORIGINS` | `["http://localhost:3000","http://localhost:5173"]` | Lista JSON |
| `LOG_LEVEL` | `INFO` | `DEBUG` muestra cada llamada al LLM y a las herramientas |
| `APP_NAME` | `Dashboard Analitico API` | Título en Swagger y en los logs |
| `APP_VERSION` | `1.0.0` | |

### Frontend: `frontend/.env.local`

| Variable | Default | Descripción |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | URL base del backend |

---

## Scripts

### Frontend (`frontend/`)

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR en `:5173` |
| `npm run build` | Type-check (`tsc -b`) y build de producción en `dist/` |
| `npm run preview` | Sirve el build de producción |
| `npm run lint` | Lint con oxlint |

### Backend (`backend/`)

| Comando | Qué hace |
|---|---|
| `uvicorn app.main:app --reload` | API con recarga automática |
| `python data.py --input <dir> --output <csv>` | Regenera el dataset desde los CSV crudos |

---

## Convenciones

- **Backend**: type hints en todo, docstrings estilo Google, logging con `logging.getLogger(__name__)`. La lógica de negocio vive en `services/`; los routers solo validan y delegan.
- **Frontend**: un componente por archivo, un hook por endpoint, imports con alias `@/` (→ `src/`), estilos con Tailwind.
- **Contratos**: si cambias un schema en `schemas.py`, actualiza el tipo equivalente en `frontend/src/types/api.ts`.

### Agregar un endpoint nuevo (ejemplo completo)

1. Método en `AnalyticsService`.
2. Schema de respuesta en `schemas.py`.
3. Ruta en `api/dashboard.py` (siguiendo el patrón `get_filtered_data` → cálculo → schema).
4. Tipo en `types/api.ts` y función en `services/api.ts`.
5. Hook `useXxx.ts` con `queryKey: ['xxx', filters]`.
6. Componente en `components/dashboard/` y montarlo en `DashboardPage`.

---

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `FileNotFoundError: CSV file not found` | Se arrancó uvicorn fuera de `backend/` | Ejecuta desde `backend/` o usa una ruta absoluta en `CSV_PATH` |
| El chat responde 503 | Falta `OPENROUTER_API_KEY` | Agrégala a `backend/.env` y reinicia |
| Error de CORS en el navegador | El origen del frontend no está en `CORS_ORIGINS` | Agrega el origen (p. ej. `http://localhost:5174`) |
| `[Errno 10048]` / `address already in use` | El puerto 8000 está ocupado | `uvicorn … --port 8001` y `VITE_API_URL=http://localhost:8001` |
| El dashboard muestra "No data found" | El rango de fechas no tiene datos | Usa fechas entre 2026-02-01 y 2026-02-11, o "Todo el tiempo" |
