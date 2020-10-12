import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import authConfig from "../../config/auth.json";

module.exports = (request: Request, response: Response, next) => {
  const authHeader = request.headers.authorization;
  let parts: any;
  userId: Number;
  
  if (!authHeader)
    return response.status(401).send({ error: "No Token Provided" });

  parts = authHeader.split(" ");

  if (!parts.length === 2)
    return response.status(401).send({ error: "Token error" });

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme))
    return response.status(401).send({ error: "Token malformatted" });

  jwt.verify(token, authConfig.secret, (err: any, decoded: any) => {
    if (err) return response.status(401).send({ error: "Token invalid" });

    request.userId = decoded.id;
    return next();
  });
};
