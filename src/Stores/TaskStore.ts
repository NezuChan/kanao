import { Store } from "@sapphire/pieces";
import { cast, Constructor } from "@sapphire/utilities";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Task } from "./Task.js";

export class TaskStore extends Store<Task> {
    public constructor() {
        super(cast<Constructor<Task>>(Task), { name: "tasks" });
        this.registerPath(resolve(dirname(fileURLToPath(import.meta.url)), "..", "Tasks"));
    }
}
