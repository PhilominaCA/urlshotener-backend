var express = require('express');
var router = express.Router();
var randomstring = require("randomstring");
var nodemailer = require('nodemailer');
const { MongoClient, dbName } = require('../dbSchema')
const {encryptedPassword,decryptComparePassword,createToken,sessionToken} = require('../authenticate')
const sendgrid = require('@sendgrid/mail');
const JWTD = require('jwt-decode');

require('dotenv').config()

router.get('/get-users', async (req, res) => {
  const client = await MongoClient.connect(process.env.MONGODB_URL)
  try {
    let dbClient =  await client.db(dbName)
    let userDetails = await dbClient.collection('usersList').find({}).toArray();
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
    let dbClient =  await client.db(dbName)
    let userDetails = await dbClient.collection('usersList').find({ email: req.body.email }).toArray();
    if (userDetails.length > 0) {
      res.json({
        statusCode: 400,
        message: "User Already Exists"
      })
    }
    else {
      const {firstName,lastName,email,mobile,password} = req.body;
const hashedPassword = await encryptedPassword(password);
      const userDetails ={
        firstName,
        lastName,
        email,
        mobile,
        password : hashedPassword,
        resetPasswordToken:""
      }
      await dbClient.collection('usersList').insertOne(userDetails);
      res.json({
        statusCode: 200,
        message: "Great!, Try to Login now",
         body:userDetails
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
    let dbClient =  await client.db(dbName)
    let userDetails = await dbClient.collection('usersList').findOne({ email: req.body.email })
    if (userDetails) {
      let passwordCheck = await decryptComparePassword(req.body.password,userDetails.password); 
     if(passwordCheck)
     {
      let token  = await sessionToken(req.body.email)
      res.json({
        statusCode: 200,
        message: "Login Successfull!",
        token
      })
    }
    else{
      res.json({
        statusCode:400,
        message:"Invalid Password"
      })
    }
  }
  else{
    res.json({
      statusCode:404,
      message:"Please enter a valid UserId"
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

router.post('/verify-login/:token', async (req, res) => {
  const client = await MongoClient.connect(process.env.MONGODB_URL)
  try {
    let dbClient =  await client.db(dbName)
    let decodedToken = JWTD(req.params.token)
    if(new Date()/1000>decodedToken.exp){
                  res.json( {
                      statusCode:401,
                      message:"Link Expired!"
                  })
             }
    let userDetails = await dbClient.collection('usersList').findOne({email: decodedToken.email })
    if (userDetails) {
           res.json({
              statusCode: 200,
              message: "Has valid Token!",
               body:userDetails
            })
          }
  else{
    res.json({
      statusCode:404,
      message:"Login Expired!"
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
    let dbClient =  await client.db(dbName)
    let userDetails = await dbClient.collection('usersList').findOne({ email: req.body.email });
    // console.log(userDetails,req.body.email,req.body);
    if (userDetails) {
      // console.log(userDetails);
      let UserToken = randomstring.generate(15);
      let genUserToken = await createToken(UserToken,req.body.email);
      await dbClient.collection('usersList').updateOne({ email: req.body.email },{ $set: { "resetPasswordToken" : UserToken }})
    //  console.log(process.env.SENDGRID_API_KEY);
    //   sendgrid.setApiKey(process.env.SENDGRID_API_KEY)
    //   const msg = {
    //     to: userDetails.email,
    //     from: process.env.EMAIL,
    //     subject: 'Password Reset Link',
    //     html: `<p>Hi ${userDetails.firstName},</p>
    //    <p> Kindly click on the below link to reset your password.</p>
    //    <p> Password Reset Link : https://password-rst.netlify.app/reset-password/${genUserToken}</p>
    //     <p><strong>Please not that this link will expire within 1 hour.</strong></p>
    //     <p>Thank you,</p>
    //     <p>NodeAuth Team</p>`,
    //  }
    //  console.log(msg);
    //  sendgrid
    //     .send(msg)
    //     .then((resp) => {
    //       res.json({
    //         statusCode:200,
    //         message:"Email Sent Successfully, Reset your password now!"
    //       })
    //     })
    //     .catch((error) => {
    //       console.log(error)
    //       res.json({
    //         statusCode:400,
    //         message:error
    //       })
    //   })

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
        https://password-rst.netlify.app/reset-password/${genUserToken}
        Please not that this link will expire within 1 hour.`
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
          res.json({
            statusCode: 500,
            message:error     
           })
        } else {
          console.log('Email sent: ' + info.response);
          res.json({
            statusCode: 200,
            message:"Email Sent Successfully, Reset your password now! (please check your span folder, if not found in inbox)"
           })
        }
      }); 
    }
  else{
    res.json({
      statusCode:404,
      message:"Invalid UserId"
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

router.post('/reset-password/:token', async (req, res,next) => {
  const client = await MongoClient.connect(process.env.MONGODB_URL)
  try {
    let dbClient =  await client.db(dbName);
    let decodedToken = JWTD(req.params.token);
    if((new Date()/10000)>decodedToken.exp){
                  res.json( {
                      statusCode:401,
                      message:"Link Expired!"
                  })
             }

    let userDetails = await dbClient.collection('usersList').findOne({ resetPasswordToken: decodedToken.userToken,email: decodedToken.email })
    if (userDetails) {
      console.log(userDetails)
      const {password} = req.body;
      const hashedPassword = await encryptedPassword(password);
            await dbClient.collection('usersList').updateOne({ resetPasswordToken: decodedToken.userToken,email: decodedToken.email },{ $set: { "password" : hashedPassword,"resetPasswordToken" :""}})
            res.json({
              statusCode: 200,
              message: "Password Reset Successful!, Try to login now",
               body:userDetails
            })
          }
  else{
    res.json({
      statusCode:404,
      message:"Token is not Valid!"
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
