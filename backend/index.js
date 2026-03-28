const http = require('http');
const { Pool } = require('pg');

// Initialize PostgreSQL connection pool using environment variables typically provided by GCP Cloud Run / Cloud SQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || '/cloudsql/your-project-id:your-region:your-instance-name',
  database: process.env.DB_NAME || 'gdg_shirt_drop',
  password: process.env.DB_PASSWORD || 'password',
  // Cloud SQL Unix sockets don't use port, but fallback to 5432 if using TCP
  port: parseInt(process.env.DB_PORT) || 5432, 
});

const server = http.createServer(async (req, res) => {
  // CORS Headers for API requests
  const headers = {
    'Access-Control-Allow-Origin': '*', // Adjust to specific Cloud Storage domain in production
    'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  // Handle the /api/buy endpoint
  if (req.url === '/api/buy' && req.method === 'POST') {
    try {
      // Execute the atomic update. This query natively prevents the stock from dropping below zero.
      const queryText = `
        UPDATE inventory 
        SET stock = stock - 1 
        WHERE id = 'founders-edition' AND stock > 0
        RETURNING stock;
      `;
      
      const { rowCount, rows } = await pool.query(queryText);

      // If rowCount is 1, a shirt was successfully secured
      if (rowCount === 1) {
        res.writeHead(200, headers);
        res.end(JSON.stringify({
          success: true,
          message: 'Shirt ordered successfully!',
          remainingStock: rows[0].stock
        }));
      } else {
        // If rowCount is 0, the check (stock > 0) failed, meaning we sold out
        res.writeHead(400, headers);
        res.end(JSON.stringify({
          success: false,
          message: 'Sold Out! No more shirts available.',
        }));
      }
    } catch (error) {
      console.error('Database Error:', error);
      res.writeHead(500, headers);
      res.end(JSON.stringify({ success: false, message: 'Internal Server Error' }));
    }
  } else {
    res.writeHead(404, headers);
    res.end(JSON.stringify({ success: false, message: 'Route Not Found' }));
  }
});

const PORT = process.env.PORT || 8080; // Cloud Run injects PORT 8080
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
