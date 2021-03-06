import { EntityRepository, Repository, SelectQueryBuilder } from "typeorm";
import { Route } from "./route.model";

export interface FindOneWithinFwCloud {
    id: number;
    routingTableId: number;
    firewallId: number;
    fwCloudId: number;
}

@EntityRepository(Route)
export class RouteRepository extends Repository<Route> {
    findOneWithinFwCloud(criteria: FindOneWithinFwCloud): Promise<Route | undefined> {
        return this.getFindOneWithinFwCloudQueryBuilder(criteria).getOne();
    }

    findOneWithinFwCloudOrFail(criteria: FindOneWithinFwCloud): Promise<Route> {
        return this.getFindOneWithinFwCloudQueryBuilder(criteria).getOneOrFail();
    }

    protected getFindOneWithinFwCloudQueryBuilder(criteria: FindOneWithinFwCloud): SelectQueryBuilder<Route> {
        return this.createQueryBuilder("route")
            .innerJoinAndSelect("route.routingTable", "table")
            .innerJoinAndSelect("table.firewall", "firewall")
            .innerJoinAndSelect("firewall.fwCloud", "fwcloud")
            .where("route.id = :id", {id: criteria.id})
            .andWhere("table.id = :routingTableId", {routingTableId: criteria.routingTableId})
            .andWhere("firewall.id = :firewallId", {firewallId: criteria.firewallId})
            .andWhere("fwcloud.id = :fwCloudId", {fwCloudId: criteria.fwCloudId})
    }
}