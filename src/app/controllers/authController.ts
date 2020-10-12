import { Request, Response } from "express";
import db from "../../database/connection";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import mailer from "../../modules/mailer";
import authConfig from "../../config/auth";

function generateToken(params: any) {
  return jwt.sign(params, authConfig.secret, {
    expiresIn: 3600,
  });
}

function hashPassword(password: any) {
  const saltRounds = 10;
  return bcrypt.hashSync(password.toString(), saltRounds);
}

export default class AuthController {
  async create(request: Request, response: Response) {
    const { name, email, password, confirmPassword } = request.body;

    try {
      if (confirmPassword !== password)
        return response
          .status(403)
          .json({ message: "Password doesn´t Match!" });

      const EmailAlreadyExists = await db("users").where("email", email);

      if (EmailAlreadyExists.length === 1)
        return response.status(400).json({ error: "Email Already exists" });

      const user = await db("users").insert({
        name,
        email,
        password: hashPassword({ password }),
      });
      return response
        .status(201)
        .send({ token: generateToken({ id: user[0].id }) });
    } catch (error) {
      return response.status(400).send({ error: "Registration Failed" });
    }
  }

  async authenticate(request: Request, response: Response) {
    const { email, password } = request.body;

    const user = await db("users").where("email", email);

    if (user.length !== 1)
      return response.status(400).json({ error: "User not Found" });

    if (!(await bcrypt.compare(password.toString(), user[0].password)))
      return response.status(400).json({ error: "Invalid Password" });

    user[0].password = undefined;

    const token = jwt.sign({ id: user[0].id }, authConfig.secret, {
      expiresIn: 3600,
    });

    return response.send({ user, token: generateToken({ id: user[0].id }) });
  }

  async forgotPassword(request: Request, response: Response) {
    const { email } = request.body;

    try {
      const user = await db("users").where("email", email);

      if (user.length !== 1)
        return response.status(400).json({ error: "User not Found" });

      const token = crypto.randomBytes(20).toString("hex");

      const now = new Date();
      now.setHours(now.getHours() + 1);

      await db("users")
        .update({
          passwordResetToken: token,
          passwordResetExpires: now.toString(),
        })
        .where("email", email);

      mailer.sendMail(
        {
          from: "recuperacao@senha.com",
          to: email,
          subject: "Recuperação de Senha ✔",
          html: `<p>Você <strong>${email}</strong>, solicitou a recuperação de senha? Utilize esse token: <strong>${token}</strong></p>`,
        },
        (error: any) => {
          if (error) {
            return response
              .status(400)
              .json({ error: "Cannot send email forgot password, try again" });
          }
          return response.status(200).send();
        }
      );
    } catch (error) {
      console.log(error);
      response
        .status(400)
        .send({ error: "Error on forgot password, try again" });
    }
  }

  async resetPassword(request: Request, response: Response) {
    const { email, token, password, confirmNewPassword } = request.body;

    try {
      if (confirmNewPassword !== password)
        return response
          .status(403)
          .json({ message: "Password confirmation doesn´t Match!" });

      const user = await db("users").where("email", email);

      if (user.length !== 1)
        return response.status(400).json({ error: "User not Found" });

      if (token !== user[0].passwordResetToken)
        return response.status(400).json({ error: "Token Invalid" });

      const now = new Date();

      if (now > user[0].passwordResetExpires)
        return response
          .status(400)
          .json({ error: "Token Expired, generate a new one" });

      await db("users")
        .update({ password: hashPassword({ password }) })
        .where("email", email);

      return response.send().status(200);
    } catch (error) {
      return response
        .status(400)
        .json({ error: "Cannot reset password , try again" });
    }
  }
}
