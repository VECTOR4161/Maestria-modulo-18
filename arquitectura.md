# Arquitectura del backend `backend-becas-v2`

> Este documento describe el estado del código al 2026-10-09: cómo está organizado el backend y qué reglas sigue hoy. Las sugerencias de cambio están en [`mejoras.md`](./mejoras.md).

## 1. Stack

| Pieza | Tecnología |
|---|---|
| Framework | NestJS 11 (Express) |
| Lenguaje | TypeScript, con el alias `@src/*` → `src/*` |
| Persistencia | TypeORM 1.x sobre PostgreSQL 16 (`autoLoadEntities`; `synchronize` activo solo fuera de producción) |
| Archivos | MinIO (bucket `becas-documentos`) |
| Autenticación | Google OAuth (`google-auth-library`) y JWT propio (`jsonwebtoken`), con *access* y *refresh* |
| Integraciones | API SCD de la UCB (`@nestjs/axios`) |
| Pruebas | Jest 30 con ts-jest |
| Lint y formato | ESLint 9 (flat config) y Prettier |
| Despliegue | `Dockerfile` multi-stage (node 22-alpine, puerto 3800) y `docker-compose.yaml` (Postgres y MinIO para desarrollo) |

## 2. Raíz del repositorio

```
backend-becas-v2/
├── src/                     Código fuente (ver §3)
├── test/                    Pruebas unitarias; replica el árbol de src/ (ver §9)
├── BecasV2-1.sql            Esquema SQL de referencia
├── seed-estadoetapa.sql     Semilla del catálogo de estados de etapa
├── endpoints.json           Colección de endpoints (referencia manual)
├── .env / .env.template     Variables de entorno (.env no se versiona)
├── Dockerfile, docker-compose.yaml
├── eslint.config.mjs, .prettierrc, nest-cli.json, tsconfig*.json
└── package.json
```

## 3. Estructura de `src/`

```
src/
├── main.ts                  Arranque
├── app.module.ts            Módulo raíz
├── config/                  Configuración por variables de entorno
├── shared/                  Lo transversal a todos los slices
└── BoundedContext/
    └── Formularios/         Único contexto: 30 slices (ver §4)
```

### 3.1 `main.ts`

El arranque hace lo siguiente:

- Fija el prefijo global `api` y el versionado por URI. Por eso todas las rutas tienen la forma `/api/v1/<recurso>`.
- Llama a `validarEntorno()`: si falta una variable obligatoria (`DATABASE_*`, `JWT_*`, `GOOGLE_*`), el arranque falla con un mensaje que las nombra.
- Habilita CORS para los orígenes de `CORS_ORIGINS`. Si la variable está vacía acepta cualquiera, y eso solo es aceptable en desarrollo.
- Registra el filtro global `ExcepcionNoControladaFilter` (ver §5.6) y el `LoggingInterceptor`.
- Escucha en `EnvConfiguration().port` (`PORT`, 3800 por defecto).

### 3.2 `app.module.ts`

- Carga `ConfigModule` con `EnvConfiguration` y `TypeOrmModule.forRootAsync`, que lee el bloque `Orm` de `ConfigService`.
- Importa el `*Module` de cada slice, uno por uno.
- No declara controladores ni providers propios.

### 3.3 `config/`

`env.config.ts` expone `EnvConfiguration()`. Lee las variables con funciones auxiliares que recortan espacios y aplican valores por defecto: `getEnvValue`, `getEnvNumber` y `getEnvBoolean`. Agrupa la configuración en estos bloques:

