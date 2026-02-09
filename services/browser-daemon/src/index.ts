import { entry } from "@lab/entry-point";
import { env } from "./env";
import { main } from "./main";
import { setup } from "./setup";

entry({ name: "browser-daemon", env, setup, main });
