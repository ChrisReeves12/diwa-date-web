import mysql, { Pool } from 'mysql2/promise';
import process from "process";

const mySqlDbPool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT),
    user: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    connectionLimit: Number(process.env.MYSQL_POOL_SIZE) || 20,
    multipleStatements: true,
    namedPlaceholders: true,
}) as Pool;

export default mySqlDbPool;
