export enum ProductsSubjects {
  // Products
  create = 'products.create',
  findAll = 'products.findAll',
  findOne = 'products.findOne',
  update = 'products.update',
  delete = 'products.delete',
  search = 'products.search',

  // Categories
  createCategory = 'categories.create',
  findAllCategories = 'categories.findAll',
  findOneCategory = 'categories.findOne',
  updateCategory = 'categories.update',
  deleteCategory = 'categories.delete',

  // Allergens
  createAllergen = 'allergens.create',
  findAllAllergens = 'allergens.findAll',
  findOneAllergen = 'allergens.findOne',
  updateAllergen = 'allergens.update',
  deleteAllergen = 'allergens.delete',

  // Health
  health = 'products.health',
}

export const NATS_SERVICE = 'NATS_SERVICE';
