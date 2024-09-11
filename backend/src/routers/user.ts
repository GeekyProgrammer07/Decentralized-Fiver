import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = "secret";

const router = Router();

const prismaClient = new PrismaClient();
//Created a single Endpoint /signin
//When user comes in they need to it this endpoint with a message 
router.post("/signin", async(req, res) => {
    const hardcodedWalletAddress = "G7jhzaFgfDnVRXDUnHQpZewPp5G8GKzjNmqHtVDr9vG9";

    //checks does the user exists with the above hardcoded address
    const existingUser = await prismaClient.user.findFirst({
        where: {
            address: hardcodedWalletAddress
        }
    })

    //if the user exists then we sign the token using the id of that user and return it to the frontend
    if (existingUser) {
        const token = jwt.sign({
            userId: existingUser.id
        }, JWT_SECRET)
        res.json({ 
            token 
        })
    } else { //else we create a new user and return the id of the newly created user to the frontend 
        const user = await prismaClient.user.create({
            data: {
                address: hardcodedWalletAddress,
            }
        })

        const token = jwt.sign({
            userId: user.id
        }, JWT_SECRET)
        res.json({
            token
        })
    }
    
});

export default router;