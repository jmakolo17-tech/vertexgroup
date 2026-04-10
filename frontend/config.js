/**
 * Vertex Group Africa — Frontend API Config
 * Auto-detects production vs local development.
 * In production, update PROD_API below to your Render backend URL.
 */
(function () {
  const PROD_API = 'https://vertex-africa-api.onrender.com';
  const is_local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  window.VERTEX_API_BASE = is_local ? 'http://localhost:5001' : PROD_API;
})();
