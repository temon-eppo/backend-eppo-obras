const mysql = require('mysql2/promise');

// Configuração do banco
const MYSQL_CONFIG = {
  host: 'temonbi.mysql.dbaas.com.br',
  user: 'temonbi',
  password: 'T3mon#2020',
  database: 'temonbi',
  port: 3306
};

const pool = mysql.createPool(MYSQL_CONFIG);

// ==================== FERRAMENTAS ====================

// Retorna todas as ferramentas
async function getAllTools() {
  const [rows] = await pool.execute('SELECT * FROM EPPOFerramentas');
  return rows;
}

// Retorna ferramenta por Patrimônio ou NUMSER
async function getToolBySearch(searchTerm) {
  const [rows] = await pool.execute(
    `SELECT PATRIMONIO, CAST(NUMSER AS CHAR) AS NUMSER, DESCRICAO, FABRICANTE, T035GCODI, STATUS, VLRCOMPRA, COD_FERRA_COB
     FROM EPPOFerramentas
     WHERE PATRIMONIO = ? OR NUMSER = ?`,
    [searchTerm, searchTerm]
  );
  if (rows.length === 0) return null;
  return { ...rows[0], NUMSER: rows[0].NUMSER ? String(rows[0].NUMSER) : null };
}

// Retorna descrições únicas (sem código)
async function getUniqueDescriptions() {
  const ferramentas = await getAllTools();
  const descricoes = [...new Set(ferramentas.map(f => f.DESCRICAO).filter(Boolean))];
  return descricoes.map(d => ({ DESCRICAO: d }));
}

// ==================== FUNCIONÁRIOS ====================

// Retorna todos os funcionários
async function getAllEmployees() {
  const [rows] = await pool.execute('SELECT * FROM EPPOFuncionarios');
  return rows;
}

// Retorna funcionário por nome
async function getEmployeeByName(name) {
  const [rows] = await pool.execute(
    `SELECT GRUPODEF, FUNCAO, MATRICULA, NOME, TIPO
     FROM EPPOFuncionarios
     WHERE NOME LIKE ?`,
    [`%${name}%`]
  );
  return rows;
}

module.exports = {
  pool,
  getAllTools,
  getToolBySearch,
  getUniqueDescriptions,
  getAllEmployees,
  getEmployeeByName
};
