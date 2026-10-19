require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const { logger } = require('./config/logger');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await sequelize.authenticate();
        logger.info('Database connection has been established successfully.');
        
        // Uncomment the following line to sync models initially (only in dev!)
        // await sequelize.sync({ alter: true });
        
        // Force restart nodemon
        app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT} in ${process.env.NODE_ENV} mode.`);
        });
    } catch (error) {
        logger.error('Unable to connect to the database:', error);
        process.exit(1);
    }
};

startServer();
