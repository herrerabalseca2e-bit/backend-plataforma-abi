import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

type SubjectId = 'matematica' | 'historia' | 'lengua' | 'ciencias';
type UserRole = 'docente' | 'estudiante' | 'gerente' | 'administrador';

interface SubjectProgress {
  lessonCompleted: boolean;
  completedActivities: number[];
  latestScore: number;
  bestScore: number;
  stars: number;
  feedback: string;
  quizzesTaken: number;
}

interface QuizQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface StoredUserRecord {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  progress: Record<SubjectId, SubjectProgress>;
  completedVideoIds: string[];
}

interface UserRow {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  progress: Record<SubjectId, SubjectProgress> | null;
  completed_video_ids: string[] | null;
}

const databaseUrl = process.env['DATABASE_URL'] || process.env['POSTGRES_URL'];
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    })
  : null;

const app = express();
const appStoragePath = path.join(process.cwd(), 'app-storage');

app.set('trust proxy', 1);
app.use((req, res, next) => {
  const allowedOrigin = process.env['FRONTEND_URL'] || 'https://aula-de-abi.vercel.app';
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});
app.use(express.json({ limit: '200mb' }));
app.use('/app-storage', express.static(appStoragePath));

function sendSuccess<T>(res: Response, status: number, message: string, data?: T) {
  res.status(status).json({
    success: true,
    message,
    data: data ?? null,
  });
}

function sendError(res: Response, status: number, message: string) {
  res.status(status).json({
    success: false,
    message,
    error: {
      status,
      message,
    },
  });
}

function db() {
  if (!pool) {
    throw new Error('DATABASE_URL no esta configurada.');
  }

  return pool;
}

