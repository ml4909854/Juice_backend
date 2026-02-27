const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary.js");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "juices",
    format: async () => "webp",
    transformation: [
      { width: 800, height: 800, crop: "limit" },
      { quality: "auto" }
    ]
  }
});

const upload = multer({
  storage,

  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 6
  },

  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed"), false);
    }
  }
});

module.exports = upload;