| Bloque | Variables |
|---|---|
| `minio` | `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET_NAME`, `MINIO_URL_EXPIRACION_SEGUNDOS` |
| `google` | `GOOGLE_ID_CLIENTE` (o `GOOGLE_CLIENT_ID`), `GOOGLE_CLIENT_SECRET` |
| `jwt` | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN` (15m), `JWT_REFRESH_EXPIRES_IN` (15d) |
| `SCD` | `SCD_API`, `SCD_TOKEN` |
| `Orm` | `DATABASE_HOST`, `DATABASE_PORT` (5432), `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DATABASE_SYNCHRONIZE` (por defecto `true` salvo con `NODE_ENV=production`) |
| `port`, `corsOrigins` | `PORT` (3800) y `CORS_ORIGINS` (lista separada por comas) |

`validarEntorno()` exige `DATABASE_HOST`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_ID_CLIENTE` (o `GOOGLE_CLIENT_ID`) y `GOOGLE_CLIENT_SECRET`.

### 3.4 `shared/`

Lo que no pertenece a ningún slice. Se importa desde `@src/shared`.

```
shared/
├── domain/
│   ├── Roles.ts             ROLES = { estudiante:1, revisor:2, asistente:3, analista:4,
│   │                        comite:5, asignador:6, administrador:7, superAdministrador:8 },
│   │                        ROLES_PERSONAL_DE_BECAS y los helpers esEstudiante,
│   │                        esPersonalDeBecas y esAdministrador
│   ├── Error/               BaseException, DomainException (errores de negocio y de validación)
│   │                        y SystemException (errores internos)
│   └── value-objects/       Identificador (clase base; hoy ningún XId la usa)
├── application/
│   ├── dtos/pagination/     PaginatedResponse<T> = { data, skip, limit, total, hasMore }
│   └── validation/          Validador: validaciones estáticas para los DTO de entrada
└── Presentation/
    ├── Guards/              TokenGuard (JWT) y RolesGuard (@Roles)
    ├── Decorators/          @Roles(...ids) y @CurrentUser(campo?)
    ├── Filters/             BaseExceptionFilter y ExcepcionNoControladaFilter (último recurso)
    └── Interceptors/        LoggingInterceptor (método, ruta, estado, duración y usuario)
```

## 4. El contexto `BoundedContext/Formularios`

Todo el dominio vive en un único contexto. Cada carpeta es un **slice** (un agregado o una tabla) con sus cuatro capas. Agrupados por tema, los slices son:

| Tema | Slices |
|---|---|
| Catálogos | `Periodo`, `Rol`, `EstadoEtapa`, `Departamento`, `Carrera`, `Beca`, `Formulario`, `Preguntas` |
| Configuración | `Convocatoria`, `FormulariosBeca`, `ConfiguracionBeca` |
| Usuarios y acceso | `Usuario` (con la integración SCD), `Auth`, `BecaUsuario`, `CarreraUsuario` |
| Postulación | `Postulacion` (el slice central, con 18 casos de uso), `PostulacionBeca`, `PostulacionFormularios`, `FormularioEntregado`, `DocumentoEntregado` (MinIO), `Respuestas` |
| Revisión por etapas | `EtapaPostulacion`, `Observaciones`, `Notas` (bitácora de cambios), `Ampliacion` (plazos), `Auditoria` |
| Cierre | `Historico`, `Resolucion`, `ResolucionHistorico`, `Asignacion` |

### 4.1 Anatomía de un slice

Toma `Beca` como ejemplo:

```
Beca/
├── Domain/
│   ├── Aggregates/Beca.ts            Agregado: constructor privado y los métodos
│   │                                 estáticos crear(...) y restaurar(...)
│   ├── ValueObjects/BecaId.ts, TipoBeca.ts
│   ├── Constants/                    (en otros slices) reglas de negocio declarativas
│   └── index.ts                      barrel
├── Application/
│   ├── Dtos/                         *Request (entrada) y *Response (salida)
│   ├── Datasources/BecaDatasource.ts       clase abstracta (puerto de persistencia)
│   ├── Repositories/BecaRepository.ts      clase abstracta (puerto usado por los casos de uso)
│   ├── Services/                     (en otros slices) funciones de aplicación compartidas
│   ├── UseCases/*UseCase.ts          un archivo por caso de uso, con su interfaz I*UseCase
│   └── index.ts
├── Infrastructure/
│   ├── Persistence/TypeOrm/BecaTOModel.ts  entidad TypeORM (@Entity)
│   ├── Persistence/TypeOrm/BecaTOMapper.ts toPersistence, toDomain y toXResponse
│   ├── Datasources/BecaDatasourceImpl.ts   implementación con TypeORM
│   ├── Repositories/BecaRepositoryImpl.ts  delega en el datasource
│   └── index.ts
└── Presentation/
    ├── Controllers/V1/BecaControllerV1.ts
    ├── Modules/BecaModule.ts
    └── index.ts
```

