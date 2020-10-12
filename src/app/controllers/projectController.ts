import {Request, Response} from 'express'

export default class ProjectController {
    async show (request: Request, response: Response) {
        response.send ({ok: true, user: request.userId})
    }
}