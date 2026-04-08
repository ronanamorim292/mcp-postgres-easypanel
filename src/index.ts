import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { CallToolRequestSchema, ListToolsRequestSchema, isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import { Request, Response } from "express";
import pool from "./db.js";
import {
  QuerySchema,
  ListTablesSchema,
  DescribeTableSchema,
  ListIndexesSchema,
  ExecutionMutationSchema,
  GetTableSchemaSchema,
  SearchDataSchema
} from "./types.js";

function createServer() {
  const server = new Server(
    {
      name: "mcp-postgres-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // --- Tool Registration ---
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "query",
          description: "Execute a read-only SQL query (SELECT).",
          inputSchema: {
            type: "object",
            properties: {
              sql: { type: "string", description: "The SQL SELECT statement." },
              params: { type: "array", description: "Optional query parameters." },
              limit: { type: "number", description: "Row limit.", default: 100 },
            },
            required: ["sql"],
          },
        },
        {
          name: "list_tables",
          description: "List all tables in a specific schema.",
          inputSchema: {
            type: "object",
            properties: {
              schema: { type: "string", default: "public" },
            },
          },
        },
        {
          name: "describe_table",
          description: "Get column details and constraints for a table.",
          inputSchema: {
            type: "object",
            properties: {
              table: { type: "string" },
              schema: { type: "string", default: "public" },
            },
            required: ["table"],
          },
        },
        {
          name: "list_indexes",
          description: "List all indexes for a table.",
          inputSchema: {
            type: "object",
            properties: {
              table: { type: "string" },
              schema: { type: "string", default: "public" },
            },
            required: ["table"],
          },
        },
        {
          name: "execute_mutation",
          description: "Execute an INSERT/UPDATE/DELETE mutation.",
          inputSchema: {
            type: "object",
            properties: {
              sql: { type: "string", description: "The mutation SQL." },
              params: { type: "array", description: "Optional query parameters." },
            },
            required: ["sql"],
          },
        },
        {
          name: "get_table_schema",
          description: "Get the full DDL (CREATE TABLE) for a table.",
          inputSchema: {
            type: "object",
            properties: {
              table: { type: "string" },
              schema: { type: "string", default: "public" },
            },
            required: ["table"],
          },
        },
      ],
    };
  });

  // --- Tool Handlers ---
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "query": {
          const { sql, params, limit } = QuerySchema.parse(args);
          // Only allow SELECT statements for this tool
          if (!sql.trim().toUpperCase().startsWith("SELECT") && !sql.trim().toUpperCase().startsWith("WITH")) {
            throw new Error("Only SELECT statements are allowed for 'query' tool. Use 'execute_mutation' for others.");
          }

          const finalSql = sql.toLowerCase().includes("limit") ? sql : `${sql} LIMIT ${limit}`;
          const result = await pool.query(finalSql, params);
          return { content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }] };
        }

        case "list_tables": {
          const { schema } = ListTablesSchema.parse(args);
          const result = await pool.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE'",
            [schema]
          );
          return { content: [{ type: "text", text: JSON.stringify(result.rows.map(r => r.table_name), null, 2) }] };
        }

        case "describe_table": {
          const { table, schema } = DescribeTableSchema.parse(args);
          const columnsRes = await pool.query(
            `SELECT column_name, data_type, is_nullable, column_default 
             FROM information_schema.columns 
             WHERE table_schema = $1 AND table_name = $2 
             ORDER BY ordinal_position`,
            [schema, table]
          );

          const constraintsRes = await pool.query(
            `SELECT constraint_name, constraint_type 
             FROM information_schema.table_constraints 
             WHERE table_schema = $1 AND table_name = $2`,
            [schema, table]
          );

          return {
            content: [{
              type: "text",
              text: JSON.stringify({ columns: columnsRes.rows, constraints: constraintsRes.rows }, null, 2)
            }]
          };
        }

        case "list_indexes": {
          const { table, schema } = ListIndexesSchema.parse(args);
          const result = await pool.query(
            `SELECT indexname, indexdef 
             FROM pg_indexes 
             WHERE schemaname = $1 AND tablename = $2`,
            [schema, table]
          );
          return { content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }] };
        }

        case "execute_mutation": {
          const { sql, params } = ExecutionMutationSchema.parse(args);
          const result = await pool.query(sql, params);
          return {
            content: [{
              type: "text",
              text: `Success. Affected rows: ${result.rowCount}. Result: ${JSON.stringify(result.rows, null, 2)}`
            }]
          };
        }

        case "get_table_schema": {
          const { table, schema } = GetTableSchemaSchema.parse(args);
          // This is a simplified version - full DDL generation in Postgres is complex
          const columnsRes = await pool.query(
            `SELECT column_name, data_type, is_nullable, column_default 
             FROM information_schema.columns 
             WHERE table_schema = $1 AND table_name = $2`,
            [schema, table]
          );

          const ddl = `CREATE TABLE ${schema}.${table} (\n` +
            columnsRes.rows.map(c => `  ${c.column_name} ${c.data_type}${c.is_nullable === 'NO' ? ' NOT NULL' : ''}${c.column_default ? ' DEFAULT ' + c.column_default : ''}`).join(",\n") +
            "\n);";

          return { content: [{ type: "text", text: ddl }] };
        }

        case "search_data": {
          const { query: searchQuery, limit: searchLimit } = SearchDataSchema.parse(args);
          const schema = "public"; // Fixed to public schema for simplicity
          
          // Get all tables in the schema
          const tablesRes = await pool.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE'",
            [schema]
          );
          
          const results: Array<{
            table_name: string;
            column_name: string;
            value: string;
            row_count: number;
          }> = [];
          
          // Search in each table
          for (const tableRow of tablesRes.rows) {
            const tableName = tableRow.table_name;
            
            // Get text columns for this table
            const columnsRes = await pool.query(
              `SELECT column_name, data_type 
               FROM information_schema.columns 
               WHERE table_schema = $1 AND table_name = $2 
                 AND (data_type LIKE '%character%' OR data_type LIKE '%text%' OR data_type LIKE '%varchar%')`,
              [schema, tableName]
            );
            
            if (columnsRes.rows.length === 0) continue;
            
            // Build dynamic query to search in all text columns
            const columnConditions = columnsRes.rows.map(col => 
              `${col.column_name}::text ILIKE $1`
            ).join(" OR ");
            
            const searchSql = `
              SELECT 
                '${tableName}' as table_name,
                column_name,
                value::text,
                COUNT(*) OVER() as total_matches
              FROM (
                SELECT 
                  UNNEST(ARRAY[${columnsRes.rows.map(c => `'${c.column_name}'`).join(',')}]) as column_name,
                  UNNEST(ARRAY[${columnsRes.rows.map(c => c.column_name).join(',')}]) as value
                FROM ${schema}.${tableName}
                WHERE ${columnConditions}
                LIMIT ${searchLimit}
              ) subquery
            `;
            
            try {
              const searchRes = await pool.query(searchSql, [`%${searchQuery}%`]);
              
              for (const row of searchRes.rows) {
                results.push({
                  table_name: row.table_name,
                  column_name: row.column_name,
                  value: row.value,
                  row_count: row.total_matches
                });
                
                // Stop if we reached the limit
                if (results.length >= searchLimit) break;
              }
            } catch (error) {
              // Skip tables with errors (e.g., permission issues)
              console.error(`Error searching table ${tableName}:`, error instanceof Error ? error.message : String(error));
            }
            
            if (results.length >= searchLimit) break;
          }
          
          return { 
            content: [{ 
              type: "text", 
              text: results.length > 0 
                ? JSON.stringify(results.slice(0, searchLimit), null, 2)
                : `No results found for query "${searchQuery}"` 
            }] 
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  });

  return server;
}