### 4.2 Responsabilidad de cada capa

| Capa | Hace | No hace |
|---|---|---|
| **Domain** | Agregados con sus invariantes y transiciones. Value objects (`*Id`, estados). Constantes de reglas: estados por etapa, transiciones, dictamen del Comité, revisión especial. | No importa NestJS ni TypeORM. |
| **Application** | Puertos (`Datasource` y `Repository` como clases abstractas), casos de uso, DTO de entrada y salida, servicios de aplicación (por ejemplo `exigirPropiedadDePostulacion`, `LineaDeEtapasDeMiPostulacion`). | No conoce el ORM ni HTTP. |
| **Infrastructure** | Entidades TypeORM (`*TOModel`), mappers (`*TOMapper`), implementaciones de datasources y repositorios, transacciones, integraciones (MinIO, Google, SCD). | No contiene reglas de negocio nuevas. |
| **Presentation** | Controladores HTTP (`*ControllerV1`), guards y decoradores por ruta, el módulo Nest del slice. | No contiene lógica. Solo arma el DTO, instancia el caso de uso y lo ejecuta. |

### 4.3 Flujo de una petición

```
HTTP → TokenGuard → RolesGuard → Controller
     → XRequest.createFromRequest(body)    (validación con Validador → 400)
     → new XUseCase(repos...).execute(dto)
         → Repository (abstracto) → RepositoryImpl → DatasourceImpl → TypeORM
         → Mapper.toDomain → Agregado → XResponse.createFromAggregate
     ← JSON del DTO (sin envoltorio)
Errores: BaseException → BaseExceptionFilter → { codigo, tipo, message, timestamp }
```

### 4.4 Repositorio y datasources

El **repositorio es el punto de entrada** a los datos del slice: los casos de uso solo conocen `XRepository` y nunca un datasource. El datasource es la implementación concreta del acceso (TypeORM, MinIO, Google, SCD).

- Con un solo datasource, el repositorio delega en él. Esta capa es intencional, aunque hoy sea un paso directo.
- Si un slice separa sus datasources, por ejemplo uno de lectura y otro de escritura, o uno local y otro externo, el repositorio los **orquesta**. Los casos de uso no cambian.

### 4.5 Inyección de dependencias

- **Providers:** cada `*Module` registra `{ provide: XDatasource, useClass: XDatasourceImpl }` y `{ provide: XRepository, useClass: XRepositoryImpl }`, y hace `TypeOrmModule.forFeature([XTOModel])`.
- **Exportaciones entre slices:** un slice que necesita a otro importa su módulo. El módulo dueño **exporta solo el `Repository` abstracto**; por ejemplo, `BecaModule` exporta `BecaRepository` para Postulación.
- **Casos de uso:** **no son providers**. Los instancia el controlador en cada petición, pasándoles los repositorios que recibió por constructor.

## 5. Reglas y convenciones

### 5.1 Nombres e idioma

- **Idioma:** el vocabulario de negocio está en español (`crear`, `obtenerPorId`, `Postulacion`). Los sufijos técnicos están en inglés (`UseCase`, `Repository`, `Datasource`, `Request`, `Response`).
- **Archivos:** usan PascalCase y se llaman igual que la clase que contienen.
- **Persistencia:** las entidades TypeORM llevan el sufijo `TOModel` y sus mappers `TOMapper`. Las tablas y columnas están en snake_case (`id_convocatoria`) y se mapean a camelCase.
- **Barrels:** cada capa exporta todo por su `index.ts`. Entre slices se importa con `@src/BoundedContext/Formularios/<Slice>/<Capa>`.
- **Comentarios:** se usan `//*` para notas en el código y JSDoc para describir el contrato.

