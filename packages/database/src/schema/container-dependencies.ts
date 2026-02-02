import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { containers } from "./containers";

export const containerDependencies = pgTable("container_dependencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  containerId: uuid("container_id")
    .notNull()
    .references(() => containers.id, { onDelete: "cascade" }),
  dependsOnContainerId: uuid("depends_on_container_id")
    .notNull()
    .references(() => containers.id, { onDelete: "cascade" }),
  condition: text("condition").notNull().default("service_started"),
});

export type ContainerDependency = typeof containerDependencies.$inferSelect;
export type NewContainerDependency = typeof containerDependencies.$inferInsert;
