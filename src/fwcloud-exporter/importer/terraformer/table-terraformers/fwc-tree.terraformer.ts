import { TableTerraformer, TerraformHandlerCollection } from "../table-terraformer";
import { ImportMapping } from "../mapper/import-mapping";
import { QueryRunner } from "typeorm";
import { IPObjType } from "../../../../models/ipobj/IPObjType";
import { RepositoryService } from "../../../../database/repository.service";
import { app } from "../../../../fonaments/abstract-application";
import { Firewall } from "../../../../models/firewall/Firewall";

export class FwcTreeTerraformer extends TableTerraformer {
    public ipObjTypes: Array<IPObjType>;

    protected _typeToTableNameMapping: {[type: string]: string} = {
        'FIREWALL' : 'firewall',
        'CLUSTER' : 'cluster',
        'CA': 'ca'
    }

    public static async make(mapper: ImportMapping, queryRunner: QueryRunner): Promise<FwcTreeTerraformer> {
        const repositoryService: RepositoryService = await app().getService<RepositoryService>(RepositoryService.name);
        const terraformer: FwcTreeTerraformer = new FwcTreeTerraformer(mapper);
        terraformer.ipObjTypes = await repositoryService.for(IPObjType).find();
        return terraformer;
    }

    protected getIPObjTypeTable(ipObjType: IPObjType): string {
        return this._typeToTableNameMapping.hasOwnProperty(ipObjType.type) ? this._typeToTableNameMapping[ipObjType.type] : null;
    }

    protected getCustomHandlers(): TerraformHandlerCollection {
        const result = {};

        /**
         * id_obj references an id which table is depends on "ipObjType". For that reason, a custom handler is required.
         * This custom handler gets the ipObjType referenced and based on the mapping localized in _typeToTableNameMapping,
         * it calls the mapper in order to get the terraformed id
         */
        result['id_obj'] = (mapper: ImportMapping, row: any, value: any) => {
            if (row.hasOwnProperty('ipObjTypeId') && row.ipObjTypeId !== null) {

                const matches: Array<IPObjType> = this.ipObjTypes.filter((item: IPObjType) => {
                    return item.id === row['ipObjTypeId'];
                });

                if (matches.length === 1) {
                    const tableType: string = this.getIPObjTypeTable(matches[0]);
                    if (tableType) {
                        return mapper.getMappedId(tableType, IPObjType.getPrimaryKeys()[0].propertyName, value);
                    }
                }

                return value;
            }

            return mapper.getMappedId(Firewall._getTableName(), Firewall.getPrimaryKeys()[0].propertyName, value);
        }

        return result;
    }
}