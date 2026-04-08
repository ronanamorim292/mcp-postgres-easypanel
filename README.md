# Professional PostgreSQL MCP Server

Este é um servidor Model Context Protocol (MCP) profissional para interagir com bancos de dados PostgreSQL. Ele fornece um conjunto abrangente de ferramentas para que modelos de IA possam consultar, inspecionar e gerenciar dados de forma eficiente e segura.

## Funcionalidades

- **Consultas Seguras**: Execute SELECTs (com limite automático para evitar overflow de tokens).
- **Inspeção de Esquema**: Liste tabelas, visualize detalhes de colunas e restrições.
- **Gerenciamento de Índices e Views**: Veja como seu banco está estruturado.
- **Geração de DDL**: Obtenha o comando `CREATE TABLE` de tabelas existentes.
- **Mutação de Dados**: Execute INSERT, UPDATE e DELETE de forma controlada.

## Pré-requisitos

- **Node.js**: v18 ou superior.
- **PostgreSQL**: Acesso a um banco de dados Postgres.

## Instalação

1. Clone ou baixe este repositório.
2. No diretório do projeto, instale as dependências:
   ```bash
   npm install
   ```
3. Compile o projeto:
   ```bash
   npm run build
   ```

## Configuração

### Variáveis de Ambiente Necessárias

1. Use o arquivo `.env.example` como template (faça uma cópia para `.env`):
   ```bash
   cp .env.example .env
   ```

2. Edite o arquivo `.env` e configure as seguintes variáveis:

#### PostgreSQL (Obrigatórias)
```env
PGHOST=localhost              # Endereço do servidor PostgreSQL
PGPORT=5432                   # Porta do PostgreSQL (padrão: 5432)
PGUSER=seu_usuario           # Usuário do banco de dados
PGPASSWORD=sua_senha         # Senha do banco de dados
PGDATABASE=seu_banco         # Nome do banco de dados
```

#### MCP Server (Opcionais)
```env
MCP_HTTP_PORT=9008           # Porta para modo HTTP Streamable (omitir para modo stdio)
```

#### PostgreSQL (Opcionais)
```env
PGSSLMODE=disable            # Modo SSL (disable, require, verify-full, etc.)
PGAPPNAME=mcp-postgres       # Nome da aplicação para logs do PostgreSQL
PGCONNECT_TIMEOUT=10         # Timeout de conexão em segundos
PGIDLE_TIMEOUT=300           # Timeout de conexões idle em segundos
```

### Exemplo Completo para EasyPanel
```env
# PostgreSQL Connection (use host interno no EasyPanel)
PGHOST=automacoes_postgres   # Nome do serviço no EasyPanel
PGPORT=5432
PGUSER=postgres
PGPASSWORD=12345678
PGDATABASE=automacoes
PGSSLMODE=disable

# MCP HTTP Server
MCP_HTTP_PORT=9008           # Porta pública a ser exposta no EasyPanel
```

### Configuração Rápida
1. Copie o exemplo acima e ajuste as credenciais
2. Para modo HTTP (EasyPanel), defina `MCP_HTTP_PORT`
3. Para modo stdio (Claude Desktop), omita `MCP_HTTP_PORT`

## Uso com Claude Desktop

Adicione o servidor ao seu arquivo `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "node",
      "args": ["/Caminho/Para/mcp-postgres/build/index.js"],
      "env": {
        "PGHOST": "localhost",
        "PGPORT": "5432",
        "PGUSER": "seu_usuario",
        "PGPASSWORD": "sua_senha",
        "PGDATABASE": "seu_banco"
      }
    }
  }
}
```

## Hospedagem no EasyPanel

Este servidor MCP suporta o protocolo HTTP Streamable, permitindo hospedagem em serviços como o EasyPanel. O projeto inclui suporte para Docker e script de inicialização para facilitar a implantação.

### Opção 1: Implantação com Docker (Recomendada)

1. **Construa a imagem Docker** (opcional, o EasyPanel pode fazer isso automaticamente):
   ```bash
   docker build -t mcp-postgres .
   ```

2. **No EasyPanel**:
   - Crie um novo serviço do tipo "Docker"
   - Configure o repositório ou faça upload da imagem
   - Defina as variáveis de ambiente (veja seção Configuração)
   - Exponha a porta `9008` (ou a porta configurada em `MCP_HTTP_PORT`)

3. **Comando Docker**:
   ```
   docker run -p 9008:9008 \
     -e PGHOST=automacoes_postgres \
     -e PGPORT=5432 \
     -e PGUSER=postgres \
     -e PGPASSWORD=12345678 \
     -e PGDATABASE=automacoes \
     -e MCP_HTTP_PORT=9008 \
     mcp-postgres
   ```

### Opção 2: Implantação com Node.js

1. **No EasyPanel**:
   - Crie um novo serviço do tipo "Node.js"
   - Configure as variáveis de ambiente conforme seu arquivo `.env`
   - Defina o comando de inicialização:
     ```
     npm install && npm run build && npm start
     ```
     Ou use o script de inicialização:
     ```
     ./start.sh
     ```
   - Exponha a porta configurada (padrão: 9008)

### Script de Inicialização

O projeto inclui `start.sh` que verifica variáveis de ambiente e inicia o servidor apropriadamente:

```bash
# Dar permissão de execução
chmod +x start.sh

# Executar
./start.sh
```

O script verifica:
- Variáveis de ambiente obrigatórias
- Modo HTTP vs stdio
- Necessidade de build

### Variáveis de Ambiente para EasyPanel

Use as seguintes variáveis no painel do EasyPanel:

