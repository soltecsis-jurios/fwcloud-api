import { getRepository } from "typeorm";
import { Application } from "../../../../../src/Application";
import { RoutingTableController } from "../../../../../src/controllers/routing/routing-tables/routing-tables.controller";
import { Firewall } from "../../../../../src/models/firewall/Firewall";
import { FwCloud } from "../../../../../src/models/fwcloud/FwCloud";
import { User } from "../../../../../src/models/user/User";
import StringHelper from "../../../../../src/utils/string.helper";
import { describeName, expect, testSuite } from "../../../../mocha/global-setup";
import { attachSession, createUser, generateSession } from "../../../../utils/utils";
import request = require("supertest");
import { _URL } from "../../../../../src/fonaments/http/router/router.service";
import { RoutingTable } from "../../../../../src/models/routing/routing-table/routing-table.model";
import { RoutingTableService } from "../../../../../src/models/routing/routing-table/routing-table.service";
import { Tree } from "../../../../../src/models/tree/Tree";

describe(describeName('Routing Table E2E Tests'), () => {
    let app: Application;
    let loggedUser: User;
    let loggedUserSessionId: string;
    
    let adminUser: User;
    let adminUserSessionId: string;

    let fwCloud: FwCloud;
    let firewall: Firewall;

    beforeEach(async () => {
        app = testSuite.app;
        
        loggedUser = await createUser({role: 0});
        loggedUserSessionId = generateSession(loggedUser);

        adminUser = await createUser({role: 1});
        adminUserSessionId = generateSession(adminUser);

        fwCloud = await getRepository(FwCloud).save(getRepository(FwCloud).create({
            name: StringHelper.randomize(10)
        }));

        firewall = await getRepository(Firewall).save(getRepository(Firewall).create({
            name: StringHelper.randomize(10),
            fwCloudId: fwCloud.id
        }));

        await Tree.createAllTreeCloud(fwCloud) as {id: number};
        const node: {id: number} = await Tree.getNodeByNameAndType(fwCloud.id, 'FIREWALLS', 'FDF') as {id: number};
        await Tree.insertFwc_Tree_New_firewall(fwCloud.id, node.id, firewall.id);
    });

    describe(RoutingTableController.name, () => {
        describe('@index', () => {
            let table: RoutingTable;
            let tableService: RoutingTableService;
        
            beforeEach(async () => {
                tableService = await app.getService(RoutingTableService.name);
                table = await tableService.create({
                    firewallId: firewall.id,
                    name: 'name',
                    number: 1,
                    comment: null
                });
    
            });

            it('guest user should not see a routing tables', async () => {
				return await request(app.express)
					.get(_URL().getURL('fwclouds.firewalls.routing.tables.index', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                    }))
					.expect(401);
			});

            it('regular user which does not belong to the fwcloud should not see tables', async () => {
                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.routing.tables.index', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(401)
            });

            it('regular user which belongs to the fwcloud should see tables', async () => {
                loggedUser.fwClouds = [fwCloud];
                await getRepository(User).save(loggedUser);

                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.routing.tables.index', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(200)
                    .then(response => {
                        expect(response.body.data).to.have.length(1);
                    });
            });

            it('admin user should see routing tables', async () => {
                return await request(app.express)
                .get(_URL().getURL('fwclouds.firewalls.routing.tables.index', {
                    fwcloud: fwCloud.id,
                    firewall: firewall.id,
                }))
                .set('Cookie', [attachSession(adminUserSessionId)])
                .expect(200)
                .then(response => {
                    expect(response.body.data).to.have.length(1);
                });
            });


        });

        describe('@show', () => {
            let table: RoutingTable;
            let tableService: RoutingTableService;
        
            beforeEach(async () => {
                tableService = await app.getService(RoutingTableService.name);
                table = await tableService.create({
                    firewallId: firewall.id,
                    name: 'name',
                    number: 1,
                    comment: null
                });
    
            });

            it('guest user should not see a routing table', async () => {
				return await request(app.express)
					.get(_URL().getURL('fwclouds.firewalls.routing.tables.show', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        routingTable: table.id
                    }))
					.expect(401);
			});

            it('regular user which does not belong to the fwcloud should not see the table', async () => {
                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.routing.tables.show', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        routingTable: table.id
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(401)
            });

            it('regular user which belongs to the fwcloud should see the table', async () => {
                loggedUser.fwClouds = [fwCloud];
                await getRepository(User).save(loggedUser);

                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.routing.tables.show', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        routingTable: table.id
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(200)
                    .then(response => {
                        expect(response.body.data).to.deep.eq(table);
                    });
            });

            it('admin user should see routing table', async () => {
                return await request(app.express)
                .get(_URL().getURL('fwclouds.firewalls.routing.tables.show', {
                    fwcloud: fwCloud.id,
                    firewall: firewall.id,
                    routingTable: table.id
                }))
                .set('Cookie', [attachSession(adminUserSessionId)])
                .expect(200)
                .then(response => {
                    expect(response.body.data).to.deep.eq(table);
                });
            });


        });

        describe('@create', () => {
            it('guest user should not create a routing table', async () => {
				return await request(app.express)
					.post(_URL().getURL('fwclouds.firewalls.routing.tables.store', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                    }))
					.send({
                        number: 1,
                        name: 'table'
                    })
					.expect(401);
			});

            it('regular user which does not belong to the fwcloud should not create the table', async () => {
                return await request(app.express)
                    .post(_URL().getURL('fwclouds.firewalls.routing.tables.store', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                    }))
                    .send({
                        number: 1,
                        name: 'table'
                    })
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(401)
            });

            it('regular user which belongs to the fwcloud should create the table', async () => {
                loggedUser.fwClouds = [fwCloud];
                await getRepository(User).save(loggedUser);

                return await request(app.express)
                    .post(_URL().getURL('fwclouds.firewalls.routing.tables.store', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                    }))
                    .send({
                        number: 1,
                        name: 'table'
                    })
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(201)
                    .then(response => {
                        expect(response.body.data.firewallId).to.eq(firewall.id);
                        expect(response.body.data.name).to.eq('table');
                        expect(response.body.data.number).to.eq(1);
                    });
            });

            it('admin user should create routing table', async () => {
                return await request(app.express)
                    .post(_URL().getURL('fwclouds.firewalls.routing.tables.store', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                    }))
                    .send({
                        number: 1,
                        name: 'table'
                    })
                    .set('Cookie', [attachSession(adminUserSessionId)])
                    .expect(201)
                    .then(response => {
                        expect(response.body.data.firewallId).to.eq(firewall.id);
                        expect(response.body.data.name).to.eq('table');
                        expect(response.body.data.number).to.eq(1);
                    });
            });


        });

        describe('@update', () => {
            let table: RoutingTable;
            let tableService: RoutingTableService;
        
            beforeEach(async () => {
                tableService = await app.getService(RoutingTableService.name);
                table = await tableService.create({
                    firewallId: firewall.id,
                    name: 'name',
                    number: 1,
                    comment: null
                });
    
            });

            it('guest user should not update a routing table', async () => {
				return await request(app.express)
					.put(_URL().getURL('fwclouds.firewalls.routing.tables.update', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        routingTable: table.id
                    }))
					.send({
                        name: 'table',
                        comment: 'table'
                    })
					.expect(401);
			});

            it('regular user which does not belong to the fwcloud should not create the table', async () => {
                return await request(app.express)
                    .put(_URL().getURL('fwclouds.firewalls.routing.tables.update', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        routingTable: table.id
                    }))
                    .send({
                        name: 'table',
                        comment: 'table'
                    })
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(401)
            });

            it('regular user which belongs to the fwcloud should update the table', async () => {
                loggedUser.fwClouds = [fwCloud];
                await getRepository(User).save(loggedUser);

                return await request(app.express)
                    .put(_URL().getURL('fwclouds.firewalls.routing.tables.update', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        routingTable: table.id
                    }))
                    .send({
                        name: 'table',
                        comment: 'table'
                    })
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(200)
                    .then(response => {
                        expect(response.body.data.comment).to.eq('table');
                    });
            });

            it('admin user should create routing table', async () => {
                return await request(app.express)
                    .put(_URL().getURL('fwclouds.firewalls.routing.tables.update', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        routingTable: table.id
                    }))
                    .send({
                        name: 'table',
                        comment: 'other_table'
                    })
                    .set('Cookie', [attachSession(adminUserSessionId)])
                    .expect(200)
                    .then(response => {
                        expect(response.body.data.comment).to.eq('other_table');
                    });
            });


        });

        describe('@remove', () => {
            let table: RoutingTable;
            let tableService: RoutingTableService;
        
            beforeEach(async () => {
                tableService = await app.getService(RoutingTableService.name);
                table = await tableService.create({
                    firewallId: firewall.id,
                    name: 'name',
                    number: 1,
                    comment: null
                });
    
            });

            it('guest user should not remove a routing table', async () => {
				return await request(app.express)
					.delete(_URL().getURL('fwclouds.firewalls.routing.tables.delete', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        routingTable: table.id
                    }))
					.expect(401);
			});

            it('regular user which does not belong to the fwcloud should not remove the table', async () => {
                return await request(app.express)
                    .delete(_URL().getURL('fwclouds.firewalls.routing.tables.delete', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        routingTable: table.id
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(401)
            });

            it('regular user which belongs to the fwcloud should remove the table', async () => {
                loggedUser.fwClouds = [fwCloud];
                await getRepository(User).save(loggedUser);

                return await request(app.express)
                    .delete(_URL().getURL('fwclouds.firewalls.routing.tables.delete', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        routingTable: table.id
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(200)
                    .then(async () => {
                        expect(await tableService.findOne(table.id)).to.be.undefined
                    });
            });

            it('admin user should create routing table', async () => {
                return await request(app.express)
                    .delete(_URL().getURL('fwclouds.firewalls.routing.tables.delete', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        routingTable: table.id
                    }))
                    .set('Cookie', [attachSession(adminUserSessionId)])
                    .expect(200)
                    .then(async () => {
                        expect(await tableService.findOne(table.id)).to.be.undefined
                    });
            });


        });
    });
});