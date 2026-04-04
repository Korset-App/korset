export const STORE_INVENTORIES = {
  'store-one': [
    {"ean": "4600000102452", "priceKzt": 420, "shelf": "Полка C1", "stockStatus": "in_stock", "isActive": true},
    {"ean": "4600000102453", "priceKzt": 620, "shelf": "Полка C1", "stockStatus": "in_stock", "isActive": true},
    {"ean": "4600000103012", "priceKzt": 180, "shelf": "Полка C1", "stockStatus": "in_stock", "isActive": true},
    {"ean": "5000112546324", "priceKzt": 320, "shelf": "Полка B1", "stockStatus": "in_stock", "isActive": true},
    {"ean": "5000112546325", "priceKzt": 520, "shelf": "Полка B1", "stockStatus": "in_stock", "isActive": true},
    {"ean": "5000112546326", "priceKzt": 340, "shelf": "Полка B1", "stockStatus": "in_stock", "isActive": true},
    {"ean": "4890008100309", "priceKzt": 300, "shelf": "Полка B2", "stockStatus": "in_stock", "isActive": true},
    {"ean": "4870200003011", "priceKzt": 220, "shelf": "Полка B3", "stockStatus": "in_stock", "isActive": true},
    {"ean": "4870200003012", "priceKzt": 180, "shelf": "Полка A1", "stockStatus": "in_stock", "isActive": true},
    {"ean": "4870200003013", "priceKzt": 260, "shelf": "Полка A1", "stockStatus": "in_stock", "isActive": true},
    {"ean": "4870200003014", "priceKzt": 150, "shelf": "Полка A2", "stockStatus": "in_stock", "isActive": true},
    {"ean": "4870200003015", "priceKzt": 200, "shelf": "Полка A2", "stockStatus": "in_stock", "isActive": true},
    {"ean": "4870200003020", "priceKzt": 890, "shelf": "Полка D1", "stockStatus": "in_stock", "isActive": true},
    {"ean": "4870200003021", "priceKzt": 750, "shelf": "Полка D1", "stockStatus": "in_stock", "isActive": true},
    {"ean": "4870200003022", "priceKzt": 1750, "shelf": "Полка E2", "stockStatus": "in_stock", "isActive": true},
    {"ean": "4870200003023", "priceKzt": 1890, "shelf": "Полка E1", "stockStatus": "in_stock", "isActive": true},
  ],
}

export function getStoreInventory(storeSlug) {
  return STORE_INVENTORIES[storeSlug] || []
}
