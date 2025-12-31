import express from 'express';
import oracledb from 'oracledb';

const app = express();
app.use(express.json());

// Configuración de Oracle: AJUSTA ESTOS VALORES
const dbConfig = {
  user: process.env.DB_USER || 'consu',          // usuario Oracle
  password: process.env.DB_PASSWORD || 'TU_PASS',// mejor vía env
  connectString: process.env.DB_CONNECT || '10.8.0.4:1521/ORACLE11'
};

async function initOracle() {
  await oracledb.initOracleClient({ libDir: '/opt/oracle/instantclient' });
  console.log('Oracle client (Thick) inicializado');
}

app.post('/query', async (req, res) => {
  const { sql, binds, options } = req.body || {};
  if (!sql) {
    return res.status(400).json({ error: 'Missing \"sql\" in body' });
  }

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      sql,
      binds || [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        ...options
      }
    );

    await connection.close();

    res.json({
      rows: result.rows || [],
      metaData: result.metaData || []
    });
  } catch (err) {
    console.error('Oracle error:', err);
    if (connection) {
      try { await connection.close(); } catch (e) {}
    }
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;

initOracle()
  .then(() => {
    app.listen(port, () => {
      console.log(`oracle-bridge escuchando en puerto ${port}`);
    });
  })
  .catch(err => {
    console.error('Error inicializando Oracle client:', err);
    process.exit(1);
  });
