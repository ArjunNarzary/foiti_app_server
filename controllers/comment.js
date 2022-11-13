const { validationResult } = require("express-validator");
const { deleteMany } = require("../models/Comment");
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const ReportComment = require("../models/ReportComment");
const { sendPostCommentNotification, sendCommentReplyNotification, sendCommentLikeNotification } = require("../utils/sendInAppNotification");

var ObjectId = require('mongoose').Types.ObjectId;

function createError(errors, validate) {
    const arrError = validate.array();
    errors[arrError[0].param] = arrError[0].msg;
    return errors;
}

exports.createComment = async (req, res) => {
    let errors = {};
    try{
        // Finds the validation errors in this request and wraps them in an object with handy functions
        const validate = validationResult(req);
        if (!validate.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: createError(errors, validate),
            });
        }

        const { post_id } = req.params;
        const { authUser, body } = req.body;

        //Validate Object ID
        if(!ObjectId.isValid(post_id)){
            errors.general = "Invalid post."
            return res.status(400).json({
                success: false,
                message: errors
            })
        }

        //Check post
        const post = await Post.findById(post_id);
        if(!post){
            errors.general = "Post not found.";
            return res.status(404).json({
                success: false,
                message: errors
            });
        }

        if (!post.comment_status){
            errors.general = "Commenting on this post has been disabled.";
            return res.status(400).json({
                success: false,
                message: errors
            })
        }

        const comment = await Comment.create({
            post_id: post._id,
            author: authUser._id,
            body,
        });

        const newComment = await Comment.findById(comment._id).populate("author", "_id name total_contribution profileImage foiti_ambassador");
        
        //Send notification
        if (post.user.toString() !== authUser._id.toString()) {
            sendPostCommentNotification(authUser, post);
        }
        
        return res.status(200).json({
            success:true,
            message: "Comment has been successfully posted.",
            comment: newComment,
        })


    }catch(error){
        console.log(error);
        errors.general = "Comment cannot be posted. Please try again.";
        res.status(500).json({
            success: false,
            message: errors
        })
    }
}

//REPLAY TO COMMENT
exports.replayComment = async (req, res) => {
    let errors = {}
    try{
        // Finds the validation errors in this request and wraps them in an object with handy functions
        const validate = validationResult(req);
        if (!validate.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: createError(errors, validate),
            });
        }

        const { post_id, comment_id } = req.params;
        const { authUser, body } = req.body;

        //Validate Post ID
        if (!ObjectId.isValid(post_id)) {
            errors.general = "Invalid post."
            return res.status(400).json({
                success: false,
                message: errors
            })
        }

        //Validate Post ID
        if (!ObjectId.isValid(comment_id)) {
            errors.general = "Invalid comment."
            return res.status(400).json({
                success: false,
                message: errors
            })
        }

        const post = await Post.findById(post_id);

        if (!post) {
            errors.general = "Post not found.";
            return res.status(404).json({
                success: false,
                message: errors
            });
        }

        if (!post.comment_status) {
            errors.general = "Commenting on this post has been disabled.";
            return res.status(400).json({
                success: false,
                message: errors
            })
        }

        //GET PARENT COMMENT
        const parentComment = await Comment.findById(comment_id);
        if(!parentComment){
            errors.general = "Parent comment not found.";
            return res.status(404).json({
                success: false,
                message: errors
            });
        }

        const comment = await Comment.create({
            post_id: post._id,
            author: authUser._id,
            parent_id: comment_id,
            body,
        })

        parentComment.has_reply = true;
        await parentComment.save();

        const newComment = await Comment.findById(comment._id).populate("author", "_id name total_contribution profileImage foiti_ambassador");

        //Send notification
        if (parentComment.author.toString() !== authUser._id.toString()) {
            sendCommentReplyNotification(authUser, parentComment.author, post)
        }

        return res.status(200).json({
            success: true,
            message: "Comment has been successfully posted.",
            comment: newComment,
        })


    }catch(error){
        console.log(error);
        errors.general = "Comment cannot be posted. Please try again."
        return res.status(500).json({
            success: false,
            message: errors,
        })
    }
}

exports.likeUnlike = async (req, res) => {
    let errors = {};
    try{
        const { comment_id } = req.params;
        const { authUser } = req.body;

        //Validate Comment ID
        if (!ObjectId.isValid(comment_id)) {
            errors.general = "Invalid comment."
            return res.status(400).json({
                success: false,
                message: errors
            })
        }

        
        const comment = await Comment.findById(comment_id);
        if(!comment){
            errors.general = "Comment not found";
            return res.status(500).json({
                success: false,
                message: errors
            })
        }
        const post = await Post.findById(comment.post_id);
        if(!post){
            errors.general = "Post not found";
            return res.status(500).json({
                success: false,
                message: errors
            })
        }

        let hasLiked = false;
        //Check if already liked
        if (comment.likes.includes(authUser._id)){
            const index = comment.likes.indexOf(authUser._id);
            comment.likes.splice(index, 1);
        }else{
            hasLiked = true;
            comment.likes.push(authUser._id);
        }
        await comment.save();

        //Send notification 
        if(hasLiked){
            if (comment.author.toString() !== authUser._id.toString()) {
                sendCommentLikeNotification(authUser, comment.author, post);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Comment like updated successful",
            comment,
        });
    }catch(error){
        console.log(error);
        errors.general = "Please try again."
        return res.status(500).json({
            success: false,
            message: errors,
        })
    }
}

