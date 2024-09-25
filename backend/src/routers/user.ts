import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import jwt from "jsonwebtoken";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { JWT_SECRET } from "..";
import { authMiddleware } from "./middleware";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";


const s3Client = new S3Client({
  region: "eu-north-1",
  credentials: {
    accessKeyId: "AKIAYZZGTKGDFVGHLSOP",
    secretAccessKey: "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",
  },
});

const router = Router();

const prismaClient = new PrismaClient();

router.get("/presignedUrl", authMiddleware, async (req, res) => {
  //@ts-ignore
  const userId = req.userId;

  // Use the globally defined s3Client with region and credentials
  // const command = new PutObjectCommand({
  //   Bucket: "suman-decentralized-fiver",
  //   Key: `/fiver/${userId}/${Math.random()}/image.jpg`,
  //   ContentType: "image/jpg",
  // });

  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: "suman-decentralized-fiver",
    Key: `fiver/${userId}/${Math.random()}/image.jpg`,
    Conditions: [
      ["content-length-range", 0, 5 * 1024 * 1024], // 5 MB max
    ],
    Fields: {
      "Content-Type": "image/png",
    },
    Expires: 3600,
  });

  // const preSignedUrl = await getSignedUrl(s3Client, command, {
  //   expiresIn: 3600,
  // });

  res.json({
    preSignedUrl: url,
    fields
  });
});

// router.get("/presignedUrl", authMiddleware, async (req, res) => {
//   //@ts-ignore
//   const userId = req.userId;
//   const s3Client = new S3Client();
//   const command = new PutObjectCommand({
//     Bucket: "suman-decentralized-fiver",
//     Key: `/fiver/${userId}/${Math.random()}/image.jpg`,
//     ContentType: "image/jpg",
//   });

//   const preSignedUrl = await getSignedUrl(s3Client, command, {
//     expiresIn: 3600,
//   });
//   console.log(`Signed URL: ${preSignedUrl}`);
//   res.json({
//     preSignedUrl,
//   });
// });

//Created a single Endpoint /signin
//When user comes in they need to it this endpoint with a message
router.post("/signin", async (req, res) => {
  const hardcodedWalletAddress = "G7jhzaFgfDnVRXDUnHQpZewPp5G8GKzjNmqHtVDr9vG9";

  //checks does the user exists with the above hardcoded address
  const existingUser = await prismaClient.user.findFirst({
    where: {
      address: hardcodedWalletAddress,
    },
  });

  //if the user exists then we sign the token using the id of that user and return it to the frontend
  if (existingUser) {
    const token = jwt.sign(
      {
        userId: existingUser.id,
      },
      JWT_SECRET
    );
    res.json({
      token,
    });
  } else {
    //else we create a new user and return the id of the newly created user to the frontend
    const user = await prismaClient.user.create({
      data: {
        address: hardcodedWalletAddress,
      },
    });

    const token = jwt.sign(
      {
        userId: user.id,
      },
      JWT_SECRET
    );
    res.json({
      token,
    });
  }
});

export default router;
