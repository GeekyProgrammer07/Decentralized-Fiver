import { PrismaClient } from "@prisma/client";
import { response, Router } from "express";
import jwt from "jsonwebtoken";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { JWT_SECRET } from "..";
import { authMiddleware } from "../middleware";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { createTaskInput } from "../types";

const DEFAULT_TITLE = "Select the most Clickable Thubnail";

const s3Client = new S3Client({
  region: "eu-north-1",
  credentials: {
    accessKeyId: "AKIAYZZGTKGDFVGHLSOP",
    secretAccessKey: "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",
  },
});

const router = Router();

const prismaClient = new PrismaClient();


router.get("/task", authMiddleware, async (req, res) => {
  //@ts-ignore
  const taskId: string = req.query.taskId;
  //@ts-ignore
  const userId: string = req.userId;

  const taskDetails = await prismaClient.task.findFirst({
    where: {
      user_id: Number(userId),
      id: Number(taskId),
    },
    include: {
      options: true,
    },
  });

  if (!taskDetails) {
    return res.status(411).json({
      message: "You dont have access to this task",
    });
  }

  //To-do: Can you make it faster?
  const responses = await prismaClient.submission.findMany({
    where: {
      task_id: Number(taskId),
    },
    include: {
      option: true,
    },
  });

  const result: Record<
    string,
    {
      count: number;
      option: {
        imageUrl: string;
      };
    }
  > = {};

  taskDetails.options.forEach((option) => {
    result[option.id] = {
      count: 0,
      option: {
        imageUrl: option.image_url,
      },
    };
  });

  responses.forEach((r) => {
    result[r.option_id].count++;
  });

  res.json({
    result,
  });
});

router.post("/task", authMiddleware, async (req, res) => {
  //@ts-ignore
  const userId = req.userId;

  const body = req.body;

  const parseData = createTaskInput.safeParse(body);

  if (!parseData.success) {
    return res.status(411).json({
      message: "You've sent the wrong inputs",
    });
  }

  // Await the transaction and ensure it returns the response object
  const response = await prismaClient.$transaction(async (tx) => {

    const task = await tx.task.create({

      data: {
        title: parseData.data.title ?? DEFAULT_TITLE,
        amount: "1",
        signature: parseData.data.signature,
        user_id: userId,
      },
    });

    await tx.option.createMany({
      data: parseData.data.options.map((x) => ({
        image_url: x.imageUrl,
        task_id: task.id, // Ensure the correct task ID is used here
      })),
    });

    return task; // Return the task object to capture its ID later
  });

  // Now `response.id` should have the correct value
  res.json({
    id: response.id,
  });
});

// router.post("/task", authMiddleware, async (req, res) => {
//   //@ts-ignore
//   const userId = req.userId;
//   //validate the inputs from the user
//   const body = req.body;
//   const parseData = createTaskInput.safeParse(body);

//   if (!parseData.success) {
//     return res.status(411).json({
//       message: "You've sent the wrong inputs",
//     });
//   }

//   //parse the signature to ensure the person has paid $50

//   prismaClient.$transaction(async (tx) => {
//     let response = await tx.task.create({
//       data: {
//         title: parseData.data.title ?? DEFAULT_TITLE,
//         amount: "1",
//         signature: parseData.data.signature,
//         user_id: userId,
//       },
//     });

//     await tx.option.createMany({
//       data: parseData.data.options.map((x) => ({
//         image_url: x.imageUrl,
//         task_id: response.id,
//       })),
//     })

//     return response;

//   })
//   res.json({
//     id: response.id
//   })
// })

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
    fields,
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
//When user comes in they need to hit this endpoint with a message
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
  }
  else {

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
