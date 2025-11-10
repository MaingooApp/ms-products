import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Crear categorías
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Carnes' },
      update: {},
      create: { name: 'Carnes', description: 'Carnes y productos cárnicos' },
    }),
    prisma.category.upsert({
      where: { name: 'Verduras' },
      update: {},
      create: { name: 'Verduras', description: 'Verduras y hortalizas' },
    }),
    prisma.category.upsert({
      where: { name: 'Pescados y Mariscos' },
      update: {},
      create: { name: 'Pescados y Mariscos', description: 'Pescados frescos y mariscos' },
    }),
    prisma.category.upsert({
      where: { name: 'Lácteos' },
      update: {},
      create: { name: 'Lácteos', description: 'Productos lácteos' },
    }),
    prisma.category.upsert({
      where: { name: 'Aseo' },
      update: {},
      create: { name: 'Aseo', description: 'Productos de limpieza y aseo' },
    }),
    prisma.category.upsert({
      where: { name: 'Bebidas' },
      update: {},
      create: { name: 'Bebidas', description: 'Bebidas alcohólicas y no alcohólicas' },
    }),
    prisma.category.upsert({
      where: { name: 'Panadería' },
      update: {},
      create: { name: 'Panadería', description: 'Pan y productos de panadería' },
    }),
    prisma.category.upsert({
      where: { name: 'Conservas' },
      update: {},
      create: { name: 'Conservas', description: 'Productos en conserva' },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // Crear alérgenos (según normativa europea)
  const allergens = await Promise.all([
    prisma.allergen.upsert({
      where: { code: 'GLU' },
      update: {},
      create: { name: 'Gluten', code: 'GLU', description: 'Cereales que contienen gluten' },
    }),
    prisma.allergen.upsert({
      where: { code: 'CRU' },
      update: {},
      create: { name: 'Crustáceos', code: 'CRU', description: 'Crustáceos y productos derivados' },
    }),
    prisma.allergen.upsert({
      where: { code: 'EGG' },
      update: {},
      create: { name: 'Huevos', code: 'EGG', description: 'Huevos y productos derivados' },
    }),
    prisma.allergen.upsert({
      where: { code: 'FISH' },
      update: {},
      create: { name: 'Pescado', code: 'FISH', description: 'Pescado y productos derivados' },
    }),
    prisma.allergen.upsert({
      where: { code: 'PEA' },
      update: {},
      create: {
        name: 'Cacahuetes',
        code: 'PEA',
        description: 'Cacahuetes y productos derivados',
      },
    }),
    prisma.allergen.upsert({
      where: { code: 'SOY' },
      update: {},
      create: { name: 'Soja', code: 'SOY', description: 'Soja y productos derivados' },
    }),
    prisma.allergen.upsert({
      where: { code: 'MILK' },
      update: {},
      create: {
        name: 'Lácteos',
        code: 'MILK',
        description: 'Leche y productos derivados (incluida lactosa)',
      },
    }),
    prisma.allergen.upsert({
      where: { code: 'NUTS' },
      update: {},
      create: {
        name: 'Frutos de cáscara',
        code: 'NUTS',
        description: 'Frutos de cáscara (almendras, avellanas, nueces, etc.)',
      },
    }),
    prisma.allergen.upsert({
      where: { code: 'CEL' },
      update: {},
      create: { name: 'Apio', code: 'CEL', description: 'Apio y productos derivados' },
    }),
    prisma.allergen.upsert({
      where: { code: 'MUS' },
      update: {},
      create: { name: 'Mostaza', code: 'MUS', description: 'Mostaza y productos derivados' },
    }),
    prisma.allergen.upsert({
      where: { code: 'SES' },
      update: {},
      create: {
        name: 'Sésamo',
        code: 'SES',
        description: 'Granos de sésamo y productos derivados',
      },
    }),
    prisma.allergen.upsert({
      where: { code: 'SUL' },
      update: {},
      create: {
        name: 'Sulfitos',
        code: 'SUL',
        description: 'Dióxido de azufre y sulfitos',
      },
    }),
    prisma.allergen.upsert({
      where: { code: 'LUP' },
      update: {},
      create: { name: 'Altramuces', code: 'LUP', description: 'Altramuces y productos derivados' },
    }),
    prisma.allergen.upsert({
      where: { code: 'MOL' },
      update: {},
      create: { name: 'Moluscos', code: 'MOL', description: 'Moluscos y productos derivados' },
    }),
  ]);

  console.log(`✅ Created ${allergens.length} allergens`);

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
