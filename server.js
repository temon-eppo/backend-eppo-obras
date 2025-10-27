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

// Configura CORS e aumenta limite de JSON
app.use(cors({ origin: [ "http://localhost:5173", "https://eppo-obras.vercel.app", "https://eppo-obras-aef61.web.app" ] }));
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

// POST: Upload ferramentas (apaga tabela antes do primeiro chunk)
app.post("/upload-tools", async (req, res) => {
  const data = req.body;
  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).send("Nenhum dado enviado");
  }

  const values = data.map(row => [
    row.PATRIMONIO || null,
    row.NUMSER || null,
    row.DESCRICAO || null,
    row.FABRICANTE || null,
    row.T035GCODI || null,
    row.STATUS || null,
    row.VLRCOMPRA || null,
    row.COD_FERRA_COB || null,
  ]);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // DELETA SEM CONDIÇÃO: apenas se for o primeiro batch
    if (req.headers["x-first-batch"] === "true") {
      await conn.query("DELETE FROM EPPOFerramentas");
      console.log("Tabela EPPOFerramentas limpa antes do upload");
    }

    await conn.query(
      "INSERT INTO EPPOFerramentas (PATRIMONIO, NUMSER, DESCRICAO, FABRICANTE, T035GCODI, STATUS, VLRCOMPRA, COD_FERRA_COB) VALUES ?",
      [values]
    );

    await conn.commit();

    console.log(`✅ Ferramentas importadas (batch): ${data.length} linhas`);
    res.send({ message: `Batch importado com sucesso (${data.length} linhas)` });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).send("Erro ao processar ferramentas");
  } finally {
    conn.release();
  }
});

// ==================== ROTAS FUNCIONÁRIOS ====================

// GET: todos os funcionários
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await getAllEmployees();
    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar funcionários');
  }
});

// GET: funcionário por nome
app.get('/api/employees/name/:name', async (req, res) => {
  try {
    const employees = await getEmployeeByName(req.params.name);
    if (!employees || employees.length === 0) return res.status(404).send('Funcionário não encontrado');
    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar funcionário');
  }
});

// POST: Upload funcionários (apaga antigos antes)
app.post("/upload-employees", async (req, res) => {
  const data = req.body;
  if (!Array.isArray(data) || data.length === 0) return res.status(400).send("Nenhum dado enviado");

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
    await conn.query("DELETE FROM EPPOFuncionarios"); // deleta antigos
    await conn.query(
      "INSERT INTO EPPOFuncionarios (GRUPODEF, FUNCAO, MATRICULA, NOME, TIPO) VALUES ?",
      [values]
    );
    await conn.commit();

    console.log(`✅ Funcionários importados: ${data.length} linhas`);

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
