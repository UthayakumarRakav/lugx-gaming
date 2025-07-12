const express = require('express');
const { createClient } = require('@clickhouse/client');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

// ClickHouse client
const clickhouse = createClient({
  host: process.env.CLICKHOUSE_HOST || 'http://clickhouse:8123',
  database: process.env.CLICKHOUSE_DB || 'default',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || ''
});

// Initialize ClickHouse tables
async function initializeDB() {
  try {
    await clickhouse.exec({
      query: `
        CREATE TABLE IF NOT EXISTS page_views (
          session_id String,
          user_id Nullable(String),
          page_url String,
          timestamp DateTime,
          time_spent UInt32,
          scroll_depth Float32,
          device String,
          browser String,
          os String,
          country String,
          city String
        ) ENGINE = MergeTree()
        ORDER BY (timestamp, page_url)
      `
    });
    
    await clickhouse.exec({
      query: `
        CREATE TABLE IF NOT EXISTS clicks (
          session_id String,
          user_id Nullable(String),
          element_id String,
          page_url String,
          timestamp DateTime,
          text_content String,
          x_position UInt32,
          y_position UInt32
        ) ENGINE = MergeTree()
        ORDER BY (timestamp, element_id)
      `
    });
    
    await clickhouse.exec({
      query: `
        CREATE TABLE IF NOT EXISTS sessions (
          session_id String,
          user_id Nullable(String),
          start_time DateTime,
          end_time DateTime,
          duration UInt32,
          device String,
          browser String,
          os String,
          country String,
          city String,
          pages_visited UInt32,
          is_bounce UInt8
        ) ENGINE = MergeTree()
        ORDER BY (start_time, session_id)
      `
    });
    
    console.log('ClickHouse tables initialized');
  } catch (error) {
    console.error('Error initializing ClickHouse tables:', error);
    process.exit(1);
  }
}

// Initialize and start server
initializeDB().then(() => {
  // Routes
  app.post('/analytics/pageview', async (req, res) => {
    try {
      const { session_id, user_id, page_url, time_spent, scroll_depth, device, browser, os, country, city } = req.body;
      
      await clickhouse.insert({
        table: 'page_views',
        values: [{
          session_id,
          user_id: user_id || null,
          page_url,
          timestamp: new Date(),
          time_spent: time_spent || 0,
          scroll_depth: scroll_depth || 0,
          device: device || 'unknown',
          browser: browser || 'unknown',
          os: os || 'unknown',
          country: country || 'unknown',
          city: city || 'unknown'
        }],
        format: 'JSONEachRow'
      });
      
      res.status(201).json({ status: 'ok' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/analytics/click', async (req, res) => {
    try {
      const { session_id, user_id, element_id, page_url, text_content, x_position, y_position } = req.body;
      
      await clickhouse.insert({
        table: 'clicks',
        values: [{
          session_id,
          user_id: user_id || null,
          element_id,
          page_url,
          timestamp: new Date(),
          text_content: text_content || '',
          x_position: x_position || 0,
          y_position: y_position || 0
        }],
        format: 'JSONEachRow'
      });
      
      res.status(201).json({ status: 'ok' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/analytics/session', async (req, res) => {
    try {
      const { session_id, user_id, start_time, end_time, duration, device, browser, os, country, city, pages_visited, is_bounce } = req.body;
      
      await clickhouse.insert({
        table: 'sessions',
        values: [{
          session_id,
          user_id: user_id || null,
          start_time: new Date(start_time),
          end_time: new Date(end_time),
          duration: duration || 0,
          device: device || 'unknown',
          browser: browser || 'unknown',
          os: os || 'unknown',
          country: country || 'unknown',
          city: city || 'unknown',
          pages_visited: pages_visited || 1,
          is_bounce: is_bounce ? 1 : 0
        }],
        format: 'JSONEachRow'
      });
      
      res.status(201).json({ status: 'ok' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/analytics/summary', async (req, res) => {
    try {
      const query = `
        SELECT 
          toDate(timestamp) as date,
          count(*) as page_views,
          avg(time_spent) as avg_time_spent,
          avg(scroll_depth) as avg_scroll_depth
        FROM page_views
        GROUP BY date
        ORDER BY date DESC
        LIMIT 30
      `;
      
      const result = await clickhouse.query({
        query: query,
        format: 'JSONEachRow'
      });
      
      const data = await result.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
  });
  
  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.log(`Analytics service running on port ${PORT}`);
  });
});
