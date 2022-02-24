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

var decodeToken = async(token)=>{
    const decodedToken = jwt_decode(token)
return decodedToken
}

var createActivationToken = async (email)=>{
    let token = await JWT.sign({
        email
        },
    secret,
    )
    return token
}

module.exports = {encryptedPassword,decryptComparePassword,createToken,decodeToken,sessionToken,createActivationToken}
