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

import { Response } from "express";
import { isResponsable } from "../../fonaments/contracts/responsable"
import { InternalServerException } from "../exceptions/internal-server-exception";
import { HttpException } from "../exceptions/http/http-exception";
import { AbstractApplication, app } from "../abstract-application";
import { isArray } from "util";

export class ResponseBuilder {
    protected _status: number;
    protected _payload: object;
    protected _app: AbstractApplication;
    protected _response: Response;

    private constructor() {
        this._app = app();
    }

    public static buildResponse(): ResponseBuilder {
        return new ResponseBuilder();
    }

    public status(status: number): ResponseBuilder {
        this._status = status;
        return this;
    }

    public body(payload: any): ResponseBuilder {
        this._payload = this.buildResponse(payload);

        return this;
    }

    public send(response: Response): ResponseBuilder {
        this._response = response;
        
        if (this._status) {
            this._response.status(this._status);
        }

        this._response.send(this._payload);

        return this;
    }

    protected buildResponse(payload: any): Object {
        if (payload instanceof Error) {
            return this.buildErrorResponse(payload);
        }

        return {data: this.buildDataResponse(payload)};
    }

    protected buildDataResponse(payload: Object): Object {
        if (payload === null || payload === undefined) {
            return {};
        }

        if (isArray(payload)) {
            return this.buildArrayDataResponse(payload);
        }

        if (isResponsable(payload)) {
            return payload.toResponse();
        }

        return payload;
    }

    protected buildArrayDataResponse(payload: Array<any>): Array<Object> {
        const result: Array<Object> = [];

        for(let i = 0; i < payload.length; i++) {
            result.push(isResponsable(payload[i]) ? payload[i].toResponse() : payload[i]);
        }

        return result;
    }

    protected buildErrorResponse(payload: Error): Object {
        if (payload instanceof HttpException) {
            return payload.toResponse();
        }

        if (this._app.config.get('env') !== 'prod') {
            return {
                message: payload.message,
                stack: payload.stack
            };
        }

        // In case the exception is not an http exception we generate a 500 exception
        return this.buildErrorResponse(new InternalServerException());
    }
}