exports.deleteComment = async (req, res) => {
    let errors = {};
    try{
        const { comment_id } = req.params;
        const { authUser } = req.body;

        //Validate Comment ID
        if (!ObjectId.isValid(comment_id)) {
            errors.general = "Invalid comment."
            return res.status(400).json({
                success: false,
                message: errors
            })
        }

        const comment = await Comment.findById(comment_id);
        if (!comment) {
            errors.general = "Comment not found";
            return res.status(500).json({
                success: false,
                message: errors
            })
        }

        //Check if current user is the owner of the comment
        if(comment.author.toString() != authUser._id.toString()){
            errors.general = "Your not authorized to delete this comment."
            return res.status(401).json({
                success: false,
                message: errors
            })
        }

        if(comment.has_reply){
            await Comment.deleteMany({ parent_id: comment._id });
        }

        //Check if this comment has parent comment
        if(comment.parent_id){
            //Count total replies of parent comment
            const totalReply = await Comment.find({ parent_id: comment.parent_id }).count();
            //if single reply change parent comment has_reply false
            if(totalReply == 1){
                const parentComment = await Comment.findById(comment.parent_id);
                parentComment.has_reply = false;
                await parentComment.save()
            }
        }

        await comment.remove();

        return res.status(200).json({
            success: true,
            message: "Comment has been successfully deleted."
        })

    }catch(error){
        console.log(error);
        errors.general = "Please try again."
        return res.status(500).json({
            success: false,
            message: errors,
        })
    }
}

exports.editComment = async (req, res) => {
    let errors = {};
    try{
        // Finds the validation errors in this request and wraps them in an object with handy functions
        const validate = validationResult(req);
        if (!validate.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: createError(errors, validate),
            });
        }

        const { comment_id } = req.params;
        const { authUser, body } = req.body;

        //Validate Comment ID
        if (!ObjectId.isValid(comment_id)) {
            errors.general = "Invalid comment."
            return res.status(400).json({
                success: false,
                message: errors
            })
        }

        const comment = await Comment.findById(comment_id);
        if(!comment){
            errors.general = "Comment not found";
            return res.status(500).json({
                success: false,
                message: errors
            })
        }

        //Check if current user is the owner of the comment
        if (comment.author.toString() != authUser._id.toString()) {
            errors.general = "Your not authorized to edit this comment."
            return res.status(401).json({
                success: false,
                message: errors
            })
        }

        comment.body = body;
        await comment.save();
        const newComment = await Comment.findById(comment._id).populate("author", "_id name total_contribution profileImage foiti_ambassador");


        return res.status(200).json({
            success: true,
            message: "Comment has been successfully updated",
            comment: newComment,
        })


    }catch(error){
        console.log(error);
        errors.general = "Please try again."
        return res.status(500).json({
            success: false,
            message: errors,
        })
    }
}

//GET TOTAL COMMENT AND FIRST COMMENT OF CURRENT USER
exports.currentUserCommentAndCount = async(req, res) => {
    let errors={};
    try{
        const { post_id } = req.params;
        const { authUser } = req.body;

        //Validate Comment ID
        if (!ObjectId.isValid(post_id)) {
            errors.general = "Invalid post."
            return res.status(400).json({
                success: false,
                message: errors
            })
        }

        const currentComment = await Comment.findOne({})
                                        .where("post_id").equals(post_id)
                                        .where("author").equals(authUser._id)
                                        .where("parent_id").equals(undefined)
                                        .sort({createdAt: -1});

        const totalComments = await Comment.find({ post_id }).count();

        return res.status(200).json({
            success: true,
            currentComment,
            totalComments
        })



    }catch(error){
        console.log(error);
        errors.general = "Please try again."
        return res.status(500).json({
            success: false,
            message: errors,
        })
    }
}

