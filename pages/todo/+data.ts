// https://vike.dev/data

import * as pgQueries from "../../database/postgres/queries/todos";
import type { PageContextServer } from "vike/types";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(_pageContext: PageContextServer) {
  const todoItemsInitial = await pgQueries.getAllTodos(_pageContext.db);

  return { todoItemsInitial };
}
