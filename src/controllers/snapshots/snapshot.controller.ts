import { Controller } from "../../fonaments/http/controller";
import { SnapshotService } from "../../snapshots/snapshot.service";
import { ResponseBuilder } from "../../fonaments/http/response-builder";
import { Snapshot } from "../../snapshots/snapshot";
import { SnapshotPolicy } from "../../policies/snapshot.policy";
import { Request } from "express";
import { NotFoundException } from "../../fonaments/exceptions/not-found-exception";
import { FwCloud } from "../../models/fwcloud/FwCloud";
import { RepositoryService } from "../../database/repository.service";
import { Progress } from "../../fonaments/http/progress/progress";

export class SnapshotController extends Controller {

    protected _snapshotService: SnapshotService;
    protected _repositoryService: RepositoryService;
    protected _fwCloud: FwCloud;

    public async make(request: Request) {
        this._snapshotService = await this._app.getService<SnapshotService>(SnapshotService.name);
        this._repositoryService = await this._app.getService<RepositoryService>(RepositoryService.name);
        this._fwCloud = await this._repositoryService.for(FwCloud).findOneOrFail(parseInt(request.params.fwcloud));
    }

    public async index(request: Request): Promise<ResponseBuilder> {
        const snapshots: Array<Snapshot> = await this._snapshotService.getAll(this._fwCloud);

        const result: Array<Snapshot> = [];

        for(let i = 0; i < snapshots.length; i++) {
            if ((await SnapshotPolicy.read(snapshots[i], request.session.user)).can()) {
                result.push(snapshots[i]);
            }
        }

        return ResponseBuilder.buildResponse().status(200).body(result);
    }

    public async show(request: Request): Promise<ResponseBuilder> {
        const snapshot: Snapshot = await this._snapshotService.findOneOrFail(this._fwCloud, parseInt(request.params.snapshot));

        if (!(await SnapshotPolicy.read(snapshot, request.session.user)).can()) {
            throw new NotFoundException();
        }

        return ResponseBuilder.buildResponse().status(200).body(snapshot);
    }

    public async store(request: Request): Promise<ResponseBuilder> {
        (await SnapshotPolicy.create(this._fwCloud, request.session.user)).authorize();

        const progress: Progress<Snapshot> = await this._snapshotService.store(request.inputs.get('name'), request.inputs.get('commnet', null), this._fwCloud);

        return ResponseBuilder.buildResponse().status(201).progress(progress, request.session.socket_id);
    }

    public async update(request: Request): Promise<ResponseBuilder> {
        let snapshot: Snapshot = await this._snapshotService.findOneOrFail(this._fwCloud, parseInt(request.params.snapshot));

        (await SnapshotPolicy.update(snapshot, request.session.user)).authorize();

        snapshot = await this._snapshotService.update(snapshot, {name: request.inputs.get('name'), comment: request.inputs.get('comment')});

        return ResponseBuilder.buildResponse().status(200).body(snapshot);
    }

    public async restore(request: Request): Promise<ResponseBuilder> {
        let snapshot: Snapshot = await this._snapshotService.findOneOrFail(this._fwCloud, parseInt(request.params.snapshot));

        (await SnapshotPolicy.restore(snapshot, request.session.user)).authorize();

        const progress: Progress<Snapshot> = this._snapshotService.restore(snapshot);

        return ResponseBuilder.buildResponse().status(200).progress(progress, request.session.socket_id);
    }

    public async destroy(request: Request): Promise<ResponseBuilder> {
        let snapshot: Snapshot = await this._snapshotService.findOneOrFail(this._fwCloud, parseInt(request.params.snapshot));

        (await SnapshotPolicy.destroy(snapshot, request.session.user)).authorize();

        snapshot = await this._snapshotService.destroy(snapshot);

        return ResponseBuilder.buildResponse().status(200).body(snapshot);
    }
}