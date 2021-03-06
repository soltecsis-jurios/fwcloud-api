import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Firewall } from "../../firewall/Firewall";
import Model from "../../Model";
import { RoutingRule } from "../routing-rule/routing-rule.model";

const tableName: string = 'routing_g';

@Entity(tableName)
export class RoutingGroup extends Model {
    
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    comment: string;

    @Column({name: 'firewall'})
    firewallId: number;

    @ManyToOne(type => Firewall, firewall => firewall.routingGroups)
    @JoinColumn({
        name: 'firewall'
    })
    firewall: Firewall;

    @OneToMany(type => RoutingRule, routingRule => routingRule.routingGroup, {
        eager: true
    })
	routingRules: RoutingRule[];

    public getTableName(): string {
        return tableName;
    }

    toJSON(): any {
        return this;
    }

}