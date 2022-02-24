var express = require('express');
var router = express.Router();
const { MongoClient, dbName } = require('../dbSchema')
const { nanoid } = require('nanoid');
// const baseUrl = "http://localhost:3000"
const baseUrl = 'https://urlshotnr-frontend.netlify.app'

require('dotenv').config()

router.post('/url-shorten', async (req, res) => {
    const client = await MongoClient.connect(process.env.MONGODB_URL)
    try {
        let dbClient = await client.db(dbName)
        let urlDetails = await dbClient.collection('urlCollection').findOne({ longUrl: req.body.longURL })
        if (urlDetails) {
            res.json({
                statusCode: 200,
                message: "Url Already Exists",
                body: urlDetails.shortUrl
            })
        }
        else {
            const shortUrlStrg = await nanoid();
            const urlDetails = {
                longUrl: req.body.longURL,
                shortUrl: `${baseUrl}/${shortUrlStrg}`,
                dateString: new Date().toISOString().slice(0, 10),
                clicks: 0
            }
            await dbClient.collection('urlCollection').insertOne(urlDetails);
            res.json({
                statusCode: 200,
                message: "your Url is ready now",
                body: urlDetails.shortUrl
            })
        }
    }
    catch (error) {
        console.log(error)
        res.json({
            statusCode: 500,
            message: "Internal Server Error"
        })
    }
})

router.get('/all-urls', async (req, res) => {
    const client = await MongoClient.connect(process.env.MONGODB_URL)
    try {
        let dbClient = await client.db(dbName)
        let urlDetails = await dbClient.collection('urlCollection').find({}).toArray();
        if (urlDetails.length > 0) {
            res.json({
                statusCode: 200,
                body: urlDetails
            })
        }
        else {
            res.json({
                statusCode: 400,
                message: "No records found!"
            })
        }
    }
    catch (error) {
        console.log(error)
        res.json({
            statusCode: 500,
            message: "Internal Server Error"
        })
    }
})

router.get('/all-urls/:id', async (req, res) => {
    const client = await MongoClient.connect(process.env.MONGODB_URL)
    try {
        let dbClient = await client.db(dbName)
        const shortURL = `${baseUrl}/${req.params.id}`
        let urlDetails = await dbClient.collection('urlCollection').findOne({ shortUrl: shortURL });
        if (urlDetails) {
            const clickCount = urlDetails.clicks
            await dbClient.collection('urlCollection').updateOne({ shortUrl: shortURL }, { $set: { "clicks": clickCount + 1 } })

            res.json({
                statusCode: 200,
                body: urlDetails.longUrl
            })
        }
        else {
            res.json({
                statusCode: 404,
                message: "No data found!"
            })
        }
    }
    catch (error) {
        console.log(error)
        res.json({
            statusCode: 500,
            message: "Internal Server Error"
        })
    }
})

module.exports = router;