| Variável | Valor Exemplo | Obrigatório |
|----------|---------------|-------------|
| `PGHOST` | `automacoes_postgres` | Sim |
| `PGPORT` | `5432` | Sim |
| `PGUSER` | `postgres` | Sim |
| `PGPASSWORD` | `12345678` | Sim |
| `PGDATABASE` | `automacoes` | Sim |
| `MCP_HTTP_PORT` | `9008` | Não (apenas para HTTP) |
| `PGSSLMODE` | `disable` | Não |

**Nota**: No EasyPanel, use o nome do serviço PostgreSQL como host (ex: `automacoes_postgres`).

### Testando a Implantação

Após a implantação, teste com:

```bash
# 1. Teste rápido de saúde
curl -f http://seu-servidor:9008/ || echo "Servidor não responde"

# 2. Teste completo das ferramentas
node build/test-all-tools-http.js
```

### Solução de Problemas Comuns

- **Porta não acessível**: Verifique se a porta pública está exposta no EasyPanel
- **Erro de conexão com PostgreSQL**: Use o host interno do serviço PostgreSQL no EasyPanel
- **Build falha**: Certifique-se de que todas as dependências estão instaladas (`npm install`)
- **Script não executa**: Verifique permissões (`chmod +x start.sh`)

### Modos de Operação

O servidor suporta dois modos de transporte:
- **Modo stdio**: Para uso com Claude Desktop (padrão quando `MCP_HTTP_PORT` não está definido)
- **Modo HTTP Streamable**: Para hospedagem web (ativado quando `MCP_HTTP_PORT` está definido)

## Solução de Problemas

### Conexão com PostgreSQL
- **Erro: "Connection refused"**: Verifique se o host e porta estão corretos e se o PostgreSQL está acessível.
- **Erro: "database does not exist"**: Confirme o nome do banco de dados na variável `PGDATABASE`.
- **Erro: "password authentication failed"**: Verifique as credenciais `PGUSER` e `PGPASSWORD`.

### Servidor HTTP
- **Erro: "Already connected to a transport"**: O servidor já está em execução. Reinicie o serviço.
- **Erro: "Not Acceptable: Client must accept both application/json and text/event-stream"**: Certifique-se de incluir o header `Accept: application/json, text/event-stream` nas requisições.
- **Erro: "Missing or invalid session ID"**: Use o `mcp-session-id` retornado no header da resposta de inicialização.

### EasyPanel
- **Porta não acessível**: No EasyPanel, certifique-se de expor a porta pública configurada (padrão: 9008).
- **Variáveis de ambiente**: Configure todas as variáveis do arquivo `.env` nas configurações do serviço.
- **Logs**: Verifique os logs do serviço no EasyPanel para diagnosticar erros de inicialização.

## Ferramentas Disponíveis

| Ferramenta | Descrição | Parâmetros |
| --- | --- | --- |
| `query` | Executa SELECTs com suporte a parâmetros. | `sql`, `params`, `limit` |
| `list_tables` | Lista todas as tabelas em um schema. | `schema` |
| `describe_table` | Detalha colunas e constraints de uma tabela. | `table`, `schema` |
| `list_indexes` | Lista os índices de uma tabela. | `table`, `schema` |
| `get_table_schema`| Gera o DDL `CREATE TABLE`. | `table`, `schema` |
| `execute_mutation`| Executa INSERT/UPDATE/DELETE. | `sql`, `params` |
| `search_data` | Busca por palavras-chave em qualquer coluna de texto em todas as tabelas. | `query`, `limit` |

## Dados de Exemplo e Constraints

O script `src/create-sample-data.ts` cria tabelas de exemplo para testes:

### Tabela `projetos_automacao`
Armazena projetos de automação com os seguintes campos:
- `id`: Chave primária autoincrementada
- `nome`: Nome do projeto (obrigatório)
- `descricao`: Descrição detalhada
- `tecnologia`: Stack tecnológica utilizada
- `status`: Status do projeto (com constraint CHECK)
- `responsavel`: Responsável pelo projeto
- `data_criacao`: Data de criação (timestamp com timezone)
- `horas_estimadas`: Horas estimadas para conclusão
- `metadata`: Campo JSON para dados adicionais

### Constraints da Tabela `projetos_automacao`
1. **PRIMARY KEY**: `projetos_automacao_pkey` (campo `id`)
2. **CHECK**: `projetos_automacao_status_check` - valida que o `status` contém apenas valores permitidos:
   - `'ativo'`
   - `'inativo'` 
   - `'em_desenvolvimento'`

Esta constraint garante a integridade dos dados e evita erros ao usar a ferramenta `execute_mutation`. Se um valor inválido for inserido, o PostgreSQL retornará um erro que será repassado como resposta da ferramenta.

### Tabela `logs_execucao`
Registra logs de execução de automações com os seguintes campos:
- `id`: Chave primária autoincrementada
- `projeto_id`: Referência à tabela `projetos_automacao`
- `tipo`: Tipo de log (info, warning, error, success)
- `mensagem`: Mensagem detalhada do log
- `data_execucao`: Timestamp da execução
- `duracao_segundos`: Duração em segundos

### Scripts de Teste Disponíveis
- `src/create-sample-data.ts`: Cria tabelas e insere dados de exemplo
- `src/test-tools.ts`: Testa todas as funcionalidades do MCP
- `src/test-all-tools-http.ts`: Teste completo via HTTP Streamable
- `src/test-connection.ts`: Testa conexão com o banco de dados

## Segurança

Este servidor foi projetado com segurança em mente:
- **Queries Parametrizadas**: Proteção contra Injeção SQL.
- **Separação de Ferramentas**: Distinção clara entre leitura (`query`) e escrita (`execute_mutation`).
- **Limites de Dados**: Prevenção contra consumo excessivo de recursos.

---
Desenvolvido com Antigravity.
