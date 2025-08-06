import express from "express";
import dotenv from "dotenv";
import qrcode from "qrcode";
import os from "os";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";
import open from "open";
import fs from "fs";

// to store file on server while being transferred
// let latestFile = null;
let uploadedFiles = [];

// cos mjs has no __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

// func to get local ip coz localhost:PORT is local to this device
// and other device needs this device ip on the LAN so use this to getg
// the local ip
function getLocalIP() {
  const nets = os.networkInterfaces(); // gets all network interfaces
  // for all networks in nets this loops thru their names like wifi, ethernet

  //   ip for wifi and ethernet
  let wifiIP = null;
  let ethernetIP = null;

  for (const name in nets) {
    //loops over all ips in that network
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        if (/local area connection\*/i.test(name)) {
          return net.address; // Prefer hotspot
        } else if (/wi-?fi|wlan|wireless/i.test(name) && !wifiIP) {
          wifiIP = net.address;
        } else if (/eth|en/i.test(name) && !ethernetIP) {
          ethernetIP = net.address;
        }
      }
    }
  }
  //   nothing found then return localhost
  return wifiIP || ethernetIP || "localhost";
}

// this is a middleware which serves the static site index.html
// and last is to join the directory path to public folder
app.use(express.static(path.join(__dirname, "public")));

// multer to upload file
const upload = multer({ dest: path.join(__dirname, "uploads/") });

// handle file upload
app.post("/upload", upload.array("files"), (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).send("No files uploaded");

  uploadedFiles = req.files;
  res.status(200).send("Files Uploaded Successfully");
});

app.get("/receive", (req, res) => {
  if (!uploadedFiles || uploadedFiles.length === 0)
    return res.status(404).send("No files available");

  if (uploadedFiles.length === 1) {
    const file = uploadedFiles[0];
    res.download(file.path, file.originalname, (err) => {
      fs.unlink(file.path, () => {});
      uploadedFiles = [];
    });
  } else {
    let html = `
<style>
  body {
    background: linear-gradient(145deg, #2c3e50, #1a252f);
    font-family: sans-serif;
    min-height: 100vh;
    color: #e0e0e0;
  }
  a {
    color: #00ffff;
  }
</style>
<h2>Download Files</h2>
<ul>
`;

    for (const file of uploadedFiles) {
      html += `<li><a href="/file/${file.filename}" download="${file.originalname}">${file.originalname}</a></li>`;
    }

    html += "</ul>";
    res.send(html);
  }
});

app.get("/file/:filename", (req, res) => {
  const file = uploadedFiles.find((f) => f.filename === req.params.filename);
  if (!file) return res.status(404).send("File not found");

  res.download(file.path, file.originalname, (err) => {
    fs.unlink(file.path, () => {});
    uploadedFiles = uploadedFiles.filter((f) => f.filename !== file.filename);
  });
});

// incase port isnt available 0 means allocate any other available
const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, () => {
  // Gets the real port the server is using (in case default was 0)
  const actualPORT = server.address().port;
  const ip = getLocalIP();
  //   const ip = "192.168.137.1";
  // combines ip and port
  const fullURL = `http://${ip}:${actualPORT}`;
  console.log(`Server Running at : ${fullURL}`);
  open(`http://${ip}:${PORT}`); // open browser
  app.locals.qrURL = fullURL;
});

app.get("/qr-image", (req, res) => {
  // defines GET point ay /qr-image
  const url = app.locals.qrURL; // gets url
  qrcode.toDataURL(url, (err, src) => {
    //generates a base64 string of the QR image
    if (err) return res.status(500).send("Error generating QR");

    // src is something like -> data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
    const base64 = src.split(",")[1]; // Remove "data:image/png;base64,"
    // Converts the base64 string into a raw image buffer
    // res.send() can’t send base64 directly as an image
    const imgBuffer = Buffer.from(base64, "base64");
    // tell browser that its an img
    res.setHeader("Content-Type", "image/png");
    res.send(imgBuffer);
  });
});

function cleanupUploads() {
  for (const file of uploadedFiles) {
    fs.unlink(file.path, () => {});
  }
}

process.on("SIGINT", () => {
  cleanupUploads();
  process.exit();
});
process.on("SIGTERM", () => {
  cleanupUploads();
  process.exit();
});
