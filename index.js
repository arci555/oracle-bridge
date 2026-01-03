import express from 'express';
import oracledb from 'oracledb';

const app = express();
app.use(express.json());

// Parámetros comunes a todas las BD
const COMMON_USER = process.env.DB_USER || 'consu';
const COMMON_PASSWORD = process.env.DB_PASSWORD || 'TU_PASS';
const COMMON_SERVICE = process.env.DB_SERVICE || 'ORACLE11';
const COMMON_PORT = process.env.DB_PORT || 1521;

// Solo cambia la IP según target
const ipByTarget = {
  A: process.env.DB_IP_A || '10.8.0.2',
  B: process.env.DB_IP_B || '10.8.0.3',
  C: process.env.DB_IP_C || '10.8.0.4',
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
  const ip = ipByTarget[chosenTarget];

  if (!ip) {
    return res.status(400).json({ error: `Invalid target "${chosenTarget}"` });
  }

  const dbConfig = {
    user: COMMON_USER,
    password: COMMON_PASSWORD,
    connectString: `${ip}:${COMMON_PORT}/${COMMON_SERVICE}`,
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


