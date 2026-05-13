// worker.js - Cloudflare Workers version for Mr. Priyan Motors
import { Router } from 'itty-router';

// Create router
const router = Router();

// Helper function to send responses
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// Handle CORS preflight
router.options('*', () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
});

// ============= SERVE HTML PAGES =============
async function serveHTMLFile(filename) {
  const file = await env.ASSETS.fetch(`/${filename}`);
  return file;
}

router.get('/', () => serveHTMLFile('index.html'));
router.get('/index.html', () => serveHTMLFile('index.html'));
router.get('/bikes.html', () => serveHTMLFile('bikes.html'));
router.get('/sold.html', () => serveHTMLFile('sold.html'));
router.get('/exchange.html', () => serveHTMLFile('exchange.html'));
router.get('/contact.html', () => serveHTMLFile('contact.html'));
router.get('/styles.css', () => serveHTMLFile('styles.css'));
router.get('/script.js', () => serveHTMLFile('script.js'));

// ============= API ROUTES =============
// Bikes
router.get('/api/bikes', async () => {
  // For now, return sample data
  // In production, you would fetch from MongoDB Atlas via REST API
  const sampleBikes = [
    { _id: "1", name: "Hero Glamour", price: "Rs. 290,000", price_num: 290000, year: "2020", km: "26,200 km", location: "Batticaloa", brand: "Hero", image: "https://i.ibb.co/JRzmSsHs/b1.jpg" },
    { _id: "2", name: "Apache RTR 180", price: "Rs. 350,000", price_num: 350000, year: "2014", km: "34,300 km", location: "Batticaloa", brand: "TVS", image: "https://i.ibb.co/yF2W5xJp/b2.jpg" },
    { _id: "3", name: "YAMAHA RAY ZR", price: "Rs. 490,000", price_num: 490000, year: "2018", km: "32,800 km", location: "Batticaloa", brand: "YAMAHA", image: "https://i.ibb.co/1tbJmkkr/b3.jpg" }
  ];
  return json(sampleBikes);
});

// Sold
router.get('/api/sold', async () => {
  const sampleSold = [
    { _id: "101", name: "Honda CB Shine", sold_price: "Rs. 375,000", month_year: "Feb 2025", buyer: "Mr. Ramesh", image: "https://i.ibb.co/JRzmSsHs/b1.jpg" },
    { _id: "102", name: "Yamaha FZ V3", sold_price: "Rs. 485,000", month_year: "Mar 2025", buyer: "Mrs. Santhiya", image: "https://i.ibb.co/yF2W5xJp/b2.jpg" }
  ];
  return json(sampleSold);
});

// Settings - Logo
router.get('/api/settings/logo', async () => {
  return json({ logoUrl: "https://placehold.co/400x400/1E3A8A/white?text=PM" });
});

// Social links
router.get('/api/settings/social', async () => {
  return json({ 
    whatsapp_group: "https://chat.whatsapp.com/yourinvitecode",
    facebook_page: "https://facebook.com/yourpage"
  });
});

// Login endpoint
router.post('/api/login', async (request) => {
  const { username, password } = await request.json();
  if (username === 'admin' && password === 'admin123') {
    // Generate a simple token (in production, use proper JWT)
    const token = btoa(JSON.stringify({ username, exp: Date.now() + 86400000 }));
    return json({ token, user: { username } });
  }
  return json({ error: 'Invalid credentials' }, 401);
});

// Verify token
router.get('/api/verify-token', async (request) => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return json({ valid: false }, 401);
  return json({ valid: true, user: { username: 'admin' } });
});

// Get current user
router.get('/api/me', async () => {
  return json({ username: 'admin' });
});

// 404 handler
router.all('*', () => new Response('Not Found', { status: 404 }));

// Main worker handler
export default {
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx);
  }
};