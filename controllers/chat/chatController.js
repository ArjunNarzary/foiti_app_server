const expressAsyncHandler = require('express-async-handler');
const Chat = require('../../models/Chat');
const User = require("../../models/User");

const accessChat = expressAsyncHandler(
  async (req, res) => {
    const { userId, authUser: { _id } } = req.body
    if (!userId) {
      console.log("no user found to chat");
      return res.sendStatus(400);
    }

    let isChat = await Chat.find({
      isGroup: false,
      $and: [
        { chatUsers: { $elemMatch: { $eq: _id } } },
        { chatUsers: { $elemMatch: { $eq: userId } } }
      ]
    }).populate("chatUsers", "name email profileImage blocked_users")
      .populate("lastMessage");

    isChat = await User.populate(isChat, {
      path: "lastMessage.sender",
      select: "name email profileImage blocked_users"
    })


    if (isChat.length) {
      res.status(200).send(isChat[0]);
    } else {
      //create new chat

      let chatData = {
        chatName: 'sender',
        isGroup: false,
        chatUsers: [_id, userId]
      }
      try {

        const createdChat = await Chat.create(chatData);
        const newChat = await Chat.findOne({ _id: createdChat._id }).populate("chatUsers", "name email profileImage blocked_users");
        res.status(200).send(newChat);
      } catch (err) {
        res.status(400)
        throw new Error(err.message);
      }
    }

  }
)

const fetchChat = expressAsyncHandler(async (req, res) => {
  const { skip } = req.params;
  const { authUser: { _id } } = req.body;
  const limit = 15;
  let noMoreData = false;

  try {
    let chatlist = await Chat.find({ chatUsers: { $elemMatch: { $eq: _id } } })
      .populate('chatUsers', 'name email profileImage blocked_users')
      .sort({ updatedAt: -1 })
      .populate('lastMessage')
      .skip(skip)
      .limit(limit)

    chatlist = await User.populate(chatlist, {
      path: 'lastMessage.sender',
      select: 'name email profileImage blocked_users'
    })

    if(chatlist.length < limit){
      noMoreData = true;
    }

    
    res.status(200).json({
      chats: chatlist,
      noMoreData
    });
  } catch (error) {
    res.status(400)
    throw new Error(error.message);
  }
})

//SEARCH USERS
const allUsers = expressAsyncHandler(async (req, res) => {
  const { authUser } = req.body;

  const searchTerm = req.query.search ? {
                        name: { $regex: req.query.search, $options: "i" }
                  } : {}

  const users = await User.find(searchTerm).where('_id').in([...authUser.follower, ...authUser.following]);
  res.status(200).json(users);
})

module.exports = { accessChat, fetchChat, allUsers };