function createDefaultQuizzes(): Record<SubjectId, QuizQuestion[]> {
  return {
    matematica: [
      {
        prompt: 'Si tienes 4 globos y te regalan 3 mas, cuantos globos tienes?',
        options: ['5', '6', '7', '8'],
        correctIndex: 2,
        explanation: '4 + 3 = 7. Cuando juntamos cantidades estamos sumando.',
      },
      {
        prompt: 'Cual es el resultado de 9 - 4?',
        options: ['3', '4', '5', '6'],
        correctIndex: 2,
        explanation: '9 - 4 = 5. Restar es quitar una cantidad.',
      },
      {
        prompt: 'Que operacion sirve para juntar cantidades?',
        options: ['Resta', 'Suma', 'Division', 'Comparacion'],
        correctIndex: 1,
        explanation: 'La suma se usa para reunir cantidades.',
      },
      {
        prompt: 'Si Ana tiene 6 cuadernos y pierde 2, cuantos le quedan?',
        options: ['8', '5', '4', '3'],
        correctIndex: 2,
        explanation: '6 - 2 = 4. A Ana le quedan 4 cuadernos.',
      },
      {
        prompt: 'Cual numero falta en la serie 2, 4, 6, __, 10?',
        options: ['7', '8', '9', '12'],
        correctIndex: 1,
        explanation: 'La serie aumenta de 2 en 2, por eso sigue el 8.',
      },
    ],
    historia: [
      {
        prompt: 'Para que sirve una linea del tiempo?',
        options: ['Para medir peso', 'Para ordenar hechos', 'Para sumar numeros', 'Para jugar futbol'],
        correctIndex: 1,
        explanation: 'La linea del tiempo organiza hechos del pasado en orden.',
      },
      {
        prompt: 'Que lugar guarda objetos e historias del pasado?',
        options: ['Museo', 'Parque', 'Mercado', 'Hospital'],
        correctIndex: 0,
        explanation: 'En el museo podemos conocer objetos e historias antiguas.',
      },
      {
        prompt: 'La historia ayuda a:',
        options: ['Entender cambios del pasado', 'Olvidar lo ocurrido', 'No leer', 'Resolver sumas'],
        correctIndex: 0,
        explanation: 'La historia explica como cambiaron las personas, lugares y costumbres.',
      },
      {
        prompt: 'Si un hecho ocurrio hace mucho tiempo, pertenece al:',
        options: ['Pasado', 'Futuro', 'Recreo', 'Juego'],
        correctIndex: 0,
        explanation: 'El pasado incluye hechos que ya ocurrieron.',
      },
      {
        prompt: 'Quien puede contarte recuerdos de cuando era pequeno?',
        options: ['Un familiar', 'Una mesa', 'Una regla', 'Un numero'],
        correctIndex: 0,
        explanation: 'Los familiares pueden compartir historias y recuerdos.',
      },
    ],
    lengua: [
      {
        prompt: 'Que parte del cuento presenta el problema principal?',
        options: ['Titulo', 'Nudo', 'Portada', 'Dedicatoria'],
        correctIndex: 1,
        explanation: 'El nudo desarrolla el problema principal del cuento.',
      },
      {
        prompt: 'El desenlace de una historia:',
        options: ['Inicia la historia', 'Explica el titulo', 'Resuelve o cierra el conflicto', 'Presenta al autor'],
        correctIndex: 2,
        explanation: 'El desenlace es el cierre de la historia.',
      },
      {
        prompt: 'Comprender un texto significa:',
        options: ['Leer sin pensar', 'Entender sus ideas principales', 'Copiarlo completo', 'Saltar parrafos'],
        correctIndex: 1,
        explanation: 'Comprender es entender lo que el texto quiere comunicar.',
      },
      {
        prompt: 'Quien vive los hechos dentro del cuento?',
        options: ['El narrador y los personajes', 'Solo el lector', 'El editor', 'Nadie'],
        correctIndex: 0,
        explanation: 'Los personajes viven la historia y el narrador la cuenta.',
      },
      {
        prompt: 'Un final alternativo es:',
        options: ['Otra forma de cerrar la historia', 'Una portada distinta', 'Un resumen del cuento', 'Una regla ortografica'],
        correctIndex: 0,
        explanation: 'Es una nueva propuesta para terminar la historia.',
      },
    ],
    ciencias: [
      {
        prompt: 'Que lugar de la comunidad se relaciona con aprender?',
        options: ['Hospital', 'Escuela', 'Mercado', 'Parqueadero'],
        correctIndex: 1,
        explanation: 'La escuela es el lugar donde aprendemos.',
      },
      {
        prompt: 'Para que sirven las normas?',
        options: ['Para convivir mejor', 'Para correr sin orden', 'Para olvidar responsabilidades', 'Para jugar sin respeto'],
        correctIndex: 0,
        explanation: 'Las normas ayudan a convivir con respeto y orden.',
      },
      {
        prompt: 'Quien cuida la salud de las personas en la comunidad?',
        options: ['Medico', 'Panadero', 'Pintor', 'Piloto'],
        correctIndex: 0,
        explanation: 'El medico ayuda a cuidar la salud de las personas.',
      },
      {
        prompt: 'Una buena convivencia significa:',
        options: ['Gritar siempre', 'Respetar a los demas', 'No escuchar a nadie', 'Romper reglas'],
        correctIndex: 1,
        explanation: 'Respetar y escuchar mejora la convivencia.',
      },
      {
        prompt: 'Cual es una norma positiva del aula?',
        options: ['Empujar a los companeros', 'Escuchar cuando otro habla', 'Tirar papeles al piso', 'No compartir materiales'],
        correctIndex: 1,
        explanation: 'Escuchar cuando otro habla demuestra respeto.',
      },
    ],
  };
}

