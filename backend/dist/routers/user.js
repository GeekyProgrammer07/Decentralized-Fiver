"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_s3_1 = require("@aws-sdk/client-s3");
const __1 = require("..");
const middleware_1 = require("../middleware");
const s3_presigned_post_1 = require("@aws-sdk/s3-presigned-post");
const types_1 = require("../types");
const DEFAULT_TITLE = "Select the most Clickable Thubnail";
const s3Client = new client_s3_1.S3Client({
    region: "eu-north-1",
    credentials: {
        accessKeyId: "AKIAYZZGTKGDFVGHLSOP",
        secretAccessKey: "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",
    },
});
const router = (0, express_1.Router)();
const prismaClient = new client_1.PrismaClient();
router.get("/task", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const taskId = req.query.taskId;
    //@ts-ignore
    const userId = req.userId;
    try {
        // Fetch task details based on userId and taskId
        const taskDetails = yield prismaClient.task.findFirst({
            where: {
                user_id: Number(userId),
                id: {
                    equals: Number(taskId), // Explicitly compare the id
                },
            },
            include: {
                options: true, // Fetch options associated with the task
            },
        });
        if (!taskDetails) {
            return res.status(411).json({
                message: "You don't have access to this task",
            });
        }
        // Optimized query to count responses grouped by option_id
        const responses = yield prismaClient.submission.groupBy({
            by: ["option_id"],
            where: {
                task_id: Number(taskId),
            },
            _count: true, // Get count for each option_id
        });
        const result = {};
        // Initialize the result object with options and image URLs
        taskDetails.options.forEach((option) => {
            result[option.id] = {
                count: 0,
                option: {
                    imageUrl: option.image_url,
                },
            };
        });
        // Populate the count of responses for each option
        responses.forEach((r) => {
            result[r.option_id].count = r._count; // Assign the count to each option
        });
        res.json({
            result,
        });
    }
    catch (error) {
        console.error("Error fetching task details:", error);
        res.status(500).json({
            message: "An error occurred while fetching the task details.",
            error: error instanceof Error ? error.message : String(error), // Safely handle the error message
        });
    }
}));
// router.get("/task", authMiddleware, async (req, res) => {
//   //@ts-ignore
//   const taskId: string = req.query.taskId;
//   //@ts-ignore
//   const userId: string = req.userId;
//   const taskDetails = await prismaClient.task.findFirst({
//     where: {
//       user_id: Number(userId),
//       id: Number(taskId),
//     },
//     include: {
//       options: true,
//     },
//   });
//   if (!taskDetails) {
//     return res.status(411).json({
//       message: "You dont have access to this task",
//     });
//   }
//   //To-do: Can you make it faster?
//   const responses = await prismaClient.submission.findMany({
//     where: {
//       task_id: Number(taskId),
//     },
//     include: {
//       option: true,
//     },
//   });
//   const result: Record<
//     string,
//     {
//       count: number;
//       option: {
//         imageUrl: string;
//       };
//     }
//   > = {};
//   taskDetails.options.forEach((option) => {
//     result[option.id] = {
//       count: 0,
//       option: {
//         imageUrl: option.image_url,
//       },
//     };
//   });
//   responses.forEach((r) => {
//     result[r.option_id].count++;
//   });
//   res.json({
//     result,
//   });
// });
router.post("/task", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const userId = req.userId;
    const body = req.body;
    const parseData = types_1.createTaskInput.safeParse(body);
    if (!parseData.success) {
        return res.status(411).json({
            message: "You've sent the wrong inputs",
        });
    }
    // Await the transaction and ensure it returns the response object
    const response = yield prismaClient.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const task = yield tx.task.create({
            data: {
                title: (_a = parseData.data.title) !== null && _a !== void 0 ? _a : DEFAULT_TITLE,
                amount: "1",
                signature: parseData.data.signature,
                user_id: userId,
            },
        });
        yield tx.option.createMany({
            data: parseData.data.options.map((x) => ({
                image_url: x.imageUrl,
                task_id: task.id, // Ensure the correct task ID is used here
            })),
        });
        return task; // Return the task object to capture its ID later
    }));
    // Now `response.id` should have the correct value
    res.json({
        id: response.id,
    });
}));
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
router.get("/presignedUrl", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const userId = req.userId;
    // Use the globally defined s3Client with region and credentials
    // const command = new PutObjectCommand({
    //   Bucket: "suman-decentralized-fiver",
    //   Key: `/fiver/${userId}/${Math.random()}/image.jpg`,
    //   ContentType: "image/jpg",
    // });
    const { url, fields } = yield (0, s3_presigned_post_1.createPresignedPost)(s3Client, {
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
}));
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
router.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const hardcodedWalletAddress = "G7jhzaFgfDnVRXDUnHQpZewPp5G8GKzjNmqHtVDr9vG9";
    //checks does the user exists with the above hardcoded address
    const existingUser = yield prismaClient.user.findFirst({
        where: {
            address: hardcodedWalletAddress,
        },
    });
    //if the user exists then we sign the token using the id of that user and return it to the frontend
    if (existingUser) {
        const token = jsonwebtoken_1.default.sign({
            userId: existingUser.id,
        }, __1.JWT_SECRET);
        res.json({
            token,
        });
    }
    else {
        //else we create a new user and return the id of the newly created user to the frontend
        const user = yield prismaClient.user.create({
            data: {
                address: hardcodedWalletAddress,
            },
        });
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
        }, __1.JWT_SECRET);
        res.json({
            token,
        });
    }
}));
exports.default = router;