// --- Server Lifecycle ---

async function startHttpServer(port: number = 9008) {
  console.error(`Attempting to start MCP HTTP Server on port ${port}...`);
  const app = createMcpExpressApp({ host: "0.0.0.0" });
  
  // Basic landing page for browser verification
  app.get("/", (_req: Request, res: Response) => {
    res.send("Postgres MCP Server is running!");
  });
  
  // Map to store transports by session ID
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  // MCP POST endpoint
  app.post("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    
    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      const transport = transports[sessionId];
      await transport.handleRequest(req, res, req.body);
      return;
    }

    if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableDnsRebindingProtection: false,
        onsessioninitialized: (sessionId) => {
          console.error(`Session initialized with ID: ${sessionId}`);
          transports[sessionId] = transport;
        }
      });

      // Create a new server instance for this session
      const server = createServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // Invalid request
    res.status(400).json({ error: "Invalid MCP request" });
  });

  // MCP GET endpoint (for Server-Sent Events)
  app.get("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).json({ error: "Missing or invalid session ID" });
      return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  });

  app.listen(port, "0.0.0.0", () => {
    console.error(`✅ Postgres MCP HTTP Server listening on port ${port}`);
    console.error(`📡 Access it at: http://0.0.0.0:${port}/mcp`);
  });
}

async function main() {
  const httpPort = process.env.MCP_HTTP_PORT ? parseInt(process.env.MCP_HTTP_PORT, 10) : null;
  
  if (httpPort) {
    await startHttpServer(httpPort);
  } else {
    const transport = new StdioServerTransport();
    const server = createServer();
    await server.connect(transport);
    console.error("Postgres MCP Server running on stdio");
  }
}

main().catch((error) => {
  console.error("Fatal error during server startup:", error);
  process.exit(1);
});