function createEmptyProgress(): Record<SubjectId, SubjectProgress> {
  return {
    matematica: {
      lessonCompleted: false,
      completedActivities: [],
      latestScore: 0,
      bestScore: 0,
      stars: 0,
      feedback: 'Aun no has presentado la evaluacion.',
      quizzesTaken: 0,
    },
    historia: {
      lessonCompleted: false,
      completedActivities: [],
      latestScore: 0,
      bestScore: 0,
      stars: 0,
      feedback: 'Aun no has presentado la evaluacion.',
      quizzesTaken: 0,
    },
    lengua: {
      lessonCompleted: false,
      completedActivities: [],
      latestScore: 0,
      bestScore: 0,
      stars: 0,
      feedback: 'Aun no has presentado la evaluacion.',
      quizzesTaken: 0,
    },
    ciencias: {
      lessonCompleted: false,
      completedActivities: [],
      latestScore: 0,
      bestScore: 0,
      stars: 0,
      feedback: 'Aun no has presentado la evaluacion.',
      quizzesTaken: 0,
    },
  };
}

function mapUser(row: UserRow): StoredUserRecord {
  return {
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    progress: {
      ...createEmptyProgress(),
      ...(row.progress ?? {}),
    },
    completedVideoIds: row.completed_video_ids ?? [],
  };
}

async function readUsers() {
  const result = await db().query<UserRow>(
    'select name, email, password, role, progress, completed_video_ids from app_users order by name asc',
  );
  return result.rows.map((row) => mapUser(row));
}

