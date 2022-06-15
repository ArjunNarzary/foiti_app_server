const S3 = require("aws-sdk/clients/s3");
const fs = require("fs");

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_NAME;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

const storage = new S3({
  // region,
  accessKeyId,
  secretAccessKey,
});

//Uploasds a file from s3
exports.uploadFile = (file, buffer) => {
  //   const fileStream = fs.createReadStream(file.path);
  const fileExtArr = file.mimetype.split("/");
  const extension = fileExtArr[fileExtArr.length - 1];

  const uploadParams = {
    Bucket: bucketName,
    Key: Date.now() + "--" + file.filename + "." + extension,
    // Body: fileStream,
    Body: buffer,
  };

  return storage.upload(uploadParams).promise();
};

//download a file from s3
exports.getFileStream = (fileKey) => {
  try{
    let fileKeyValue = fileKey;
    if(fileKeyValue == null || fileKeyValue == "" || fileKeyValue == 'undefined'){
      fileKeyValue = "profile_picture.jpg";
    } 
    const downloadParams = {
      Key: fileKeyValue,
      Bucket: bucketName,
    };
  
    return storage.getObject(downloadParams).createReadStream();
  }catch(error){
    console.log("error", error);
    return false;
  }
};

//delete a file from s3
exports.deleteFile = (filename) => {
  const params = {
    Bucket: bucketName,
    Key: filename,
  };

  if(filename != null && filename != "" && filename != undefined){
    return storage.deleteObject(params).promise();
  }else{
    return true;
  }
  
};
