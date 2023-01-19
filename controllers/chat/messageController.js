const asyncExpressHandler = require('express-async-handler');
const Chat = require('../../models/Chat');
const Message = require('../../models/Message');
const User = require('../../models/User');
const { sendNewChatNotification } = require('../../utils/sendInAppNotification');

const sentMessage = asyncExpressHandler(
    async (req, res) => {
        const { content, chatId, authUser } = req.body;
        if (!content || !chatId) {
            res.status(400).send("No chat found")
        }

        let isBlocked = false;
        let newMessage = {
            sender: authUser._id,
            content: content,
            chat: chatId
        }
        
        try {
            //check for block user in chat 
            let chatdata = await Chat.findOne({ _id: chatId }).populate("chatUsers", "name blocked_users");
            let sender = [];
            let receiver_id = null;

            if (chatdata.chatUsers.length > 0) {
                sender = chatdata.chatUsers.filter((item) => item._id.toString() === authUser._id.toString())

                let reciept = chatdata.chatUsers.filter((item) => item._id.toString() !== authUser._id.toString())
                receiver_id = reciept[0]._id

                if (reciept[0].blocked_users.length > 0) {
                    let checkedBlock = reciept[0].blocked_users.filter((item) => item.toString() === sender[0]._id.toString())
                    if (checkedBlock.length > 0) {
                        //blocked 
                        isBlocked = true;
                        newMessage.is_sent = false;
                    }
                }
            }

            let message = await Message.create(newMessage);
            message = await message.populate('sender', "name")
            message = await message.populate('chat')
            message = await User.populate(message, {
                path: "chat.chatUsers",
                select: "name email"
            });

            if (!isBlocked) {
                await Chat.findByIdAndUpdate(chatId, {
                    lastMessage: message
                })
                if (receiver_id){
                    sendNewChatNotification(authUser, receiver_id, chatId);
                }
            }


            res.status(200).json(message);
        } catch (error) {
            res.status(400);
            throw new Error(error.message);
        }
    }
)

const updateMessageStatus = asyncExpressHandler(async (req, res) => {
    const { authUser: { _id } } = req.body
    try {
        let message = await Message.find({ chat: req.params.chatId }).sort({ _id: -1 }).limit(1)
        if (message[0]) {
            if (_id.toString() !== message[0].sender.toString()) {
                message = await Message.findByIdAndUpdate(message[0]._id, { is_read: true })
            }
        }
        res.status(201).send(message);
    } catch (error) {
        res.status(400)
        throw new Error(error.message);
    }
})

const allMessage = asyncExpressHandler(
    async (req, res) => {
        const { skip, chatId } = req.params;
        const limit = 20;
        try {
            const messages = await Message.find({ chat: chatId })
                .populate("sender", "name email")
                .populate("chat").sort({ createdAt: -1 }).skip(skip).limit(limit);

                let noMoreData = false;
                if(messages.length < limit){
                    noMoreData = true;
                }

            // res.status(201).send(message);
            res.status(200).json({
                messages,
                noMoreData
            });
        } catch (error) {
            res.status(400)
            throw new Error(error.message);
        }
    }
)

const unreadMessages = asyncExpressHandler(
    async(req, res) => {
        const { authUser } = req.body;
        try{
            const allChats = await Chat.find({ chatUsers: { $elemMatch: { $eq: authUser._id } } })
                            .populate('lastMessage')
                            .sort({ updatedAt: -1 });
    
            let hasUnreadMsg = false;
    
            for(let i=0; i < allChats.length; i++){
                if (allChats[i].lastMessage && allChats[i].lastMessage.sender.toString() !== authUser._id.toString() && !allChats[i].lastMessage.is_read) {
                    hasUnreadMsg = true;
                    break;
                }
            }

            res.status(200).json(hasUnreadMsg);
        }catch(error){
            res.status(400)
            throw new Error(error.message);
        }
    }
)

module.exports = { sentMessage, allMessage, updateMessageStatus, unreadMessages }