async function findUserByEmail(email: string) {
  const result = await db().query<UserRow>(
    'select name, email, password, role, progress, completed_video_ids from app_users where email = $1 limit 1',
    [email],
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

async function createUser(user: StoredUserRecord) {
  await db().query(
    'insert into app_users (name, email, password, role, progress, completed_video_ids) values ($1, $2, $3, $4, $5::jsonb, $6)',
    [user.name, user.email, user.password, user.role, JSON.stringify(user.progress), user.completedVideoIds],
  );
}

async function updateUserProgress(email: string, progress: Record<SubjectId, SubjectProgress>) {
  const result = await db().query<UserRow>(
    'update app_users set progress = $2::jsonb, updated_at = now() where email = $1 returning name, email, password, role, progress, completed_video_ids',
    [email, JSON.stringify(progress)],
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

async function updateUserCompletedVideos(email: string, completedVideoIds: string[]) {
  const result = await db().query<UserRow>(
    'update app_users set completed_video_ids = $2, updated_at = now() where email = $1 returning name, email, password, role, progress, completed_video_ids',
    [email, completedVideoIds],
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

async function readQuizzes() {
  const result = await db().query<{ subject_id: SubjectId; quiz: QuizQuestion[] }>(
    'select subject_id, quiz from quizzes',
  );
  const quizzes = createDefaultQuizzes();

  for (const row of result.rows) {
    quizzes[row.subject_id] = row.quiz;
  }

  return quizzes;
}

async function updateQuiz(subjectId: SubjectId, quiz: QuizQuestion[]) {
  await db().query(
    'insert into quizzes (subject_id, quiz, updated_at) values ($1, $2::jsonb, now()) on conflict (subject_id) do update set quiz = excluded.quiz, updated_at = now()',
    [subjectId, JSON.stringify(quiz)],
  );
}

function sanitizeUser(user: StoredUserRecord) {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    progress: user.progress,
    completedVideoIds: user.completedVideoIds ?? [],
    progressSummary: calculateProgressSummary(user),
  };
}

function sanitizeStudentProgress(user: StoredUserRecord) {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    progress: user.progress,
    completedVideoIds: user.completedVideoIds ?? [],
    progressSummary: calculateProgressSummary(user),
  };
}

function calculateProgressSummary(user: StoredUserRecord) {
  const subjects = Object.entries(user.progress) as [SubjectId, SubjectProgress][];
  const subjectProgress = subjects.map(([subjectId, progress]) => {
    const lessonPercent = progress.lessonCompleted ? 25 : 0;
    const activitiesPercent = Math.min(progress.completedActivities.length, 3) * (25 / 3);
    const quizPercent = Math.min(progress.bestScore, 100) * 0.5;
    const percentage = Math.round(Math.min(100, lessonPercent + activitiesPercent + quizPercent));

    return {
      subjectId,
      percentage,
      lessonCompleted: progress.lessonCompleted,
      completedActivities: progress.completedActivities.length,
      bestScore: progress.bestScore,
      quizzesTaken: progress.quizzesTaken,
    };
  });
  const overallPercentage =
    subjectProgress.length === 0
      ? 0
      : Math.round(subjectProgress.reduce((total, subject) => total + subject.percentage, 0) / subjectProgress.length);

  return {
    overallPercentage,
    completedVideos: user.completedVideoIds.length,
    subjects: subjectProgress,
  };
}

app.get('/api/health', async (_req, res) => {
  await db().query('select 1');
  sendSuccess(res, 200, 'Backend funcionando correctamente.', {
    service: 'aula-escolar-backend',
    database: 'postgresql',
  });
});

app.post('/api/auth/register', async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '').trim();
  const role = String(req.body?.role ?? 'estudiante') as UserRole;
  const allowedRoles = new Set(['docente', 'estudiante', 'gerente', 'administrador']);

  if (!name) {
    sendError(res, 400, 'Falta el nombre del usuario.');
    return;
  }

  if (!email) {
    sendError(res, 400, 'Falta el correo.');
    return;
  }

  if (!password || password.length < 4) {
    sendError(res, 400, 'La contrasena debe tener al menos 4 caracteres.');
    return;
  }

  if (!allowedRoles.has(role)) {
    sendError(res, 400, 'El rol enviado no es valido.');
    return;
  }

  const exists = await findUserByEmail(email);
  if (exists) {
    sendError(res, 409, 'Ese correo ya esta registrado.');
    return;
  }

  const nextUser: StoredUserRecord = {
    name,
    email,
    password,
    role,
    progress: createEmptyProgress(),
    completedVideoIds: [],
  };

  await createUser(nextUser);
  sendSuccess(res, 201, 'Usuario registrado correctamente.', { user: sanitizeUser(nextUser) });
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '').trim();

  if (!email || !password) {
    sendError(res, 400, 'Debes escribir correo y contrasena.');
    return;
  }

  const user = await findUserByEmail(email);

  if (!user) {
    sendError(res, 404, 'Ese correo no existe.');
    return;
  }

  if (user.password !== password) {
    sendError(res, 401, 'La contrasena no coincide.');
    return;
  }

  sendSuccess(res, 200, 'Sesion iniciada correctamente.', { user: sanitizeUser(user) });
});

app.get('/api/users/:email', async (req, res) => {
  const email = decodeURIComponent(req.params.email).trim().toLowerCase();
  const user = await findUserByEmail(email);

  if (!user) {
    sendError(res, 404, 'Usuario no encontrado.');
    return;
  }

  sendSuccess(res, 200, 'Usuario encontrado correctamente.', { user: sanitizeUser(user) });
});

app.get('/api/students', async (_req, res) => {
  const users = await readUsers();
  const students = users
    .filter((item) => item.role === 'estudiante')
    .map((item) => sanitizeStudentProgress(item));

  sendSuccess(res, 200, 'Estudiantes consultados correctamente.', { students });
});

app.get('/api/quizzes', async (_req, res) => {
  const quizzes = await readQuizzes();
  sendSuccess(res, 200, 'Evaluaciones consultadas correctamente.', { quizzes });
});

app.put('/api/quizzes/:subjectId', async (req, res) => {
  const subjectId = req.params.subjectId as SubjectId;
  const quiz = req.body?.quiz as QuizQuestion[] | undefined;
  const allowedSubjects = new Set(['matematica', 'historia', 'lengua', 'ciencias']);

  if (!allowedSubjects.has(subjectId)) {
    sendError(res, 400, 'Asignatura no valida.');
    return;
  }

  if (!quiz || !Array.isArray(quiz) || quiz.length < 5) {
    sendError(res, 400, 'La evaluacion debe tener al menos 5 preguntas.');
    return;
  }

  const invalidQuestion = quiz.some(
    (question) =>
      !question?.prompt ||
      !question?.explanation ||
      !Array.isArray(question.options) ||
      question.options.length !== 4 ||
      question.options.some((option) => !String(option).trim()) ||
      typeof question.correctIndex !== 'number' ||
      question.correctIndex < 0 ||
      question.correctIndex > 3,
  );

  if (invalidQuestion) {
    sendError(res, 400, 'Cada pregunta debe tener 4 opciones, una respuesta correcta y una explicacion.');
    return;
  }

  const savedQuiz = quiz.map((question) => ({
    prompt: String(question.prompt).trim(),
    options: question.options.map((option) => String(option).trim()),
    correctIndex: question.correctIndex,
    explanation: String(question.explanation).trim(),
  }));

  await updateQuiz(subjectId, savedQuiz);
  sendSuccess(res, 200, 'Evaluacion actualizada correctamente.', { quiz: savedQuiz });
});

app.patch('/api/users/:email/progress', async (req, res) => {
  const email = decodeURIComponent(req.params.email).trim().toLowerCase();
  const subjectId = req.body?.subjectId as SubjectId;
  const progress = req.body?.progress as SubjectProgress;

  const allowedSubjects = new Set(['matematica', 'historia', 'lengua', 'ciencias']);
  if (!allowedSubjects.has(subjectId) || !progress) {
    sendError(res, 400, 'Datos de progreso no validos.');
    return;
  }

  const user = await findUserByEmail(email);
  if (!user) {
    sendError(res, 404, 'Usuario no encontrado.');
    return;
  }

  const updatedUser = await updateUserProgress(email, {
    ...user.progress,
    [subjectId]: progress,
  });

  if (!updatedUser) {
    sendError(res, 404, 'Usuario no encontrado.');
    return;
  }

  sendSuccess(res, 200, 'Progreso actualizado correctamente.', { user: sanitizeUser(updatedUser) });
});

app.post('/api/users/:email/videos/:videoId/complete', async (req, res) => {
  const email = decodeURIComponent(req.params.email).trim().toLowerCase();
  const videoId = req.params.videoId;

  const user = await findUserByEmail(email);
  if (!user) {
    sendError(res, 404, 'Usuario no encontrado.');
    return;
  }

  const completed = new Set(user.completedVideoIds ?? []);
  completed.add(videoId);
  const updatedUser = await updateUserCompletedVideos(email, Array.from(completed));

  if (!updatedUser) {
    sendError(res, 404, 'Usuario no encontrado.');
    return;
  }

  sendSuccess(res, 200, 'Video marcado como completado correctamente.', { user: sanitizeUser(updatedUser) });
});

app.get('/api/videos', async (req, res) => {
  try {
    const rawVideosPath = path.join(appStoragePath, 'videos.json');
    const rawContent = await fs.readFile(rawVideosPath, 'utf-8');
    const records = JSON.parse(rawContent) as Array<{
      id: string;
      subjectId: SubjectId;
      name: string;
      type: string;
      uploadedAt: string;
      fileName: string;
    }>;

    const origin = `${req.protocol}://${req.get('host')}`;
    const videos = records.map((record) => ({
      ...record,
      url: `${origin}/app-storage/uploaded-videos/${encodeURIComponent(record.fileName)}`,
    }));

    sendSuccess(res, 200, 'Videos cargados correctamente.', { videos });
  } catch (error) {
    console.error('Error leyendo videos:', error);
    sendError(res, 500, 'No fue posible leer el listado de videos.');
  }
});

app.post('/api/videos', async (_req, res) => {
  sendError(res, 410, 'El backend no almacena videos. Los videos son gestionados por el frontend.');
});

app.delete('/api/videos/:id', async (_req, res) => {
  sendError(res, 410, 'El backend no elimina videos. Los videos son gestionados por el frontend.');
});

app.use('/api', (_req, res) => {
  sendError(res, 404, 'Ruta de API no encontrada.');
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : 'Error interno del servidor.';
  sendError(res, 500, message);
});

export default app;
