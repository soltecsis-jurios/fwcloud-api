/*!
    Copyright 2019 SOLTECSIS SOLUCIONES TECNOLOGICAS, SLU
    https://soltecsis.com
    info@soltecsis.com


    This file is part of FWCloud (https://fwcloud.net).

    FWCloud is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    FWCloud is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with FWCloud.  If not, see <https://www.gnu.org/licenses/>.
*/

import { describeName, expect, testSuite } from "../../mocha/global-setup";
import { ImportMapping } from "../../../src/fwcloud-exporter/importer/mapper/import-mapping";
import { IdManager } from "../../../src/fwcloud-exporter/importer/mapper/id-manager";
import { DatabaseService } from "../../../src/database/database.service";
import { ExporterResults } from "../../../src/fwcloud-exporter/exporter/exporter-results";

let mapper: ImportMapping;
let databaseService: DatabaseService;

describe(describeName('Import mapping tests'), () => {
    
    beforeEach(async() => {
        databaseService = await testSuite.app.getService<DatabaseService>(DatabaseService.name);
    });

    it('ImportMapping.newId() should map the old id with a new id', async () => {
        const results: ExporterResults = new ExporterResults();
        results.addResults('fwcloud', 'FwCloud', [{id: 0}])
        const mapper = new ImportMapping(await IdManager.make(databaseService.connection.createQueryRunner(), [
            {tableName: 'fwcloud', entityName: 'FwCloud'}
        ]), results);

        const newId: number = mapper.getMappedId('fwcloud', 'id', 0);

        expect(newId).to.be.deep.eq(1);
        expect(mapper.maps).to.be.deep.eq({
            'fwcloud': {
                'id': [{
                    old: 0,
                    new: 1
                }]
            }
        })
    });

    it('ImportMapping.newId() should not map a new id if the id is not exported', async () => {
        const results: ExporterResults = new ExporterResults();
        results.addResults('fwcloud', 'FwCloud', [{id: 0}])
        const mapper = new ImportMapping(await IdManager.make(databaseService.connection.createQueryRunner(), [
            {tableName: 'fwcloud', entityName: 'FwCloud'}
        ]), results);

        const newId: number = mapper.getMappedId('fwcloud', 'id', 1);

        expect(newId).to.be.deep.eq(1);
        expect(mapper.maps).to.be.deep.eq({
            'fwcloud': {
                'id': [{
                    old: 1,
                    new: 1
                }]
            }
        })
    });

    it('ImportMapping.newId() should not map a new id if the table is not exported', async () => {
        const results: ExporterResults = new ExporterResults();
        
        const mapper = new ImportMapping(await IdManager.make(databaseService.connection.createQueryRunner(), []), results);

        const newId: number = mapper.getMappedId('fwcloud', 'id', 1);

        expect(newId).to.be.deep.eq(1);
        expect(mapper.maps).to.be.deep.eq({
            'fwcloud': {
                'id': [{
                    old: 1,
                    new: 1
                }]
            }
        })
    });
});