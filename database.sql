create table if not exists app_users (
  email text primary key,
  name text not null,
  password text not null,
  role text not null check (role in ('docente', 'estudiante', 'gerente', 'administrador')),
  progress jsonb not null,
  completed_video_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quizzes (
  subject_id text primary key check (subject_id in ('matematica', 'historia', 'lengua', 'ciencias')),
  quiz jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists videos (
  id uuid primary key,
  subject_id text not null check (subject_id in ('matematica', 'historia', 'lengua', 'ciencias')),
  name text not null,
  mime_type text not null,
  uploaded_at timestamptz not null default now(),
  file_name text not null unique,
  data bytea not null
);

create index if not exists idx_app_users_role on app_users (role);
create index if not exists idx_videos_subject_id on videos (subject_id);
create index if not exists idx_videos_uploaded_at on videos (uploaded_at);

insert into quizzes (subject_id, quiz)
values
(
  'matematica',
  '[
    {
      "prompt": "Si tienes 4 globos y te regalan 3 mas, cuantos globos tienes?",
      "options": ["5", "6", "7", "8"],
      "correctIndex": 2,
      "explanation": "4 + 3 = 7. Cuando juntamos cantidades estamos sumando."
    },
    {
      "prompt": "Cual es el resultado de 9 - 4?",
      "options": ["3", "4", "5", "6"],
      "correctIndex": 2,
      "explanation": "9 - 4 = 5. Restar es quitar una cantidad."
    },
    {
      "prompt": "Que operacion sirve para juntar cantidades?",
      "options": ["Resta", "Suma", "Division", "Comparacion"],
      "correctIndex": 1,
      "explanation": "La suma se usa para reunir cantidades."
    },
    {
      "prompt": "Si Ana tiene 6 cuadernos y pierde 2, cuantos le quedan?",
      "options": ["8", "5", "4", "3"],
      "correctIndex": 2,
      "explanation": "6 - 2 = 4. A Ana le quedan 4 cuadernos."
    },
    {
      "prompt": "Cual numero falta en la serie 2, 4, 6, __, 10?",
      "options": ["7", "8", "9", "12"],
      "correctIndex": 1,
      "explanation": "La serie aumenta de 2 en 2, por eso sigue el 8."
    }
  ]'::jsonb
),
(
  'historia',
  '[
    {
      "prompt": "Para que sirve una linea del tiempo?",
      "options": ["Para medir peso", "Para ordenar hechos", "Para sumar numeros", "Para jugar futbol"],
      "correctIndex": 1,
      "explanation": "La linea del tiempo organiza hechos del pasado en orden."
    },
    {
      "prompt": "Que lugar guarda objetos e historias del pasado?",
      "options": ["Museo", "Parque", "Mercado", "Hospital"],
      "correctIndex": 0,
      "explanation": "En el museo podemos conocer objetos e historias antiguas."
    },
    {
      "prompt": "La historia ayuda a:",
      "options": ["Entender cambios del pasado", "Olvidar lo ocurrido", "No leer", "Resolver sumas"],
      "correctIndex": 0,
      "explanation": "La historia explica como cambiaron las personas, lugares y costumbres."
    },
    {
      "prompt": "Si un hecho ocurrio hace mucho tiempo, pertenece al:",
      "options": ["Pasado", "Futuro", "Recreo", "Juego"],
      "correctIndex": 0,
      "explanation": "El pasado incluye hechos que ya ocurrieron."
    },
    {
      "prompt": "Quien puede contarte recuerdos de cuando era pequeno?",
      "options": ["Un familiar", "Una mesa", "Una regla", "Un numero"],
      "correctIndex": 0,
      "explanation": "Los familiares pueden compartir historias y recuerdos."
    }
  ]'::jsonb
),
(
  'lengua',
  '[
    {
      "prompt": "Que parte del cuento presenta el problema principal?",
      "options": ["Titulo", "Nudo", "Portada", "Dedicatoria"],
      "correctIndex": 1,
      "explanation": "El nudo desarrolla el problema principal del cuento."
    },
    {
      "prompt": "El desenlace de una historia:",
      "options": ["Inicia la historia", "Explica el titulo", "Resuelve o cierra el conflicto", "Presenta al autor"],
      "correctIndex": 2,
      "explanation": "El desenlace es el cierre de la historia."
    },
    {
      "prompt": "Comprender un texto significa:",
      "options": ["Leer sin pensar", "Entender sus ideas principales", "Copiarlo completo", "Saltar parrafos"],
      "correctIndex": 1,
      "explanation": "Comprender es entender lo que el texto quiere comunicar."
    },
    {
      "prompt": "Quien vive los hechos dentro del cuento?",
      "options": ["El narrador y los personajes", "Solo el lector", "El editor", "Nadie"],
      "correctIndex": 0,
      "explanation": "Los personajes viven la historia y el narrador la cuenta."
    },
    {
      "prompt": "Un final alternativo es:",
      "options": ["Otra forma de cerrar la historia", "Una portada distinta", "Un resumen del cuento", "Una regla ortografica"],
      "correctIndex": 0,
      "explanation": "Es una nueva propuesta para terminar la historia."
    }
  ]'::jsonb
),
(
  'ciencias',
  '[
    {
      "prompt": "Que lugar de la comunidad se relaciona con aprender?",
      "options": ["Hospital", "Escuela", "Mercado", "Parqueadero"],
      "correctIndex": 1,
      "explanation": "La escuela es el lugar donde aprendemos."
    },
    {
      "prompt": "Para que sirven las normas?",
      "options": ["Para convivir mejor", "Para correr sin orden", "Para olvidar responsabilidades", "Para jugar sin respeto"],
      "correctIndex": 0,
      "explanation": "Las normas ayudan a convivir con respeto y orden."
    },
    {
      "prompt": "Quien cuida la salud de las personas en la comunidad?",
      "options": ["Medico", "Panadero", "Pintor", "Piloto"],
      "correctIndex": 0,
      "explanation": "El medico ayuda a cuidar la salud de las personas."
    },
    {
      "prompt": "Una buena convivencia significa:",
      "options": ["Gritar siempre", "Respetar a los demas", "No escuchar a nadie", "Romper reglas"],
      "correctIndex": 1,
      "explanation": "Respetar y escuchar mejora la convivencia."
    },
    {
      "prompt": "Cual es una norma positiva del aula?",
      "options": ["Empujar a los companeros", "Escuchar cuando otro habla", "Tirar papeles al piso", "No compartir materiales"],
      "correctIndex": 1,
      "explanation": "Escuchar cuando otro habla demuestra respeto."
    }
  ]'::jsonb
)
on conflict (subject_id) do update
set quiz = excluded.quiz,
    updated_at = now();
