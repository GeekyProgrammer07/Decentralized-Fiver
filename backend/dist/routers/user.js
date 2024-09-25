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
const middleware_1 = require("./middleware");
const s3_presigned_post_1 = require("@aws-sdk/s3-presigned-post");
const s3Client = new client_s3_1.S3Client({
    region: "eu-north-1",
    credentials: {
        accessKeyId: "AKIAYZZGTKGDFVGHLSOP",
        secretAccessKey: "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",
    },
});
const router = (0, express_1.Router)();
const prismaClient = new client_1.PrismaClient();
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
    console.log({ url, fields });
    // const preSignedUrl = await getSignedUrl(s3Client, command, {
    //   expiresIn: 3600,
    // });
    res.json({
        preSignedUrl: url
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
//When user comes in they need to it this endpoint with a message
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
