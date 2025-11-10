# Products Service

Microservicio para gestión del catálogo de productos, categorías y alérgenos con **identificación automática de alérgenos usando OpenAI**.

## 🎯 Características Principales

- ✅ Catálogo maestro de productos centralizado
- ✅ Gestión de categorías (8 categorías predeterminadas)
- ✅ Gestión de 14 alérgenos europeos (UE 1169/2011)
- ✅ **Identificación automática de alérgenos con OpenAI GPT-4**
- ✅ Integración automática con flujo de facturas
- ✅ Búsqueda inteligente por EAN, nombre, categoría
- ✅ API REST completa vía Gateway

---

## 🧠 Identificación Automática de Alérgenos con OpenAI

### ¿Cómo Funciona?

Cuando se crea un producto (automáticamente desde facturas o manualmente):

1. **El servicio analiza la descripción** del producto con OpenAI
2. **Identifica automáticamente** los alérgenos presentes según normativa UE 1169/2011
3. **Vincula los alérgenos** al producto en el catálogo
4. **Devuelve nivel de confianza** (high/medium/low) y razonamiento

### Ejemplos de Detección

```typescript
// Entrada: "Yogur natural con trozos de nueces"
// Salida: ["MILK", "NUTS"] - Confidence: high

// Entrada: "Pan de trigo integral"
// Salida: ["GLUTEN"] - Confidence: high

// Entrada: "Aceite de oliva virgen extra"
// Salida: [] - Confidence: high (sin alérgenos)

// Entrada: "Salsa de soja"
// Salida: ["SOYA", "GLUTEN"] - Confidence: high
```

### 14 Alérgenos Detectados (UE 1169/2011)

- `GLUTEN` - Cereales con gluten
- `CRUSTACEANS` - Crustáceos
- `EGGS` - Huevos
- `FISH` - Pescado
- `PEANUTS` - Cacahuetes
- `SOYA` - Soja
- `MILK` - Leche y derivados lácteos
- `NUTS` - Frutos de cáscara
- `CELERY` - Apio
- `MUSTARD` - Mostaza
- `SESAME` - Sésamo
- `SULPHITES` - Sulfitos
- `LUPIN` - Altramuces
- `MOLLUSCS` - Moluscos

---

## Stack Tecnológico

- NestJS - Framework de microservicios
- Prisma ORM - Gestión de base de datos
- PostgreSQL - Base de datos
- NATS - Message broker
- **OpenAI GPT-4o-mini** - Identificación de alérgenos

## Instalación

```bash
cd services/products
pnpm install
```

## Variables de Entorno

Copiar `.env.example` a `.env` y configurar:

```env
PORT=3004
DATABASE_URL="postgresql://products_user:products_pass@localhost:5438/products_db?schema=public"
NATS_SERVERS=nats://localhost:4222

# OpenAI (Opcional - para detección automática de alérgenos)
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini
```

> **Nota**: Si no configuras `OPENAI_API_KEY`, el servicio funcionará pero sin detección automática de alérgenos.

## Base de Datos

```bash
# Generar cliente Prisma
pnpm prisma:generate

# Ejecutar migraciones
npx prisma migrate deploy

# Cargar datos iniciales (8 categorías + 14 alérgenos)
npx prisma db seed
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

### Productos

- `products.create` - Crear producto
- `products.findAll` - Listar productos
- `products.findOne` - Obtener producto por ID
- `products.update` - Actualizar producto
- `products.delete` - Eliminar producto
- `products.findOrCreate` - Buscar o crear producto (con detección automática de alérgenos)
- **`products.identifyAllergens`** - Identificar alérgenos de una descripción

### Categorías y Alérgenos

- `categories.create` - Crear categoría
- `categories.findAll` - Listar categorías
- `allergens.create` - Crear alérgeno
- `allergens.findAll` - Listar alérgenos

---

## 🔄 Integración con Flujo de Facturas

```
1. Usuario sube factura → Documents-Analyzer
2. Azure OCR extrae líneas de productos
3. Suppliers Service recibe evento documents.analyzed
4. Para cada línea:
   ├─ Llama a products.findOrCreate
   │  ├─ Busca producto por EAN/nombre
   │  ├─ Si no existe:
   │  │  ├─ OpenAI identifica alérgenos automáticamente
   │  │  └─ Crea producto con alérgenos detectados
   │  └─ Retorna masterProductId
   └─ Vincula producto a línea de factura
5. Factura creada con productos catalogados y alérgenos identificados
```

### Ejemplo Real

```
Factura contiene: "YOGUR GRIEGO NATURAL 500g"

1. products.findOrCreate({ name: "YOGUR GRIEGO NATURAL 500g" })
2. No existe → crear nuevo producto
3. OpenAI analiza descripción
4. Detecta: allergens: ["MILK"], confidence: "high"
5. Producto creado con alérgeno vinculado
6. masterProductId retornado
```

---

## 🧪 Testing

### Probar Detección de Alérgenos

```bash
# Via NATS
nats req products.identifyAllergens '{"description":"Pan integral con semillas de sésamo"}'

# Respuesta esperada:
# {
#   "allergenCodes": ["GLUTEN", "SESAME"],
#   "allergens": [
#     { "id": "...", "name": "Gluten", "code": "GLUTEN" },
#     { "id": "...", "name": "Sésamo", "code": "SESAME" }
#   ],
#   "confidence": "high",
#   "reasoning": "Bread contains gluten, sesame seeds present"
# }
```

---

## 📝 Notas

- OpenAI es **opcional**: Sin API key, el servicio funciona pero sin detección automática de alérgenos
- **Modelo recomendado**: `gpt-4o-mini` (balance costo/calidad)
- **Timeout**: 30 segundos por análisis
- **Normativa**: Cumple con Reglamento UE 1169/2011 (14 alérgenos principales)
