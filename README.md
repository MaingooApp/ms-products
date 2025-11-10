# Products Service

Microservicio para gestión del catálogo de productos, categorías y alérgenos.

## Características

- Catálogo maestro de productos
- Gestión de categorías (Carnes, Verduras, Aseo, etc.)
- Gestión de alérgenos
- Relación productos-alérgenos

## Stack Tecnológico

- NestJS
- Prisma ORM
- PostgreSQL
- NATS (Microservicios)

## Instalación

```bash
pnpm install
```

## Variables de Entorno

Copiar `.env.example` a `.env` y configurar:

```env
PORT=3004
DATABASE_URL="postgresql://..."
NATS_SERVERS=nats://localhost:4222
```

## Base de Datos

```bash
# Generar cliente Prisma
pnpm prisma:generate

# Crear migración
pnpm prisma:migrate

# Ejecutar migraciones
npx prisma migrate deploy
```

## Ejecutar

```bash
# Desarrollo
pnpm start:dev

# Producción
pnpm build
pnpm start:prod
```

## Endpoints NATS

- `products.create` - Crear producto
- `products.findAll` - Listar productos
- `products.findOne` - Obtener producto por ID
- `products.update` - Actualizar producto
- `products.delete` - Eliminar producto
- `categories.create` - Crear categoría
- `categories.findAll` - Listar categorías
- `allergens.create` - Crear alérgeno
- `allergens.findAll` - Listar alérgenos
