# Products Microservice - Setup Complete ✅

El microservicio de **products** ha sido creado exitosamente con la siguiente estructura:

## 📁 Estructura

```
services/products/
├── prisma/
│   ├── schema.prisma       # Schema con Product, Category, Allergen
│   └── seed.ts             # Datos iniciales (categorías y alérgenos)
├── src/
│   ├── config/             # Configuración y subjects NATS
│   ├── common/             # Excepciones y utilidades
│   ├── transports/         # NATS module
│   ├── modules/
│   │   ├── products/       # CRUD de productos
│   │   ├── categories/     # CRUD de categorías
│   │   └── allergens/      # CRUD de alérgenos
│   ├── app.module.ts
│   └── main.ts
├── Dockerfile
├── dockerfile.prod
└── package.json
```

## 🚀 Para iniciar el servicio

### 1. Instalar dependencias
```bash
cd services/products
pnpm install
```

### 2. Generar Prisma Client
```bash
pnpm prisma:generate
```

### 3. Crear y ejecutar migraciones
```bash
pnpm prisma:migrate
```

### 4. Poblar base de datos (seed)
```bash
npx prisma db seed
```

### 5. Levantar con Docker
```bash
# Desde la raíz del proyecto
docker-compose up -d pg-products products
```

## 📊 Base de Datos

- **Puerto**: 5438
- **Database**: products_db
- **User**: products_user
- **Password**: products_pass

## 🎯 Endpoints NATS Disponibles

### Productos
- `products.create` - Crear producto
- `products.findAll` - Listar productos (con filtros)
- `products.findOne` - Obtener producto por ID
- `products.update` - Actualizar producto
- `products.delete` - Eliminar producto

### Categorías
- `categories.create` - Crear categoría
- `categories.findAll` - Listar categorías
- `categories.findOne` - Obtener categoría
- `categories.update` - Actualizar categoría
- `categories.delete` - Eliminar categoría

### Alérgenos
- `allergens.create` - Crear alérgeno
- `allergens.findAll` - Listar alérgenos
- `allergens.findOne` - Obtener alérgeno
- `allergens.update` - Actualizar alérgeno
- `allergens.delete` - Eliminar alérgeno

### Health Check
- `products.health` - Estado del servicio

## 📝 Datos Iniciales (Seed)

El seed incluye:

**8 Categorías:**
- Carnes
- Verduras
- Pescados y Mariscos
- Lácteos
- Aseo
- Bebidas
- Panadería
- Conservas

**14 Alérgenos** (normativa europea):
- Gluten (GLU)
- Crustáceos (CRU)
- Huevos (EGG)
- Pescado (FISH)
- Cacahuetes (PEA)
- Soja (SOY)
- Lácteos (MILK)
- Frutos de cáscara (NUTS)
- Apio (CEL)
- Mostaza (MUS)
- Sésamo (SES)
- Sulfitos (SUL)
- Altramuces (LUP)
- Moluscos (MOL)

## 🔗 Integración con Suppliers Service

El `SupplierProduct` en suppliers-service tiene el campo `masterProductId` que apunta a los productos de este servicio (sin FK, solo ID como string).

Flujo:
1. Crear productos maestros en products-service
2. Cuando llega una factura, mapear productos del proveedor → productos maestros
3. Consultar via NATS para obtener detalles del producto

## 📋 Próximos pasos sugeridos

1. ✅ **Crear módulo en Gateway** para exponer productos via REST API
2. ✅ **Implementar búsqueda** de productos por nombre/EAN
3. ✅ **Agregar paginación** en listados
4. ✅ **Integrar con documents-analyzer** para sugerir productos al procesar facturas
5. ✅ **Dashboard** de productos más comprados

¿Necesitas ayuda con alguno de estos pasos?
