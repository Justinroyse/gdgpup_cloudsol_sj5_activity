const http = require('http');
const { Pool } = require('pg');

// Initialize PostgreSQL connection pool using environment variables typically provided by GCP Cloud Run / Cloud SQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || '/cloudsql/your-project-id:your-region:your-instance-name',
  database: process.env.DB_NAME || 'gdg_paskuhan',
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
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { email, quantity } = payload;
        
        if (!email || typeof email !== 'string' || !email.includes('@')) {
          res.writeHead(400, headers);
          return res.end(JSON.stringify({ success: false, message: 'Invalid email address' }));
        }
        
        const qty = parseInt(quantity, 10);
        if (isNaN(qty) || qty < 1 || qty > 3) {
          res.writeHead(400, headers);
          return res.end(JSON.stringify({ success: false, message: 'Invalid quantity. Max 3 allowed.' }));
        }

        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          
          // Verify customer limits
          const { rows: orderRows } = await client.query(
            'SELECT total_quantity FROM customer_orders WHERE email = $1 FOR UPDATE',
            [email]
          );
          
          let currentQty = 0;
          if (orderRows.length > 0) {
            currentQty = orderRows[0].total_quantity;
          }
          
          if (currentQty + qty > 3) {
            await client.query('ROLLBACK');
            res.writeHead(400, headers);
            return res.end(JSON.stringify({ success: false, message: 'Limit Reached: You can only order up to 3 shirts total.' }));
          }
          
          // Verify and decrement stock atomically
          const { rowCount, rows: invRows } = await client.query(
            "UPDATE inventory SET stock = stock - $1 WHERE id = 'founders-edition' AND stock >= $1 RETURNING stock;",
            [qty]
          );
          
          if (rowCount === 0) {
            await client.query('ROLLBACK');
            res.writeHead(400, headers);
            return res.end(JSON.stringify({ success: false, message: 'Sold Out! Not enough shirts available.' }));
          }
          
          // Upsert customer order total
          await client.query(
            'INSERT INTO customer_orders (email, total_quantity) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET total_quantity = customer_orders.total_quantity + $2',
            [email, qty]
          );
          
          await client.query('COMMIT');
          
          res.writeHead(200, headers);
          res.end(JSON.stringify({
            success: true,
            message: 'Shirt(s) ordered successfully!',
            remainingStock: invRows[0].stock
          }));
          
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('Server Error:', error);
        res.writeHead(500, headers);
        res.end(JSON.stringify({ success: false, message: 'Internal Server Error' }));
      }
    });
  } else {
    res.writeHead(404, headers);
    res.end(JSON.stringify({ success: false, message: 'Route Not Found' }));
  }
});

const PORT = process.env.PORT || 8080; // Cloud Run injects PORT 8080
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
