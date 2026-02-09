import { entry } from "@lab/entry-point";
import { env } from "./env";
import { main } from "./main";
import { setup } from "./setup";

entry({ name: "mcp", env, setup, main });
