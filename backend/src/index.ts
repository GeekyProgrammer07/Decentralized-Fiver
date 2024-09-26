import express from "express";
import userRouter from "./routers/user"
import workerRouter from "./routers/worker"

const app = express();

app.use(express.json()); //we expect the user to send us data in the body the data isn't passed unless we use this specific middleware

export const JWT_SECRET = "secret";

app.use("/v1/user", userRouter);
app.use("/v1/worker", workerRouter);
app.listen(3000)