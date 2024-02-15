import { Store } from "@sapphire/pieces";
import { Route } from "./Route.js";

export class RouteStore extends Store<Route> {
    public constructor() {
        super(Route, { name: "routes" });
    }
}
