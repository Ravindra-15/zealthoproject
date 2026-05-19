// utils/generateOtp.js

exports.generateOtp = () => {

  //3 digit OTP
   return Math.floor(100 + Math.random() * 900).toString();

  //4 digit OTP
  //  return Math.floor(1000 + Math.random() * 9000).toString();

  //6 digit OTP 
  // return Math.floor(100000 + Math.random() * 900000).toString();
};