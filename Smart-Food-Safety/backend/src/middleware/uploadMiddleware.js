const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadFolder = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

// Inspect actual magic byte signatures of image formats
function detectImageSignature(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WEBP: RIFF .... WEBP
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder);
  },

  filename: function (req, file, cb) {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const safeExt = rawExt === ".jpeg" ? ".jpg" : rawExt;
    // Cryptographically secure UUID filename - original name is NEVER used
    const uniqueName = `${crypto.randomUUID()}${safeExt}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExts = [".jpg", ".jpeg", ".png", ".webp"];
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExts.includes(ext) || !allowedMimes.includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG and WEBP images are allowed."));
  }

  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB maximum
  }
});

// Middleware to verify physical file magic bytes on disk and prevent MIME spoofing
const validateUploadedFile = (req, res, next) => {
  const filesToValidate = [];
  if (req.file) filesToValidate.push(req.file);
  if (Array.isArray(req.files)) filesToValidate.push(...req.files);

  for (const file of filesToValidate) {
    try {
      if (!fs.existsSync(file.path)) continue;

      // Read initial 16 bytes for magic number identification
      const fd = fs.openSync(file.path, "r");
      const buffer = Buffer.alloc(16);
      fs.readSync(fd, buffer, 0, 16, 0);
      fs.closeSync(fd);

      const detectedMime = detectImageSignature(buffer);

      if (!detectedMime) {
        // Remove invalid/spoofed file from disk
        fs.unlinkSync(file.path);
        return res.status(400).json({
          success: false,
          message: "Invalid file content. Uploaded file does not contain authentic JPEG, PNG, or WEBP image signatures."
        });
      }

      // Verify extension matches detected signature
      const ext = path.extname(file.filename).toLowerCase();
      const validExtensions = {
        "image/jpeg": [".jpg", ".jpeg"],
        "image/png": [".png"],
        "image/webp": [".webp"]
      };

      if (!validExtensions[detectedMime] || !validExtensions[detectedMime].includes(ext)) {
        fs.unlinkSync(file.path);
        return res.status(400).json({
          success: false,
          message: "MIME type and file extension mismatch detected."
        });
      }
    } catch (err) {
      console.error("File validation error:", err);
      if (fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (_) {}
      }
      return res.status(500).json({
        success: false,
        message: "Failed to validate uploaded file."
      });
    }
  }

  next();
};

upload.validateUploadedFile = validateUploadedFile;
upload.detectImageSignature = detectImageSignature;

module.exports = upload;