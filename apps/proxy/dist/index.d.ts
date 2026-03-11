import { Orchestrator } from './orchestrator';
import { FleetRegistry } from './fleet-registry';
import { StatsCollector } from './stats-collector';
declare const app: import("express-serve-static-core").Express;
declare const orchestrator: Orchestrator;
declare const fleetRegistry: FleetRegistry;
declare const statsCollector: StatsCollector;
export default app;
export { orchestrator, fleetRegistry, statsCollector };
//# sourceMappingURL=index.d.ts.map