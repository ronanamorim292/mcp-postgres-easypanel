import pool from "./db.js";
async function checkConstraints() {
    console.log("🔍 Verificando constraints da tabela projetos_automacao...\n");
    try {
        // Verificar constraint CHECK de status
        const checkResult = await pool.query(`
      SELECT conname, pg_get_constraintdef(pg_constraint.oid) as constraint_def
      FROM pg_constraint 
      INNER JOIN pg_class ON conrelid = pg_class.oid 
      WHERE relname = 'projetos_automacao' AND contype = 'c'
    `);
        console.log("📋 Constraints CHECK encontradas:");
        checkResult.rows.forEach(row => {
            console.log(`   • ${row.conname}: ${row.constraint_def}`);
        });
        // Verificar valores distintos de status
        const statusResult = await pool.query(`
      SELECT DISTINCT status FROM projetos_automacao ORDER BY status
    `);
        console.log("\n📊 Valores de status atuais na tabela:");
        statusResult.rows.forEach(row => {
            console.log(`   • "${row.status}"`);
        });
        // Tentar extrair valores permitidos da constraint CHECK
        if (checkResult.rows.length > 0) {
            const constraintDef = checkResult.rows[0].constraint_def;
            // Extrair valores entre parênteses após IN
            const inMatch = constraintDef.match(/IN\s*\(([^)]+)\)/i);
            if (inMatch) {
                const allowedValues = inMatch[1].split(',').map((v) => v.trim().replace(/'/g, ''));
                console.log("\n✅ Valores permitidos para status (extraídos da constraint):");
                allowedValues.forEach((val) => {
                    console.log(`   • "${val}"`);
                });
            }
        }
        // Verificar outras constraints
        const allConstraints = await pool.query(`
      SELECT 
        conname,
        contype,
        CASE contype 
          WHEN 'p' THEN 'PRIMARY KEY'
          WHEN 'f' THEN 'FOREIGN KEY' 
          WHEN 'c' THEN 'CHECK'
          WHEN 'u' THEN 'UNIQUE'
          ELSE contype::text
        END as constraint_type,
        pg_get_constraintdef(pg_constraint.oid) as constraint_def
      FROM pg_constraint 
      INNER JOIN pg_class ON conrelid = pg_class.oid 
      WHERE relname = 'projetos_automacao'
      ORDER BY contype
    `);
        console.log("\n🔗 Todas as constraints da tabela:");
        allConstraints.rows.forEach(row => {
            console.log(`   • ${row.conname} (${row.constraint_type}): ${row.constraint_def}`);
        });
        console.log("\n💡 Recomendações para uso do MCP:");
        console.log("   1. Use apenas status válidos: 'ativo', 'inativo', 'em_desenvolvimento'");
        console.log("   2. A constraint 'projetos_automacao_status_check' valida os valores");
        console.log("   3. Erros de constraint serão retornados como resposta da ferramenta execute_mutation");
    }
    catch (error) {
        console.error("❌ Erro:", error.message);
    }
    finally {
        await pool.end();
    }
}
checkConstraints();
