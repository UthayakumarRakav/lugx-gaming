const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'order_db',
  process.env.DB_USER || 'order_user',
  process.env.DB_PASSWORD || 'order_password',
  {
    host: process.env.DB_HOST || 'order-db-service',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Order model
const Order = sequelize.define('Order', {
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  items: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  totalPrice: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending'
  }
}, {
  timestamps: true
});

// Initialize database and start server
sequelize.sync()
  .then(() => {
    console.log('Database synchronized');
    
    // Routes
    app.get('/orders', async (req, res) => {
      try {
        const orders = await Order.findAll();
        res.json(orders);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    app.post('/orders', async (req, res) => {
      try {
        const order = await Order.create(req.body);
        res.status(201).json(order);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });
    
    app.get('/orders/:id', async (req, res) => {
      try {
        const order = await Order.findByPk(req.params.id);
        if (!order) {
          return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    app.put('/orders/:id', async (req, res) => {
      try {
        const [updated] = await Order.update(req.body, {
          where: { id: req.params.id }
        });
        if (updated) {
          const updatedOrder = await Order.findByPk(req.params.id);
          return res.json(updatedOrder);
        }
        throw new Error('Order not found');
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    app.get('/orders/user/:userId', async (req, res) => {
      try {
        const orders = await Order.findAll({
          where: { userId: req.params.userId }
        });
        res.json(orders);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Health check
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'healthy' });
    });
    
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`Order service running on port ${PORT}`);
    });
  })
  .catch(error => {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  });