### 5.2 Agregados y value objects

- **Construcción:** el constructor es privado. `crear(...)` crea una instancia nueva (id `null`, `borrado: false`) y `restaurar(...)` la reconstruye desde la persistencia.
- **Identificadores:** son clases `XId` con un `value: number`.
- **Estados:** son value objects con fábrica estática, por ejemplo `EstadoPostulacion.aprobada()` y `EstadoAsignacion.create(texto)`. Un valor inválido lanza `DomainException(400)`.
- **Cambios auditables:** el agregado los anota (`getCambiosSinRegistrar()`) y el datasource los guarda como `notas` en la misma transacción.

### 5.3 DTO y validación

- **Entrada:** el controlador recibe `@Body() body: Record<string, any>`. `XRequest.createFromRequest(body)` valida cada campo con `Validador.textoRequerido`, `numeroRequerido`, `booleanoRequerido`, etc. Si algo falla, lanza `DomainException(400)`.
- **Salida:** clases con campos `private`, construidas con `createFromValues(...)` o `createFromAggregate(...)`. Se serializan tal cual, **sin envoltorio** `{ data }`.
- **Paginación:** la consulta recibe `skip`, `limit` y `search`, con valores por defecto 0, 10 y `""`. La respuesta es un `PaginatedResponse<T>`.

### 5.4 Rutas y controladores

- **Declaración:** `@Controller({ path: "<recurso>", version: "1" })` y `@UseGuards(TokenGuard, RolesGuard)` a nivel de clase. **Todo controlador debe llevar los guards**; un controlador nuevo sin ellos queda abierto a cualquiera.
- **Parámetros de ruta:** los ids numéricos se declaran `@Param("id", ParseIntPipe) id: number`. Un id no numérico responde 400.
- **Orden:** las rutas estáticas (`/mis-postulaciones`, `/etapas/resumen`) se declaran **antes** que las rutas con `:id`.
- **Roles:** `@Roles(ROLES.x, ...)` por método. Sin `@Roles`, basta con estar autenticado. También se puede poner a nivel de clase; `RolesGuard` lo lee de ambos sitios. Los controladores de tablas intermedias y de auditoría (`Historico`, `Respuestas`, `Auditoria`, `ResolucionHistorico`, `BecaUsuario`, `CarreraUsuario`) lo llevan solo para administradores.
- **Usuario actual:** se obtiene con `@CurrentUser()`, que devuelve `UsuarioAutenticado { idUsuario, rol }`, o con `@CurrentUser("idUsuario")`. Es siempre un usuario, nunca `null`: si la ruta no tiene `TokenGuard`, el decorador responde 401.
- **Propiedad:** la de las postulaciones se exige con `exigirPropiedadDePostulacion` y `exigirAccesoAPostulacion`.

### 5.5 Autenticación

1. `POST /api/v1/auth/login` valida el token de Google, ubica o crea al usuario (consultando SCD) y emite un *access token* y un *refresh token*.
2. `POST /api/v1/auth/refresh-token` renueva el *access token*.
3. `TokenGuard` exige `Authorization: Bearer <jwt>` firmado con `JWT_ACCESS_SECRET`, con los claims `{ idUsuario, rol, tipo: "access" }`. Deja el resultado en `request.usuarioAutenticado`.
4. `RolesGuard` compara `rol` con los ids que declara `@Roles`. Requiere que `TokenGuard` se haya ejecutado antes.

### 5.6 Errores

