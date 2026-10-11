// Read-only database snapshot captured on 2026-10-04; browser responses are isolated.
export const liveSnapshots = {
  bereke: {
    name: 'Береке',
    published: false,
    products: 18,
    scans: 0,
    customers: 0,
    coverage: 0,
    lost: 0,
    top: [],
    comparisons: { total_count: 0, winner_count: 0, draw_count: 0, blocked_count: 0 },
  },
  mars: {
    name: 'MARS',
    published: true,
    products: 21526,
    scans: 7,
    customers: 0,
    coverage: 100,
    lost: 0,
    top: [
      {
        ean: '8887290101004',
        name: 'Кофе MacCoffee 3в1 20г',
        scan_count: 7,
        image_url:
          'https://semeiniy.kz/wa-data/public/shop/products/56/92/119256/images/37799/37799.700.jpg',
      },
    ],
    comparisons: {
      total_count: 9,
      winner_count: 3,
      draw_count: 6,
      blocked_count: 0,
      top_ean_a: '2000000063881',
      top_ean_b: '2000000064017',
      top_pair_count: 3,
    },
  },
}
