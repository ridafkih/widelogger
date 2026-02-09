import { widelog } from "../logging";
import type { Handler, InfraContext } from "../types/route";

const GET: Handler<InfraContext> = async ({ context: ctx }) => {
  const { data } = await ctx.opencode.provider.list();
  widelog.set("provider.count", data?.all?.length ?? 0);
  widelog.set("provider.connected_count", data?.connected?.length ?? 0);
  return Response.json(data);
};

export { GET };
