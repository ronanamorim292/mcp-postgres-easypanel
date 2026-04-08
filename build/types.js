import { z } from "zod";
export const QuerySchema = z.object({
    sql: z.string().describe("The SQL query to execute. Use parameterized queries if possible (e.g., $1, $2) and provide values in the parameters array."),
    params: z.array(z.any()).optional().describe("Values for parameterized queries."),
    limit: z.number().int().min(1).max(1000).default(100).describe("Maximum number of rows to return."),
});
export const ListTablesSchema = z.object({
    schema: z.string().default("public").describe("The database schema to list tables from."),
});
export const DescribeTableSchema = z.object({
    table: z.string().describe("The name of the table to describe."),
    schema: z.string().default("public").describe("The schema where the table is located."),
});
export const ListIndexesSchema = z.object({
    table: z.string().describe("The name of the table to list indexes for."),
    schema: z.string().default("public").describe("The schema where the table is located."),
});
export const ExecutionMutationSchema = z.object({
    sql: z.string().describe("The SQL mutation (INSERT, UPDATE, DELETE) to execute."),
    params: z.array(z.any()).optional().describe("Values for parameterized mutations."),
});
export const GetTableSchemaSchema = z.object({
    table: z.string().describe("The name of the table to get the full schema (DDL) for."),
    schema: z.string().default("public").describe("The schema where the table is located."),
});
export const SearchDataSchema = z.object({
    query: z.string().describe("The keyword to search for in any column across all tables."),
    limit: z.number().int().min(1).max(100).default(50).describe("Maximum results."),
});
