// We use Telefunc (https://telefunc.com) for data mutations.

import * as pgQueries from "../../database/postgres/queries/todos";
import { getContext } from "telefunc";

export async function onNewTodo({ text }: { text: string }) {
  const context = getContext();
  await pgQueries.insertTodo(context.db, text);
}
