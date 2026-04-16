import express from "express";
import { upload } from "../middleware/uploadMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";
import path from "path";

const router = express.Router();

router.post("/upload", protect, upload.single("file"), (req, res) => {
  res.json({
    message: "File uploaded successfully",
    filePath: path.resolve(req.file.path), // Bug 4 fix: absolute path so Python server can find it
  });
});

export default router;