- **Excepciones:** `DomainException.throwException(status, mensaje)` se usa para errores de negocio y de validación (400, 403, 404, 409…). `SystemException` se usa para fallas internas.
- **Formato de respuesta:** `BaseExceptionFilter` captura `BaseException` y responde `{ codigo, tipo, message, timestamp }`. Si el código no es un HTTP válido, lo degrada a 500.
- **Filtro de último recurso:** `ExcepcionNoControladaFilter` es el único filtro global. Delega las `BaseException` en `BaseExceptionFilter`, deja pasar las `HttpException` de Nest (ruta inexistente, `ParseIntPipe`) con su cuerpo original, y registra cualquier otro error con su ruta y su traza. A esos últimos responde 500 con el mismo formato y un mensaje genérico, sin filtrar el detalle al cliente.

### 5.7 Persistencia

- **Esquema:** TypeORM lo sincroniza automáticamente mientras `DATABASE_SYNCHRONIZE` sea verdadero, y lo es por defecto fuera de producción. **No hay migraciones**, así que en producción el esquema se aplica a mano o se activa la variable de forma explícita. `BecasV2-1.sql` y `seed-estadoetapa.sql` son la referencia manual.
- **Borrado lógico:** se usa la columna `borrado`. Las consultas filtran `borrado = false`, y los índices únicos son parciales (`where "borrado" = false`).
- **Catálogo de estados de etapa** (`estadoetapa`): se resuelve **por nombre**, sin distinguir tildes ni mayúsculas (`mismoEstado`, `normalizarNombreDeEstado`), y nunca por id, porque los ids dependen de cómo se cargó cada base.
- **Transacciones:** se abren en el datasource con `repository.manager.transaction(...)`. Dentro de una transacción se usa el `manager` recibido.
- **Consultas de lectura para pantallas:** algunas devuelven directamente DTO de respuesta desde el datasource, sin pasar por el agregado. Ejemplos: `obtenerDeUsuario`, `obtenerPorEtapa` y los conteos.

### 5.8 Reglas de negocio centrales

Las reglas de negocio están declaradas como constantes en `Domain/Constants` de cada slice:

- **`EtapaPostulacion/Domain/Constants`:**
  - `TOTAL_ETAPAS = 4`.
  - `ESTADOS_POR_ETAPA`.
  - `TRANSICIONES_POR_ETAPA` (máquina de estados de las etapas 1 a 3).
  - `ESTADO_QUE_HABILITA_LA_SIGUIENTE_ETAPA = "Aprobado"`.
  - `DictamenDeComite`.
  - `RevisionEspecial` (el camino corto de las becas sin revisión especial).
- **Ciclo de una postulación:** se crea con 4 filas en `etapapostulacion` en estado "En Revision". La etapa N está disponible para su revisor solo cuando la etapa N-1 está "Aprobado".
- **Etapa 4 (Comité):** al aprobar, escribe el `porcentaje` y crea el `historico`. Luego la resolución la pasa a "Otorgados".
- **Etapa 5 (Asignación):** no tiene fila propia. Se modela como `historico` → `asignacion` → `departamento`.
- **Bitácora:** `Notas` registra cada cambio de estado (`nota_de_sistema`) y las notas escritas por los revisores (`nota_de_etapa`).

## 6. Dependencias entre slices

- **Por Application:** un slice usa otro a través de su `Application`, es decir, su repositorio abstracto o sus servicios. Postulación, por ejemplo, depende de `Beca`, `EtapaPostulacion`, `EstadoEtapa`, `Formulario`, `Notas`, etc.
- **Por Infrastructure:** también hay importaciones de la `Infrastructure` de otros slices. Son unas 140 y de tres clases:
  - **Relaciones de TypeORM (86):** en los `*TOModel`, porque `@ManyToOne` y similares apuntan a la entidad del otro slice. Son inevitables.
  - **Módulos (5):** `TypeOrmModule.forFeature` de entidades ajenas.
  - **Consultas y escrituras conjuntas (el resto):** `PostulacionDatasourceImpl`, por ejemplo, usa `NotasTOModel`, `EtapaPostulacionTOModel` y `HistoricoTOModel` para unir tablas o escribir en la misma transacción. Hay 20 archivos en este grupo y están **declarados** en `test/architecture/AcoplamientoEntreSlices.spec.ts`.
