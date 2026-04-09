#!/bin/sh
# Script de inicialização para produção
# Configuração para hospedagem no EasyPanel

echo "🚀 Iniciando MCP PostgreSQL Server..."

# Verificar se as variáveis de ambiente necessárias estão definidas
if [ -z "$PGHOST" ]; then
    echo "⚠️  Aviso: PGHOST não está definido. Usando 'localhost' como padrão."
    export PGHOST=localhost
fi

if [ -z "$PGUSER" ]; then
    echo "❌ Erro: PGUSER não está definido. É necessário para conectar ao PostgreSQL."
    exit 1
fi

if [ -z "$PGPASSWORD" ]; then
    echo "❌ Erro: PGPASSWORD não está definido. É necessário para conectar ao PostgreSQL."
    exit 1
fi

if [ -z "$PGDATABASE" ]; then
    echo "⚠️  Aviso: PGDATABASE não está definido. Usando 'postgres' como padrão."
    export PGDATABASE=postgres
fi

# Verificar se estamos no modo HTTP Streamable
if [ -n "$MCP_HTTP_PORT" ]; then
    echo "🌐 Modo HTTP Streamable ativado na porta: $MCP_HTTP_PORT"
    echo "📡 O servidor estará disponível em: http://0.0.0.0:$MCP_HTTP_PORT/mcp"
else
    echo "📟 Modo stdio ativado (para uso com Claude Desktop)"
fi

# Verificar se o projeto está construído
if [ ! -d "build" ] || [ ! -f "build/index.js" ]; then
    echo "❌ Erro: Diretório de build não encontrado. Verifique se o Dockerfile construiu o projeto corretamente."
    exit 1
fi

# Executar o servidor
echo "✅ Todas as verificações passaram. Iniciando servidor..."
exec node build/index.js