import pool from "./db.js";

async function createSampleData() {
  console.log("🚀 Criando tabela e inserindo dados de exemplo...");
  
  try {
    // 1. Criar tabela de projetos de automação
    console.log("Criando tabela 'projetos_automacao'...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projetos_automacao (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        descricao TEXT,
        tecnologia VARCHAR(50),
        status VARCHAR(20) CHECK (status IN ('ativo', 'inativo', 'em_desenvolvimento')),
        data_criacao DATE DEFAULT CURRENT_DATE,
        responsavel VARCHAR(100),
        horas_estimadas INTEGER,
        metadata JSONB
      )
    `);
    
    // 2. Criar tabela de logs de execução
    console.log("Criando tabela 'logs_execucao'...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs_execucao (
        id SERIAL PRIMARY KEY,
        projeto_id INTEGER REFERENCES projetos_automacao(id),
        comando_executado TEXT NOT NULL,
        resultado VARCHAR(20) CHECK (resultado IN ('sucesso', 'falha', 'pendente')),
        data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        duracao_segundos DECIMAL(10,2),
        detalhes JSONB
      )
    `);
    
    // 3. Inserir dados na tabela projetos_automacao
    console.log("Inserindo projetos de automação...");
    const projetos = [
      {
        nome: "Automação de Backup",
        descricao: "Script para backup automático de bancos de dados",
        tecnologia: "Python + PostgreSQL",
        status: "ativo",
        responsavel: "João Silva",
        horas_estimadas: 40,
        metadata: { frequencia: "diária", alertas: true, storage: "S3" }
      },
      {
        nome: "Monitoramento de Servidores",
        descricao: "Sistema de monitoramento de recursos de servidores",
        tecnologia: "Node.js + Prometheus",
        status: "em_desenvolvimento",
        responsavel: "Maria Santos",
        horas_estimadas: 80,
        metadata: { monitora_cpu: true, monitora_memoria: true, threshold: 80 }
      },
      {
        nome: "ETL de Dados",
        descricao: "Processo de extração, transformação e carga de dados",
        tecnologia: "Apache Airflow",
        status: "ativo",
        responsavel: "Carlos Oliveira",
        horas_estimadas: 120,
        metadata: { fonte: "API Externa", destino: "Data Warehouse", frequencia: "horária" }
      },
      {
        nome: "Chatbot Suporte",
        descricao: "Chatbot para atendimento automático de suporte técnico",
        tecnologia: "OpenAI API + FastAPI",
        status: "inativo",
        responsavel: "Ana Costa",
        horas_estimadas: 60,
        metadata: { integracao: "Slack", linguagem: "português", modelo: "gpt-4" }
      }
    ];
    
    for (const projeto of projetos) {
      const result = await pool.query(
        `INSERT INTO projetos_automacao 
         (nome, descricao, tecnologia, status, responsavel, horas_estimadas, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, nome`,
        [
          projeto.nome,
          projeto.descricao,
          projeto.tecnologia,
          projeto.status,
          projeto.responsavel,
          projeto.horas_estimadas,
          projeto.metadata
        ]
      );
      console.log(`✓ Projeto inserido: ${result.rows[0].nome} (ID: ${result.rows[0].id})`);
    }
    
    // 4. Inserir dados na tabela logs_execucao
    console.log("\nInserindo logs de execução...");
    const logs = [
      {
        projeto_id: 1,
        comando_executado: "pg_dump -h localhost -U postgres automacoes",
        resultado: "sucesso",
        duracao_segundos: 45.23,
        detalhes: { tamanho_backup: "2.4GB", compressao: "gzip" }
      },
      {
        projeto_id: 2,
        comando_executado: "node monitor.js --cpu --memory",
        resultado: "falha",
        duracao_segundos: 12.15,
        detalhes: { erro: "Timeout na conexão", tentativas: 3 }
      },
      {
        projeto_id: 3,
        comando_executado: "python etl_pipeline.py --full-load",
        resultado: "sucesso",
        duracao_segundos: 320.78,
        detalhes: { registros_processados: 125000, tempo_medio: "2.5ms" }
      }
    ];
    
    for (const log of logs) {
      const result = await pool.query(
        `INSERT INTO logs_execucao 
         (projeto_id, comando_executado, resultado, duracao_segundos, detalhes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, projeto_id, resultado`,
        [
          log.projeto_id,
          log.comando_executado,
          log.resultado,
          log.duracao_segundos,
          log.detalhes
        ]
      );
      console.log(`✓ Log inserido: Projeto ${result.rows[0].projeto_id} - ${result.rows[0].resultado}`);
    }
    
    // 5. Mostrar estatísticas
    console.log("\n📊 Estatísticas do banco de dados:");
    
    const projetosCount = await pool.query("SELECT COUNT(*) as total FROM projetos_automacao");
    const logsCount = await pool.query("SELECT COUNT(*) as total FROM logs_execucao");
    const statusProjetos = await pool.query("SELECT status, COUNT(*) as quantidade FROM projetos_automacao GROUP BY status");
    
    console.log(`Total de projetos: ${projetosCount.rows[0].total}`);
    console.log(`Total de logs: ${logsCount.rows[0].total}`);
    console.log("Distribuição por status:");
    statusProjetos.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.quantidade} projeto(s)`);
    });
    
    console.log("\n✅ Dados de exemplo criados com sucesso!");
    console.log("\n📋 Tabelas criadas:");
    console.log("  1. projetos_automacao - Armazena informações dos projetos de automação");
    console.log("  2. logs_execucao - Registra logs de execução com relacionamento para projetos");
    
  } catch (error) {
    console.error("❌ Erro ao criar dados de exemplo!");
    console.error(error);
  } finally {
    await pool.end();
  }
}

createSampleData();