/**
 * OST Dashboard Router
 * Auto-detects merchant's business type and redirects to correct dashboard
 * Include this script in admin/index.html
 */

const DASHBOARD_MAP = {
  fashion:     'dashboards/fashion.html',
  electronics: 'dashboards/electronics.html',
  food:        'dashboards/food.html',
  beauty:      'dashboards/beauty.html',
  health:      'dashboards/beauty.html',     // shared with beauty
  agriculture: 'dashboards/agriculture.html',
  services:    'dashboards/services.html',
  jewelry:     'dashboards/beauty.html',     // shared with beauty
  art:         'dashboards/beauty.html',     // shared with beauty
  home:        'dashboards/electronics.html', // shared
  sports:      'dashboards/electronics.html', // shared
  automotive:  'dashboards/electronics.html', // shared
  babies:      'dashboards/beauty.html',
  other:       null // use default dashboard
};

async function routeToDashboard() {
  const token = localStorage.getItem('ost_token');
  if (!token) return;

  // Check if we already routed (avoid infinite redirect)
  if (window.location.pathname.includes('/dashboards/')) return;

  try {
    const data = await fetch('https://ost-tz.onrender.com/api/stores/owner/my-store', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());

    if (data.success && data.store) {
      const category = data.store.category;
      const dashPath = DASHBOARD_MAP[category];

      if (dashPath) {
        // Store the category for the dashboard page to use
        sessionStorage.setItem('ost_store_category', category);
        sessionStorage.setItem('ost_store_id', data.store._id);
        sessionStorage.setItem('ost_store_name', data.store.name);

        // Redirect to specific dashboard
        window.location.replace(dashPath);
      }
    }
  } catch(e) {
    console.log('Dashboard router: Could not detect store type');
  }
}

// Run on load
routeToDashboard();