//GET ALL COMMENTS
exports.getAllComments = async(req, res) => {
    let errors = {};
    try{    
        const { post_id } = req.params;
        let { authUser, limit = 10, skip, myComment, noMoreComment } = req.body;

        //Validate Comment ID
        if (!ObjectId.isValid(post_id)) {
            errors.general = "Invalid post."
            return res.status(400).json({
                success: false,
                message: errors
            })
        }

        let comments = [];

        if (myComment) {
            comments = await Comment.find({})
                                    .where("post_id").equals(post_id)
                                    .where("author").equals(authUser._id)
                                    .where("parent_id").equals(undefined)
                                    .populate("author", "_id name total_contribution profileImage foiti_ambassador")
                                    .sort({ createdAt: -1 })
                                    .limit(limit)
                                    .skip(skip);
            skip = skip + comments.length
        }else{
            comments = await Comment.find({})
                                .where("post_id").equals(post_id)
                                .where("author").ne(authUser._id)
                                .where("parent_id").equals(undefined)
                                .populate("author", "_id name total_contribution profileImage foiti_ambassador")
                                .sort({ createdAt: -1 })
                                .limit(limit)
                                .skip(skip);
            skip = skip + comments.length
        }

        //IF CURRENT USER COMMENT IS NOT AVAILABLE OR LESS THAN LIMIT
        if(myComment && comments.length < limit){
            myComment = false;
            let newLimit = limit - comments.length;
            const restComment = await Comment.find({})
                            .where("post_id").equals(post_id)
                            .where("author").ne(authUser._id)
                            .where("parent_id").equals(undefined)
                            .populate("author", "_id name total_contribution profileImage foiti_ambassador")
                            .sort({ createdAt: -1 })
                            .limit(newLimit);
            if (restComment.length > 0){
                const addComment = [...comments, ...restComment];
                comments = addComment;
                skip = restComment.length;
            }

        }

        if(comments.length < limit){
            noMoreComment = true;
        }

        return res.status(200).json({
            success: true,
            comments,
            skip,
            limit,
            noMoreComment,
            myComment
        })



    }catch(error){
        console.log(error);
        errors.general = "Please try again."
        return res.status(500).json({
            success: false,
            message: errors,
        })
    }
} 

//GET REPLIES
exports.getReplies = async(req, res) =>{
    let errors ={};
    try{
        let { parent_id, limit, skip, noMoreComment } = req.body;
        
        //Validate parent_id
        if(!ObjectId.isValid(parent_id)){
            errors.general = "Invalid comment";
            return res.status(400).json({
                success: false,
                message: errors
            })
        } 

        //Check for parent comment
        const parentComment = await Comment.findById(parent_id);
        if(!parentComment){
            errors.general = "Comment not found";
            return res.status(404).json({
                success: false,
                message: errors
            })
        }

        // if(!parentComment.has_reply){
        //     errors.general = "Comment does not contain replies";
        //     return res.status(404).json({
        //         success: false,
        //         message: errors
        //     })
        // }

        //Count total replies
        const totalComment = await Comment.find({})
                            .where("parent_id").equals(parentComment._id).count();

        const replies = await Comment.find({})
                        .where("parent_id").equals(parentComment._id)
                        .populate("author", "_id name total_contribution profileImage foiti_ambassador")
                        .skip(skip)
                        .limit(limit)
                        .sort({"createdAt" : 1});

        if (replies.length < limit){
            noMoreComment = true;
        }
        skip = skip + replies.length
        const moreCommentToShow = totalComment - skip;

        return res.status(200).json({
            success: true,
            replies,
            noMoreComment,
            moreCommentToShow,
            skip,
        })
        
    }catch(error){
        console.log(error);
        errors.general = "Please try again."
        return res.status(500).json({
            success: false,
            message: errors,
        })
    }
}

//REPORT COMMENT
exports.reportComment = async (req, res) => {
    let errors = {};
    try {
        const { authUser, comment_id, message } = req.body;
        //Validate Object ID
        if (!ObjectId.isValid(comment_id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid post"
            });
        }

        if (message.length > 5000) {
            errors.message = "Please write message within 5000 characters.";
            return res.status(400).json({
                success: false,
                message: errors
            });
        }

        const comment = await Comment.findById(comment_id);
        //CHECK IF COMMENT EXIST
        if (!comment) {
            errors.general = "Comment not found";
            return res.status(404).json({
                succes: false,
                message: errors
            })
        }

        //CHECK IF COMMENT IS POSTED BY AUTHENTICATED USER
        if (comment.author.toString() === authUser._id.toString()) {
            errors.general = "You cannot report your own comment";
            return res.status(401).json({
                succes: false,
                message: errors
            })
        }

        //CHECK IF REPORT ALREADY EXIST
        const commentReported = await ReportComment.findOne({})
                                .where('comment_id').equals(comment._id)
                                .where('reporter').equals(authUser._id);

        //If exist update message else create new report
        if(commentReported){
            commentReported.body = message;
            await commentReported.save();
        }else{ 
            await ReportComment.create({
                reporter: authUser._id,
                comment_id: comment._id,
                body: message,
            });
        }

        return res.status(200).json({
            success: true,
            message: "Reported successful"
        })


    } catch (error) {
        console.log(error);
        errors.general = "Something went wrong. Please try again";
        return res.status(500).json({
            success: false,
            message: errors
        })
    }
}