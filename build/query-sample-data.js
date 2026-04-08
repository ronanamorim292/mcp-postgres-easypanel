import pool from "./db.js";
async function querySampleData() {
    console.log("🔍 Consultando dados de exemplo...\n");
    try {
        // 1. Listar todas as tabelas
        console.log("📋 TABELAS NO BANCO DE DADOS:");
        const tables = await pool.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
        tables.rows.forEach((row, index) => {
            console.log(`  ${index + 1}. ${row.table_name} (${row.table_type})`);
        });
        // 2. Consultar projetos_automacao
        console.log("\n🎯 PROJETOS DE AUTOMAÇÃO:");
        const projetos = await pool.query(`
      SELECT id, nome, tecnologia, status, responsavel, horas_estimadas
      FROM projetos_automacao
      ORDER BY id
    `);
        projetos.rows.forEach(projeto => {
            console.log(`\n  Projeto #${projeto.id}: ${projeto.nome}`);
            console.log(`    Tecnologia: ${projeto.tecnologia}`);
            console.log(`    Status: ${projeto.status}`);
            console.log(`    Responsável: ${projeto.responsavel}`);
            console.log(`    Horas estimadas: ${projeto.horas_estimadas}h`);
        });
        // 3. Consultar logs de execução
        console.log("\n📝 LOGS DE EXECUÇÃO:");
        const logs = await pool.query(`
      SELECT l.id, l.projeto_id, p.nome as projeto_nome, 
             l.comando_executado, l.resultado, l.duracao_segundos,
             l.data_hora
      FROM logs_execucao l
      JOIN projetos_automacao p ON l.projeto_id = p.id
      ORDER BY l.data_hora DESC
    `);
        logs.rows.forEach(log => {
            console.log(`\n  Log #${log.id} - Projeto: ${log.projeto_nome} (ID: ${log.projeto_id})`);
            console.log(`    Comando: ${log.comando_executado.substring(0, 50)}...`);
            console.log(`    Resultado: ${log.resultado}`);
            console.log(`    Duração: ${log.duracao_segundos}s`);
            console.log(`    Data/Hora: ${log.data_hora}`);
        });
        // 4. Estatísticas agregadas
        console.log("\n📊 ESTATÍSTICAS DETALHADAS:");
        // Projetos por status
        const statsStatus = await pool.query(`
      SELECT status, COUNT(*) as quantidade, 
             SUM(horas_estimadas) as total_horas
      FROM projetos_automacao
      GROUP BY status
    `);
        console.log("\n  Projetos por status:");
        statsStatus.rows.forEach(stat => {
            console.log(`    ${stat.status}: ${stat.quantidade} projeto(s), ${stat.total_horas}h total`);
        });
        // Logs por resultado
        const statsLogs = await pool.query(`
      SELECT resultado, COUNT(*) as quantidade,
             AVG(duracao_segundos) as media_duracao
      FROM logs_execucao
      GROUP BY resultado
    `);
        console.log("\n  Logs por resultado:");
        statsLogs.rows.forEach(stat => {
            console.log(`    ${stat.resultado}: ${stat.quantidade} log(s), média ${parseFloat(stat.media_duracao).toFixed(2)}s`);
        });
        // 5. Projeto mais ativo (mais logs)
        const projetoMaisAtivo = await pool.query(`
      SELECT p.id, p.nome, COUNT(l.id) as total_logs
      FROM projetos_automacao p
      LEFT JOIN logs_execucao l ON p.id = l.projeto_id
      GROUP BY p.id, p.nome
      ORDER BY total_logs DESC
      LIMIT 1
    `);
        if (projetoMaisAtivo.rows.length > 0) {
            console.log(`\n  🏆 Projeto mais ativo: ${projetoMaisAtivo.rows[0].nome} (${projetoMaisAtivo.rows[0].total_logs} logs)`);
        }
        console.log("\n✅ Consulta concluída com sucesso!");
    }
    catch (error) {
        console.error("❌ Erro ao consultar dados!");
        console.error(error);
    }
    finally {
        await pool.end();
    }
}
querySampleData();
