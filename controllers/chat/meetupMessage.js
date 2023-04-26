const asyncExpressHandler = require('express-async-handler');
const MeetupChat = require('../../models/MeetupChat');
const MeetupMessage = require('../../models/MeetupMessage');
const User = require('../../models/User');
const { sendNewChatNotification } = require('../../utils/sendInAppNotification');

exports.sentMeetupMessage = asyncExpressHandler(
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
            let chatdata = await MeetupChat.findOne({ _id: chatId }).populate("chatUsers", "name blocked_users");
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

            let message = await MeetupMessage.create(newMessage);
            message = await message.populate('sender', "name")
            message = await message.populate('chat')
            message = await User.populate(message, {
                path: "chat.chatUsers",
                select: "name email"
            });

            if (!isBlocked) {
                await MeetupChat.findByIdAndUpdate(chatId, {
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

exports.updateMeetupMessageStatus = asyncExpressHandler(async (req, res) => {
    const { authUser: { _id } } = req.body
    try {
        let message = await MeetupMessage.find({ chat: req.params.chatId }).sort({ _id: -1 }).limit(1)
        if (message[0]) {
            if (_id.toString() !== message[0].sender.toString()) {
                message = await MeetupMessage.findByIdAndUpdate(message[0]._id, { is_read: true })
            }
        }
        res.status(201).send(message);
    } catch (error) {
        res.status(400)
        throw new Error(error.message);
    }
})

exports.allMeetupMessage = asyncExpressHandler(
    async (req, res) => {
        const { skip, chatId } = req.params;
        const limit = 20;
        try {
            const messages = await MeetupMessage.find({ chat: chatId })
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

exports.unreadMeetupMessages = asyncExpressHandler(
    async(req, res) => {
        const { authUser } = req.body;
        try{
            const allChats = await MeetupChat.find({ chatUsers: { $elemMatch: { $eq: authUser._id } } })
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

//GET RECEIVER USER DETAILS
exports.chatReceiverUser = async (req, res) => {
    const errors = {};
    try{
        const { chatId } = req.params;
        const { authUser } = req.body;

        const chat  = await MeetupChat.findOne({ _id: chatId });
        if(!chat){
            errors.general = "No chat record found";
            return res.status(404).json({
                success: false,
                message: errors
            })
        }

        let index = -1;
        chat.chatUsers.map((user, idx) => {
            if(user.toString() !== authUser._id.toString()){
                index = idx;
            }
        })

        if (index === -1){
            errors.general = "User not found";
            return res.status(404).json({
                success: false,
                message: errors
            })
        }

        const user = await User.findById(chat.chatUsers[index])
            .select("_id name profileImage gender dob about_me meetup_reason interests education occupation languages movies_books_music blocked_users")
            .populate("place", "name display_name address display_address_available display_address display_address_for_own_country display_address_for_other_country original_place_id")

        if (!user) {
            errors.genral = "User not found";
            return res.status(400).json({
                success: false,
                error: errors
            })
        }

        if (user.place.display_name) {
            user.place.name = user.place.display_name;
        }
        if (user.place.display_address_for_own_country_home != "") {
            user.place.local_address =
                user.place.display_address_for_own_country_home.substr(2);
        } else {
            user.place.local_address = user.place.display_address_for_own_country_home;
        }
        return res.status(200).json({
            success: true,
            user,
            myBlockedUser: authUser.blocked_users
        })

    }catch(error){
        console.log(error);
        errors.general = "Something went wrong while fectching user details";
        return res.status(500).json({
            success: false,
            message: errors
        })
    }
}