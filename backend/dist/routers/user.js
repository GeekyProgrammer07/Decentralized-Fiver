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
const JWT_SECRET = "secret";
const router = (0, express_1.Router)();
const prismaClient = new client_1.PrismaClient();
//Created a single Endpoint /signin
//When user comes in they need to it this endpoint with a message 
router.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const hardcodedWalletAddress = "G7jhzaFgfDnVRXDUnHQpZewPp5G8GKzjNmqHtVDr9vG9";
    //checks does the user exists with the above hardcoded address
    const existingUser = yield prismaClient.user.findFirst({
        where: {
            address: hardcodedWalletAddress
        }
    });
    //if the user exists then we sign the token using the id of that user and return it to the frontend
    if (existingUser) {
        const token = jsonwebtoken_1.default.sign({
            userId: existingUser.id
        }, JWT_SECRET);
        res.json({
            token
        });
    }
    else { //else we create a new user and return the id of the newly created user to the frontend 
        const user = yield prismaClient.user.create({
            data: {
                address: hardcodedWalletAddress,
            }
        });
        const token = jsonwebtoken_1.default.sign({
            userId: user.id
        }, JWT_SECRET);
        res.json({
            token
        });
    }
}));
exports.default = router;
