import sql from 'mssql/msnodesqlv8.js';

let pool;

const getDbConfig = () => {
    const useWindowsAuth =
        (process.env.DB_AUTH_TYPE || 'windows').toLowerCase() === 'windows';

    const config = {
        server: process.env.DB_SERVER,
        database: process.env.DB_DATABASE,
        driver: process.env.DB_DRIVER || 'ODBC Driver 18 for SQL Server',
        options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate:
                process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
            trustedConnection: useWindowsAuth,
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
        },
    };

    if (process.env.DB_INSTANCE) {
        config.options.instanceName = process.env.DB_INSTANCE;
    } else if (process.env.DB_PORT) {
        config.port = Number(process.env.DB_PORT);
    }

    if (!useWindowsAuth) {
        config.user = process.env.DB_USER;
        config.password = process.env.DB_PASSWORD;
    }

    return config;
};

export const connectDb = async () => {
    if (pool) {
        return pool;
    }

    pool = await sql.connect(getDbConfig());
    return pool;
};

export const getPool = async () => connectDb();

export { sql };
