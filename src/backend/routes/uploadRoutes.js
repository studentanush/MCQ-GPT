import express from "express";
import { upload } from "../middleware/uploadMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";
import path from "path";

const router = express.Router();

router.post("/upload", protect, (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      console.error("Multer Upload Error:", err);
      return res.status(500).json({ message: "File upload failed", error: err.message });
    }

    if (!req.file) {
      console.error("Upload failed: No file received in request");
      return res.status(400).json({ message: "No file uploaded. Please select a file and try again." });
    }

    console.log("File received:", req.file.originalname, "Path:", req.file.path);
    
    res.json({
      message: "File uploaded successfully",
      filePath: path.resolve(req.file.path),
    });
  });
});

export default router;
