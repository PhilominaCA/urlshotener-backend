const bcrypt = require('bcrypt');
const JWT  = require('jsonwebtoken');
const jwt_decode = require('jwt-decode');
var secret = "017@#$sadf@#$mnkj*&153"
var saltRound = 10;

var encryptedPassword = async (password)=>{
    let salt = await bcrypt.genSalt(saltRound);
    let hashedPassword = await bcrypt.hash(password,salt);
    return hashedPassword
}   

var decryptComparePassword = async(password,hashCode)=>{
    let result = await bcrypt.compare(password,hashCode)
    return result
}

var createToken = async (userToken,email)=>{
    let token = await JWT.sign({
        userToken,
        email
    },
    secret,
    {
        expiresIn:"60m"
    }
    )
    return token
}

var sessionToken = async (email)=>{
    let token = await JWT.sign({
        email
    },
    secret,
    {
        expiresIn:"60m"
    }
    )
    return token
}
// var verifyToken = async(token)=>{
//     let decodeData = jwt_decode(token);
//     if(new Date()/1000<decodeData.exp && decodeData.)
//     {
//         next();
//     }
//     else{
//         res.json( {
//             statusCode:401,
//             message:"Invalid Token, Please Try again!"
//         })
//     }
// }

var decodeToken = async(token)=>{
    // console.log(jwt_decode(token))
    const decodedToken = jwt_decode(token)
// return jwt_decode(token)
return decodedToken
}

module.exports = {encryptedPassword,decryptComparePassword,createToken,decodeToken,sessionToken}



// var verifyAdminRole = async(req,res,next)=>{
//     let decodeData = JWTD(req.headers.token);
//     if(decodeData.role===1)
//     {
//         next();
//     }
//     else{
//         res.json( {
//             statusCode:401,
//             message:"Only Admin can access this site"
//         })
//     }
// }