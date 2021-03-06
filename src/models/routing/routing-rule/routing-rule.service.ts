import { FindManyOptions, getCustomRepository, getRepository, Repository } from "typeorm";
import { Application } from "../../../Application";
import { Service } from "../../../fonaments/services/service";
import { RoutingRule } from "./routing-rule.model";
import { IWhereUniqueRoutingRule, RoutingRuleRepository } from "./routing-rule.repository";

export interface ICreateRoutingRule {
    routingTableId: number;
    active?: boolean;
    comment?: string;
}

export interface IUpdateRoutingRule {
    routingTableId: number;
    active?: boolean;
    comment?: string;
}



export class RoutingRuleService extends Service {
    protected _repository: RoutingRuleRepository;

    constructor(app: Application) {
        super(app);
        this._repository = getCustomRepository(RoutingRuleRepository);
    }

    findOne(id: number): Promise<RoutingRule | undefined> {
        return this._repository.findOne(id);
    }

    find(criteria: FindManyOptions<RoutingRule>): Promise<RoutingRule[]> {
        return this._repository.find(criteria);   
    }
    
    findOneWithinFwCloud(criteria: IWhereUniqueRoutingRule): Promise<RoutingRule> {
        return this._repository.findOneWithinFwCloud(criteria);
    }

    findOneWithinFwCloudOrFail(criteria: IWhereUniqueRoutingRule): Promise<RoutingRule> {
        return this._repository.findOneWithinFwCloudOrFail(criteria);
    }

    async create(data: ICreateRoutingRule): Promise<RoutingRule> {
        const result: RoutingRule = await this._repository.save(data);
        return this._repository.findOneOrFail(result.id);
    }

    async update(criteria: IWhereUniqueRoutingRule, values: IUpdateRoutingRule): Promise<RoutingRule> {
        await this._repository.update(criteria.id, values);
        return this._repository.findOne(criteria.id);
    }

    async remove(criteria: IWhereUniqueRoutingRule): Promise<RoutingRule> {
        const rule: RoutingRule = await this.findOneWithinFwCloud(criteria);
        await this._repository.delete(criteria.id);

        return rule;
    }
}