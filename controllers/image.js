const { getFileStream } = require("../utils/s3");

exports.getImage = async (req, res) => {
  const key = req.params.key;
  if(key == 'undefined' || key == null){
    return res.status(400).json({
      success: false
    });
  }
  const readStream = getFileStream(key);

  readStream.pipe(res);
};
