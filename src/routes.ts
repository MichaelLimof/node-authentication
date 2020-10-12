import express from "express";
import ProjectController from "./app/controllers/projectController";
import AuthController from "./app/controllers/authController";
import authMiddleware from './app/middlewares/auth'
const routes = express.Router();

const authController = new AuthController();
const projectController = new ProjectController();

routes.post("/register", authController.create);
routes.post("/authenticate", authController.authenticate);
routes.post("/forgot_password", authController.forgotPassword);
routes.post("/reset_password", authController.resetPassword);

routes.use(authMiddleware)
routes.get('/projects', projectController.show)

export default routes;
 