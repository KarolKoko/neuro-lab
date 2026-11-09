import * as pgQueries from "../../database/postgres/queries/forms";
import type { PageContextServer } from "vike/types";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(_pageContext: PageContextServer) {
  const formsListInit = await pgQueries.getForms(_pageContext.db);

  return { formsListInit };
}