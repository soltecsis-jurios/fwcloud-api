import { Middleware } from "../fonaments/http/middleware/Middleware";
import { Request, Response, NextFunction } from "express";
import { RequestInputs } from "../fonaments/http/RequestInputs";

export class RequestBuilder extends Middleware {
    public handle(req: Request, res: Response, next: NextFunction) {
        req.inputs = new RequestInputs(req);
        next();
    }
}