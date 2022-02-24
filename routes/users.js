var express = require('express');
var router = express.Router();
var randomstring = require("randomstring");
var nodemailer = require('nodemailer');
const { MongoClient, dbName } = require('../dbSchema')
const { encryptedPassword, decryptComparePassword, createToken, sessionToken, createActivationToken } = require('../authenticate')
const JWTD = require('jwt-decode');

require('dotenv').config()

router.get('/get-users', async (req, res) => {
  const client = await MongoClient.connect(process.env.MONGODB_URL)
  try {
    let dbClient = await client.db(dbName)
    let userDetails = await dbClient.collection('urlUsers').find({}).toArray();
    if (userDetails.length > 0) {
      res.json({
        statusCode: 200,
        body: userDetails
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

router.post('/sign-up', async (req, res) => {
  const client = await MongoClient.connect(process.env.MONGODB_URL)
  try {
    let dbClient = await client.db(dbName)
    let userDetails = await dbClient.collection('urlUsers').find({ email: req.body.email }).toArray();
    if (userDetails.length > 0) {
      res.json({
        statusCode: 400,
        message: "User Already Exists"
      })
    }
    else {
      const { firstName, lastName, email, mobile, password } = req.body;
      const hashedPassword = await encryptedPassword(password);
      const userDetails = {
        firstName,
        lastName,
        email,
        mobile,
        password: hashedPassword,
        activationStatus: false,
        resetPasswordToken: ""
      }
      await dbClient.collection('urlUsers').insertOne(userDetails);
      res.json({
        statusCode: 200,
        message: "Great!, You will receive an account activation link via email (please check your spam folder, if not found in inbox)",
        body: userDetails
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

router.post('/login', async (req, res) => {
  const client = await MongoClient.connect(process.env.MONGODB_URL)
  try {
    let dbClient = await client.db(dbName)
    let userDetails = await dbClient.collection('urlUsers').findOne({ email: req.body.email })
    if (userDetails.activationStatus) {
      let passwordCheck = await decryptComparePassword(req.body.password, userDetails.password);
      if (passwordCheck) {
        let token = await sessionToken(req.body.email)
        res.json({
          statusCode: 200,
          message: "Login Successfull!",
          token
        })
      }
      else {
        res.json({
          statusCode: 400,
          message: "Invalid Password"
        })
      }
    }
    else {
      res.json({
        statusCode: 404,
        message: "Please enter a valid UserId , if you were already registered then please activate your account via link sent in your email"
      })
    }
  }
  catch (error) {
    console.log(error)
    res.json({
      statusCode: 500,
      message: "Invalid UserId"
    })
  }
})

router.post('/verify-login/:token', async (req, res) => {
  const client = await MongoClient.connect(process.env.MONGODB_URL)
  try {
    let dbClient = await client.db(dbName)
    let decodedToken = JWTD(req.params.token)
    if (new Date() / 1000 > decodedToken.exp) {
      res.json({
        statusCode: 401,
        message: "Link Expired!"
      })
    }
    let userDetails = await dbClient.collection('urlUsers').findOne({ email: decodedToken.email })
    if (userDetails) {
      res.json({
        statusCode: 200,
        message: "Has valid Token!",
        body: userDetails
      })
    }
    else {
      res.json({
        statusCode: 404,
        message: "Login Expired!"
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

router.post('/forgot-password', async (req, res) => {
  const client = await MongoClient.connect(process.env.MONGODB_URL)
  try {
    let dbClient = await client.db(dbName)
    let userDetails = await dbClient.collection('urlUsers').findOne({ email: req.body.email });
    if (userDetails.activationStatus) {
      let UserToken = randomstring.generate(15);
      let genUserToken = await createToken(UserToken, req.body.email);
      await dbClient.collection('urlUsers').updateOne({ email: req.body.email }, { $set: { "resetPasswordToken": UserToken } })

      //nodemailer code for mails (alternate)

      var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL,
          pass: process.env.EMAIL_PASS
        }
      });

      var mailOptions = {
        from: 'process.env.EMAIL',
        to: userDetails.email,
        subject: 'Password Reset Link',
        text: `Hi ${userDetails.firstName},
        Kindly click on the below link to reset your password.
        https://urlshotnr-frontend.netlify.app/reset-password/${genUserToken}
        Please not that this link will expire within 1 hour.`
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
          res.json({
            statusCode: 500,
            message: error
          })
        } else {
          console.log('Email sent: ' + info.response);
          res.json({
            statusCode: 200,
            message: "Email Sent Successfully, Reset your password now! (please check your spam folder, if not found in inbox)"
          })
        }
      });
    }
    else {
      res.json({
        statusCode: 404,
        message: "Invalid UserId"
      })
    }
  }
  catch (error) {
    console.log(error);
    res.json({
      statusCode: 500,
      message: "Internal Server Error"
    })
  }
})

router.post('/reset-password/:token', async (req, res, next) => {
  const client = await MongoClient.connect(process.env.MONGODB_URL)
  try {
    let dbClient = await client.db(dbName);
    let decodedToken = JWTD(req.params.token);
    if ((new Date() / 10000) > decodedToken.exp) {
      res.json({
        statusCode: 401,
        message: "Link Expired!"
      })
    }

    let userDetails = await dbClient.collection('urlUsers').findOne({ resetPasswordToken: decodedToken.userToken, email: decodedToken.email })
    if (userDetails) {
      console.log(userDetails)
      const { password } = req.body;
      const hashedPassword = await encryptedPassword(password);
      await dbClient.collection('urlUsers').updateOne({ resetPasswordToken: decodedToken.userToken, email: decodedToken.email }, { $set: { "password": hashedPassword, "resetPasswordToken": "" } })
      res.json({
        statusCode: 200,
        message: "Password Reset Successful!, Try to login now by clicking the 'Home' button ",
        body: userDetails
      })
    }
    else {
      res.json({
        statusCode: 404,
        message: "Token is not Valid!"
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

router.post('/activation-email/:useremail', async (req, res) => {
  const client = await MongoClient.connect(process.env.MONGODB_URL)
  try {
    let dbClient = await client.db(dbName)
    let userDetails = await dbClient.collection('urlUsers').findOne({ email: req.params.useremail });
    if (userDetails) {
      let genUserToken = await createActivationToken(userDetails.email);

      var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL,
          pass: process.env.EMAIL_PASS
        }
      });

      var mailOptions = {
        from: 'process.env.EMAIL',
        to: userDetails.email,
        subject: 'Password Reset Link',
        text: `Hi ${userDetails.firstName},
        Kindly click on the below link to activate your account.
        Account Activation Link : https://urlshotnr-frontend.netlify.app/account-activation/${genUserToken}

        Thank you,
        NodeAuth Team`
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
          res.json({
            statusCode: 500,
            message: error
          })
        } else {
          console.log('Email sent: ' + info.response);
          res.json({
            statusCode: 200,
            message: "Email Sent Successfully, Reset your password now! (please check your spam folder, if not found in inbox)"
          })
        }
      });

    }
    else {
      res.json({
        statusCode: 404,
        message: "Invalid UserId"
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

router.post('/account-activation/:token', async (req, res) => {
  const client = await MongoClient.connect(process.env.MONGODB_URL)
  try {
    let dbClient = await client.db(dbName)
    let decodedToken = JWTD(req.params.token);
    let userDetails = await dbClient.collection('urlUsers').findOne({ email: decodedToken.email })
    if (userDetails) {
      await dbClient.collection('urlUsers').updateOne({ email: decodedToken.email }, { $set: { "activationStatus": true } })
      res.json({
        statusCode: 200,
        message: "Account Activated Successfully!, Please try to Login now by clicking the 'Home' button",
        body: userDetails
      })
    }
    else {
      res.json({
        statusCode: 404,
        message: "User Not Found!"
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
