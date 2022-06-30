const nodemailer = require("nodemailer");
let AWS = require("aws-sdk");

// configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.SMTP_ACCESS_KEY,
  secretAccessKey: process.env.SMTP_SCERET_KEY,
  region: process.env.AWS_BUCKET_REGION,
});

exports.sendEmail = async (options) => {

  // SES transporter
  let transporter = nodemailer.createTransport({
    SES: new AWS.SES({
      region: process.env.AWS_BUCKET_REGION,
      apiVersion: "2012-10-17",
    }),
  });

  const mailOptions = {
    from: options.from,
    to: options.email,
    subject: options.subject,
    html: `
          <head>
            <style>
            .container:{
              padding: 0 5rem;
            }
            .textSize{
                  margin: 0 1rem; 
                  font-size:0.8rem;
                }
              @media only screen and (max-width: 800px) {
                .textSize{
                  margin: 0 0.5rem; 
                  font-size:0.5rem;
                } 
                .container:{
                  padding: 0;
                }
              }
            </style>
          </head>
          <body style="container">
          <div style="background-color:#fff">
            <div style="padding:15px; text-align:center">
                <img src="https://foiti-tools.s3.ap-south-1.amazonaws.com/foiti.png" style="width:auto; height:2rem; margin: 0 auto;">
            </div>
            ${options.html}
            <div style="padding:1rem 0; background-color:#CECECE; display:flex">
               <div style="margin:0 auto">
                <a href="https://twitter.com/FoitiOfficial" style="text-decoration:none; margin: 0 0.8rem">
                  <img src="https://foiti-tools.s3.ap-south-1.amazonaws.com/twitter.png" style="width:1.5rem; height:auto;"/>
               </a>
               <a href="https://instagram.com/foitiofficial" style="text-decoration:none; margin: 0 0.8rem">
                  <img src="https://foiti-tools.s3.ap-south-1.amazonaws.com/instagram.png" style="width:1.5rem; height:auto;"/>
               </a>
                <a href="https://www.facebook.com/FoitiOfficial/" style="text-decoration:none; margin: 0 0.8rem">
                  <img src="https://foiti-tools.s3.ap-south-1.amazonaws.com/facebook.png" style="width:1.5rem; height:auto;"/>
               </a>
               <a href="https://foiti.com" style="text-decoration:none; margin: 0 0.8rem">
                  <img src="https://foiti-tools.s3.ap-south-1.amazonaws.com/googleplay.png" style="width:1.5rem; height:auto;"/>
               </a>
               </div>
            </div>
            <div style="padding:10px 0; display:flex;">
                <div style="margin:0 auto">
                  <a class="textSize" href="https://foiti.com" style="text-decoration:none; color:#000;">Terms of Service</a>
                  <a class="textSize" href="https://foiti.com" style="text-decoration:none; color:#000;">Community Guidelines</a>
                  <a class="textSize" href="https://foiti.com" style="text-decoration:none; color:#000;">Privacy Policy</a>
                </div>
            </div>
          </div>
          </body>`,
  };

    await transporter.sendMail(mailOptions);
};

exports.sendSupportEmail = async (options) => {

  // SES transporter
  let transporter = nodemailer.createTransport({
    SES: new AWS.SES({
      region: process.env.AWS_BUCKET_REGION,
      apiVersion: "2012-10-17",
    }),
  });

  const mailOptions = {
    from: options.from,
    to: options.email,
    replyTo: options.user,
    subject: options.subject,
    html: `
          <head>
            <style>
            .container:{
              padding: 0 5rem;
            }
            .textSize{
                  margin: 0 1rem; 
                  font-size:0.8rem;
                }
              @media only screen and (max-width: 800px) {
                .textSize{
                  margin: 0 0.5rem; 
                  font-size:0.5rem;
                } 
                .container:{
                  padding: 0;
                }
              }
            </style>
          </head>
          <body style="container">
          <div style="background-color:#fff">
            ${options.html}
          </div>
          </body>`,
  };

  await transporter.sendMail(mailOptions);
};
