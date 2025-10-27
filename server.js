require('dotenv').config();
const express = require('express');
const cors = require('cors');
const {
  pool,
  getAllTools,
  getToolBySearch,
  getUniqueDescriptions,
  getAllEmployees,
  getEmployeeByName
} = require('./db.js');

const app = express();
const port = process.env.PORT || 4000;

// ==================== CONFIGURAÇÕES ====================
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://eppo-obras.vercel.app",
    "https://eppo-obras-aef61.web.app"
  ],
  allowedHeaders: "*"
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==================== ROTAS FERRAMENTAS ====================

// GET: todas as ferramentas
app.get('/api/ferramentas', async (req, res) => {
  try {
    const tools = await getAllTools();
    res.json(tools);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar ferramentas');
  }
});

// GET: ferramenta por Patrimônio ou NUMSER
app.get('/api/ferramentas/:searchTerm', async (req, res) => {
  try {
    const tool = await getToolBySearch(req.params.searchTerm);
    if (!tool) return res.status(404).send('Ferramenta não encontrada');
    res.json(tool);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar ferramenta');
  }
});

app.post("/upload-tools", async (req, res) => {
  const data = req.body;
  const batchNumber = parseInt(req.headers["x-batch"] || "1", 10);

  if (!Array.isArray(data) || data.length === 0)
    return res.status(400).send("Nenhum dado enviado");

  const values = data.map(row => [
    row.PATRIMONIO || null,
    row.NUMSER || null,
    row.DESCRICAO || null,
    row.FABRICANTE || null,
    row.T035GCODI || null,
    row.STATUS || null,
    row.VLRCOMPRA || null,
    row.COD_FERRA_COB || null
  ]);

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    if (batchNumber === 1) {
      // apaga tudo apenas no primeiro batch
      await conn.query("DELETE FROM EPPOFerramentas");
    }

    await conn.query(
      "INSERT INTO EPPOFerramentas (PATRIMONIO, NUMSER, DESCRICAO, FABRICANTE, T035GCODI, STATUS, VLRCOMPRA, COD_FERRA_COB) VALUES ?",
      [values]
    );

    await conn.commit();
    res.send({ message: `Batch ${batchNumber} inserido com sucesso!` });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).send(`Erro no batch ${batchNumber}`);
  } finally {
    conn.release();
  }
});


// ==================== ROTAS FUNCIONÁRIOS ====================

// GET: todos os funcionários ou por nome/obra
app.get('/api/employees', async (req, res) => {
  try {
    const { obra } = req.query;
    const employees = obra
      ? await getEmployeeByName(obra)
      : await getAllEmployees();

    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar funcionários');
  }
});

// POST: Upload funcionários (apaga antigos antes)
app.post("/upload-employees", async (req, res) => {
  const data = req.body;
  if (!Array.isArray(data) || data.length === 0)
    return res.status(400).send("Nenhum dado enviado");

  const values = data.map(row => [
    row.GRUPODEF || null,
    row.FUNCAO || null,
    row.MATRICULA || null,
    row.NOME || null,
    row.TIPO || null
  ]);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM EPPOFuncionarios");
    await conn.query(
      "INSERT INTO EPPOFuncionarios (GRUPODEF, FUNCAO, MATRICULA, NOME, TIPO) VALUES ?",
      [values]
    );
    await conn.commit();

    res.send({ message: `Funcionários importados com sucesso! (${data.length} linhas)` });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).send("Erro ao processar funcionários");
  } finally {
    conn.release();
  }
});

// ==================== SERVIDOR ====================
app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));


