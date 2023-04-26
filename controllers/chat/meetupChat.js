const expressAsyncHandler = require('express-async-handler');
const Chat = require('../../models/Chat');
const MeetupChat = require('../../models/MeetupChat');
const MeetUpRequest = require('../../models/MeetUpRequest');
const User = require("../../models/User");

exports.fetchMeetupChat = expressAsyncHandler(async (req, res) => {
    const { skip } = req.params;
    const { authUser: { _id } } = req.body;
    const limit = 15;
    let noMoreData = false;

    try {
        let chatlist = await MeetupChat.find({ chatUsers: { $elemMatch: { $eq: _id } } })
            .populate('chatUsers', '_id name email profileImage blocked_users')
            .sort({ updatedAt: -1 })
            .populate('lastMessage')
            .skip(skip)
            .limit(limit)

        chatlist = await User.populate(chatlist, {
            path: 'lastMessage.sender',
            select: 'name email profileImage blocked_users'
        })

        const promises = chatlist.map(async chat => {
            let request_receiver = null;
            const requestSenderId = chat.chatUsers[0]._id.toString() == _id.toString() ? chat.chatUsers[1]._id : chat.chatUsers[0]._id

            const meetupRequest = await MeetUpRequest.findOne({})
                .where('receiver').equals(_id)
                .where('user_id').equals(requestSenderId);

            const meetupRequestSend = await MeetUpRequest.findOne({})
                .where('receiver').equals(requestSenderId)
                .where('user_id').equals(_id);

            if (meetupRequest) {
                request_receiver = meetupRequest.receiver;
            }
            if (meetupRequestSend) {
                request_receiver = meetupRequestSend.receiver;
            }

            chat.request_receiver = request_receiver;
            return chat;
        })

        if (chatlist.length > 0) {
            chatlist = await Promise.all(promises);
        }

        if (chatlist.length < limit) {
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

exports.checkMeetupUnread = async (req, res) => {
    try {
        const { authUser } = req.body;
        let hasUnreadMsg = false;

        const allMeetupChats = await MeetupChat.find({ chatUsers: { $elemMatch: { $eq: authUser._id } } })
            .populate('lastMessage')
            .sort({ updatedAt: -1 });


        for (let i = 0; i < allMeetupChats.length; i++) {
            if (allMeetupChats[i].lastMessage && allMeetupChats[i].lastMessage.sender.toString() !== authUser._id.toString() && !allMeetupChats[i].lastMessage.is_read) {
                hasUnreadMsg = true;
                break;
            }
        }

        if (!hasUnreadMsg) {
            const meetupRequest = await MeetUpRequest.findOne({ receiver: authUser._id });
            if (meetupRequest) {
                hasUnreadMsg = true;
            }
        }

        res.status(200).json(hasUnreadMsg);
    } catch (error) {
        res.status(400)
        throw new Error(error.message);
    }
}