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
  process.env.DB_NAME || 'game_db',
  process.env.DB_USER || 'game_user',
  process.env.DB_PASSWORD || 'game_password',
  {
    host: process.env.DB_HOST || 'game-db-service',
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

// Game model
const Game = sequelize.define('Game', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  releaseDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false
  }
}, {
  timestamps: true
});

// Initialize database and start server
sequelize.sync()
  .then(() => {
    console.log('Database synchronized');
    
    // Routes
    app.get('/games', async (req, res) => {
      try {
        const games = await Game.findAll();
        res.json(games);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    app.post('/games', async (req, res) => {
      try {
        const game = await Game.create(req.body);
        res.status(201).json(game);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });
    
    app.get('/games/:id', async (req, res) => {
      try {
        const game = await Game.findByPk(req.params.id);
        if (!game) {
          return res.status(404).json({ error: 'Game not found' });
        }
        res.json(game);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    app.put('/games/:id', async (req, res) => {
      try {
        const [updated] = await Game.update(req.body, {
          where: { id: req.params.id }
        });
        if (updated) {
          const updatedGame = await Game.findByPk(req.params.id);
          return res.json(updatedGame);
        }
        throw new Error('Game not found');
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    app.delete('/games/:id', async (req, res) => {
      try {
        const deleted = await Game.destroy({
          where: { id: req.params.id }
        });
        if (deleted) {
          return res.status(204).send();
        }
        throw new Error('Game not found');
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Health check
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'healthy' });
    });
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Game service running on port ${PORT}`);
    });
  })
  .catch(error => {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  });