- **Reglas que hace cumplir esa prueba:**
  - `Domain` y `Application` no importan `Infrastructure` ni `Presentation`, de ningún slice.
  - `Domain` no importa `Application`.
  - Un archivo que no sea `*TOModel` ni `*Module` no puede importar la `Infrastructure` de otro slice, salvo los 20 declarados. Tampoco puede ampliar los slices de su entrada.
  - La lista declarada solo puede achicarse: si se elimina un acoplamiento, hay que quitarlo de ella.
- **Datos de otro slice:** se piden al `Repository` que ese slice exporta. Un caso concreto: `AuthModule` importa `UsuarioModule`, que exporta `UsuarioRepository` y `ScdRepository`, en lugar de volver a declarar sus datasources.

## 7. Endpoints

- **Forma:** las rutas siguen el patrón `/api/v1/<recurso>`, con los verbos `GET`, `POST`, `PUT` y `DELETE`. El borrado es lógico.
- **Referencia:** `endpoints.json` contiene una colección manual. No hay Swagger ni OpenAPI generados.

## 8. Cómo agregar un slice nuevo

1. **Domain:** crear `src/BoundedContext/Formularios/<Slice>/` con el agregado (`crear` y `restaurar`), su `XId` y los value objects.
2. **Application:**
   - `XDatasource` y `XRepository` como clases abstractas.
   - Los DTO `Request` (con `createFromRequest` y `Validador`) y `Response` (con `createFromValues` o `createFromAggregate`).
   - Un `*UseCase` por operación.
3. **Infrastructure:**
   - `XTOModel` con `@Entity`, columnas snake_case y `borrado`.
   - `XTOMapper`, `XDatasourceImpl` y `XRepositoryImpl`.
4. **Presentation:**
   - `XControllerV1` con `@UseGuards(TokenGuard, RolesGuard)` y `@Roles` en cada método.
   - `XModule` con `forFeature`, los providers y los exports necesarios.
5. **Registro:** importar `XModule` en `app.module.ts`.
6. **Barrels:** crear los `index.ts` en cada capa.
7. **Pruebas:** crearlas en `test/BoundedContext/Formularios/<Slice>/...`, replicando la ruta del archivo probado.

## 9. Pruebas

- **Configuración:** está en `package.json` (`jest`). Los archivos de prueba se buscan con `testMatch` en `src/**/*.spec.ts` y `test/**/*.spec.ts`, y el alias se resuelve con `moduleNameMapper` (`^@src/(.*)$`).
- **Ubicación:** `test/` replica `src/`: `test/BoundedContext/Formularios/<Slice>/{Application,Domain,Infrastructure,Presentation}/...spec.ts` y `test/shared/`.
- **Estilo:**
  - Pruebas unitarias con mocks (`jest.fn`) de repositorios y del `Repository` de TypeORM.
  - Los QueryBuilder se simulan como cadenas que registran sus argumentos.
  - No hay pruebas e2e activas (`test/jest-e2e.json` es la plantilla de Nest).
- **Estado al 2026-10-09:** 310 suites y 2533 pruebas, todas en verde. Aun así, `tsc --noEmit -p tsconfig.json` (que incluye `test/`) da 56 errores de tipos en mocks desactualizados que Jest no detecta. El código de `src/` compila sin errores.

## 10. Scripts

| Script | Uso |
|---|---|
| `npm run start:dev` | Desarrollo con recarga |
| `npm run build` / `start:prod` | Compilar a `dist/` y ejecutar |
| `npm test` | Jest |
| `npm run lint` | ESLint en solo lectura |
| `npm run lint:fix` | ESLint con `--fix`: reescribe archivos |
| `npm run format` | Prettier sobre `src` y `test` |
