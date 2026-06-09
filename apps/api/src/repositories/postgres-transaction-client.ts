export type PostgresQueryResult = {
  rowCount: number;
  rows: readonly Record<string, unknown>[];
};

export interface PostgresTransactionClient {
  query(sql: string, params?: readonly unknown[]): Promise<PostgresQueryResult>;
}
