const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const { BlockBlobClient } = require("@azure/storage-blob");


app.use(bodyParser.json());
app.use(multer().any());

//Azure connection string
const connectionString = "DefaultEndpointsProtocol=https;AccountName=pipliinternalportal;AccountKey=KbbDxAFwPASdsErJFQcBMmj9JgVCGFOUmvXWFthP9fYchEfoSpbsPb4QGlNZEiHQtdrlLgb8G/il+ASt+tREmw==;EndpointSuffix=core.windows.net";

mongoose.set('strictQuery', false)
mongoose.connect("mongodb+srv://swethaHirge:eNbiwvH7LUDppBrx@cluster0.0xins.mongodb.net/azurefilesStorage?retryWrites=true&w=majority", {
    useNewUrlParser: true
})
    .then(() => console.log("MongoDb is connected"))
    .catch(err => console.log(err))

//mongoDb model
const fileSchema = new mongoose.Schema({
    fileName: String,
    fileUrl: String
});

const File = mongoose.model("File", fileSchema);


//upload file to azure and save mongodb
app.post('/uploadFile', async (req, res) => {

    const data = req.files
    const file = data[0]
    const typeOfFile = "file"
    const getStream = await import('into-stream');
    const { nanoid } = await import('nanoid');

    const
        containerName = "file"
        , blobName = `${typeOfFile}/` + nanoid(14) + '-' + file.originalname
        , blobService = new BlockBlobClient(connectionString, containerName, blobName)
        , stream = getStream.default(file.buffer)
        , streamLength = file.buffer.length
        ;
    console.log(blobName);
    await blobService.uploadStream(stream, streamLength)
        .then(() => {
            const newFile = new File({
                fileName: file.originalname,
                fileUrl: blobService.url
            });
            newFile.save((err, savedFile) => {
                if (err) {
                    return res.send(err);
                } else {
                    return res.send({ data: savedFile, msg: "File uploaded and saved to database." });
                }
            });
        })
        .catch((err) => {
            if (err) {
                return res.send(err);
            }
        })
}

);


// API endpoint that returns a list of files in the mongodb
app.get('/files', async (req, res) => {

    try {
        const files = await File.find({});
        return res.send({ data: files, msg: "Files retrieved successfully." });
    } catch (error) {
        return res.status(500).send({ error: error.message });
    }
});



app.listen(3000, () => {
    console.log("API listening on port 3000");
});
