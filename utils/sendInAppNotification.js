const InAppNotification = require("../models/InAppNotification");
const Notification = require("../models/Notification");
const  { Expo } = require('expo-server-sdk');


exports.sendFollowNotification = async (follower, user) => {
    try{
        const inAppNotification = new InAppNotification({
            user: user._id,
            action_taken_by: follower._id,
            message: "started following you.",
            type: "follow",
            status: "new",
        });
        await inAppNotification.save();
        const message = {
            type: "follow",
            id: user._id,
            name: user.name,
            body: `${follower.name} started following you.`,
        }
        sendPushNotification(user._id, message);
    }catch(error){
        console.log(error);
    }
}

//DELETE NOTIFICAITON ON UNFOLLOW
exports.deleteNotificationOnUnfollow = async (follower, user) => {
    try{
        await InAppNotification.deleteMany({
            user: user._id,
            action_taken_by: follower._id,
            type: "follow",
        });
    }catch(error){
        console.log(error);
    }
}

exports.sendPostLikeNotification = async (authUser, post) => {
    try{
        const inAppNotification = new InAppNotification({
            user: post.user,
            post: post._id,
            action_taken_by: authUser._id,
            message: `liked your post.`,
            type: "like",
            status: "new",
        });
        await inAppNotification.save();

        const message = {
            type: "post_like",
            id: post._id,
            body: `${authUser.name} liked your post.`,
        }
        sendPushNotification(post.user, message);
    }catch(error){
        console.log(error);
    }
}

//POST COMMENT NOTIFICATION
exports.sendPostCommentNotification = async (authUser, post) => {
    try {
        const inAppNotification = new InAppNotification({
            user: post.user,
            post: post._id,
            action_taken_by: authUser._id,
            message: `commented on your post.`,
            type: "comment",
            status: "new",
        });
        await inAppNotification.save();

        const message = {
            type: "comment",
            id: post._id,
            body: `${authUser.name} has commented on your post`,
        }
        sendPushNotification(post.user, message);
    } catch (error) {
        console.log(error);
    }
}

//COMMENT REPLY NOTIFICATION
exports.sendCommentReplyNotification = async (authUser, notifyTo, post) => {
    try {
        const inAppNotification = new InAppNotification({
            user: notifyTo,
            post: post._id,
            action_taken_by: authUser._id,
            message: `replied to your comment.`,
            type: "reply_comment",
            status: "new",
        });
        await inAppNotification.save();

        const message = {
            type: "reply_comment",
            id: post._id,
            body: `${authUser.name} has replied to your comment.`,
        }
        sendPushNotification(notifyTo, message);
    } catch (error) {
        console.log(error);
    }
}

//LIKE COMMENT NOTIFICATION
exports.sendCommentLikeNotification = async (authUser, notifyTo, post) => {
    try {
        const inAppNotification = new InAppNotification({
            user: notifyTo,
            post: post._id,
            action_taken_by: authUser._id,
            message: `liked to your comment.`,
            type: "like_comment",
            status: "new",
        });
        await inAppNotification.save();

        const message = {
            type: "like_comment",
            id: post._id,
            body: `${authUser.name} has liked your comment.`,
        }
        sendPushNotification(notifyTo, message);
    } catch (error) {
        console.log(error);
    }
}

//SEND NEW CHAT NOTIFCATION TO FOLLOWERS
exports.sendNewChatNotification = async (authUser, userId, chatId) => {
    try {
        const inAppNotification = new InAppNotification({
            user: userId,
            action_taken_by: authUser._id,
            chat: chatId,
            message: `sent you a message.`,
            type: "chat",
            status: "new",
        });
        await inAppNotification.save();

        const message = {
            type: "chat",
            body: `${authUser.name} sent you a message.`,
        }
        sendPushNotification(userId, message);
    } catch (error) {
        console.log(error);
    }
}

//DELETE IF LIKED POST EXIST ON UNLIKED POST
exports.deleteNotificationOnUnlike = async (authUser, post) => {
    try{
        await InAppNotification.deleteMany({
            post: post._id,
            action_taken_by: authUser._id,
            type: "like",
        });
    }catch(error){
        console.log(error);
    }
}

//DELETE INVALID NOTIFICATION
exports.deleteInvalidNotification = async (user, notification) => {
    try{
        await InAppNotification.deleteMany({
            _id: notification._id,
            user: user._id,
        });
    } catch (error) {
        console.log(error);
    }
}

//SEND NEW POST NOTIFCATION TO FOLLOWERS (BROADCAST)
exports.sendNewPostNotification = async (user, post) => {
    try{
        user.follower.map(async (follower) => {
            const inAppNotification = new InAppNotification({
                user: follower,
                post: post._id,
                action_taken_by: user._id,
                message: `uploaded a new post.`,
                type: "new_post",
                status: "new",
            });
            await inAppNotification.save();

            const message = {
                type: "new_post",
                id: post._id,
                body: `${user.name} uploaded a new post.`,
            }
            sendPushNotification(follower, message);
        });
    }catch(error){
        console.log(error);
    }
}

//SEND PUSH NOTIFICATION
async function sendPushNotification(receiver_id, message) {
    const expo = new Expo();
    const messages = [];
    const user = await Notification.findOne({ user: receiver_id }).populate('user', 'expoToken');
    if(!user) return;
    if(!Expo.isExpoPushToken(user.user.expoToken)) return;

    if(message.type == "post_like"){
        if(!user.post_likes) return;
        messages.push({
            to: user.user.expoToken,
            sound: 'default',
            body: message.body,
            data: {"screen": "post", "id": message.id},
        })
    }else if(message.type == "follow"){
        if (!user.new_followers) return;
        const name = message.name;
        const newName = name.replace(" ", "-");

        messages.push({
            to: user.user.expoToken,
            sound: 'default',
            body: message.body,
            data: { "screen": "follow_details", "id": message.id, "name": newName },
        })
    }else if(message.type == "chat"){
        if (!user.chat_message) return;

        messages.push({
            to: user.user.expoToken,
            sound: 'default',
            body: message.body,
            data: { "screen": "chat" },
        })
    }else {
        if (!user.new_post) return;

        messages.push({
            to: user.user.expoToken,
            sound: 'default',
            body: message.body,
            data: { "screen": "post", "id": message.id },
        })
    }

    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    (async () => {
        for (let chunk of chunks) {
            try {
                let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error(error);
            }
        }
    })();

};