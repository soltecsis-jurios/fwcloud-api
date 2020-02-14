import { Middleware } from "../fonaments/http/middleware/Middleware";
import bodyParser from 'body-parser';
import { Request, Response, NextFunction } from "express";

export class BodyParser extends Middleware {
    public handle(req: Request, res: Response, next: NextFunction): void {
        (bodyParser.json())(req, res, next);
    }

}