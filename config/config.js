// Database connection, read from .env (used by models/index.js and sequelize-cli via .sequelizerc).
// Loads .env itself because sequelize-cli and the scripts do not go through server.js.
require('dotenv').config({ quiet: true, path: require('path').join(__dirname, '..', '.env') });

const fromEnv = () => ({
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  dialect: process.env.DB_DIALECT || 'mysql',
  // The DB server is case-sensitive and the table is lowercase
  migrationStorageTableName: 'sequelizemeta'
});

module.exports = {
  development: fromEnv(),
  test: fromEnv(),
  production: fromEnv()
};
