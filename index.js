import express from 'express';
import oracledb from 'oracledb';

const app = express();
app.use(express.json());

// Credenciales comunes para todos los Oracle
const COMMON_USER = process.env.DB_USER || 'consu';
const COMMON_PASSWORD = process.env.DB_PASSWORD || 'TU_PASS';

// Distintas cadenas de conexión según target
const connectStrings = {
  A: process.env.DB_CONNECT_A || '10.8.0.2:1521/ORACLE11',
  B: process.env.DB_CONNECT_B || '10.8.0.3:1521/ORACLE11',
  C: process.env.DB_CONNECT_C || '10.8.0.4:1521/ORACLE11',
};

const DEFAULT_TARGET = process.env.DB_DEFAULT_TARGET || 'A';

async function initOracle() {
  await oracledb.initOracleClient({ libDir: '/opt/oracle/instantclient' });
  console.log('Oracle client (Thick) inicializado');
}

app.post('/query', async (req, res) => {
  const { sql, binds, options, target } = req.body || {};
  if (!sql) {
    return res.status(400).json({ error: 'Missing "sql" in body' });
  }

  const chosenTarget = target || DEFAULT_TARGET;
  const connectString = connectStrings[chosenTarget];

  if (!connectString) {
    return res.status(400).json({ error: `Invalid target "${chosenTarget}"` });
  }

  const dbConfig = {
    user: COMMON_USER,
    password: COMMON_PASSWORD,
    connectString,
  };

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      sql,
      binds || [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        ...options,
      },
    );

    await connection.close();

    res.json({
      rows: result.rows || [],
      metaData: result.metaData || [],
      target: chosenTarget,
    });
  } catch (err) {
    console.error('Oracle error:', err);
    if (connection) {
      try { await connection.close(); } catch (e) {}
    }
    res.status(500).json({ error: err.message, target: chosenTarget });
  }
});

const port = process.env.PORT || 3000;

initOracle()
  .then(() => {
    app.listen(port, () => {
      console.log(`oracle-bridge escuchando en puerto ${port}`);
    });
  })
  .catch((err) => {
    console.error('Error inicializando Oracle client:', err);
    process.exit(1);
  });

