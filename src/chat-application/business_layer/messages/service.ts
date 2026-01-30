import { ConversationRepository, MessageRepository, LoggerRepository, UserRepository, ConversationMetaDataController } from "../..";
import { MessageSchema, MessageStatusEnum } from "../../db/schema";
import { IFetchConversationMessagesResponse, ISendMessage, ISendMessageResponse } from "./interface";

export class MessageServiceBusinessLayer {

    #CLASS_NAME = MessageServiceBusinessLayer.name;

    sendMessage(conversationId: string, userId: string, messagePayload: ISendMessage): ISendMessageResponse {
        const response: ISendMessageResponse = {
            error: false
        }

        try {

            const existingConversation = ConversationRepository.getConversation(conversationId, userId);

            if (!existingConversation) {
                throw new Error('Conversation not found');
            }

            const createMessage: Partial<MessageSchema> = {
                content: messagePayload.content,
                contentType: messagePayload.contentType,
                creatorId: userId,
                conversationId: conversationId
            }

            const createdMessageObj = MessageRepository.createMessage(createMessage);

            response.content = createdMessageObj.content;
            response.contentType = createdMessageObj.contentType;
            response.conversationId = createdMessageObj.conversationId;
            response.createdAt = createdMessageObj.createdAt;
            response.status = createdMessageObj.status;
            response.uniqueId = createdMessageObj.uniqueId;

        } catch (error) {
            LoggerRepository.error({
                methodName: this.sendMessage.name,
                className: this.#CLASS_NAME,
                message: 'Failed to send message.',
                error: error,
            })

            response.error = true;
        }   
        
        return response;
    }

    updateMessage(messageId: string, conversationId: string, userId: string, messagePayload: ISendMessage): ISendMessageResponse {
        const response: ISendMessageResponse = {
            error: false
        }

        try {

            const existingConversation = ConversationRepository.getConversation(conversationId, userId);

            if (!existingConversation) {
                throw new Error('Conversation not found');
            }

            const existingMessage = MessageRepository.getMessage(messageId, conversationId, userId);

            if (!existingMessage || existingMessage.creatorId !== userId) {
                throw new Error('Cannot perform operation, access denied.');
            }

            const updateMessage: Partial<MessageSchema> = {
                content: messagePayload.content,
                contentType: messagePayload.contentType
            }

            MessageRepository.updateMessage(messageId, conversationId, userId, updateMessage);
            
            const updatedMessageObj = MessageRepository.getMessage(messageId, conversationId, userId)!;

            response.content = updatedMessageObj.content;
            response.contentType = updatedMessageObj.contentType;
            response.conversationId = updatedMessageObj.conversationId;
            response.createdAt = updatedMessageObj.createdAt;
            response.status = updatedMessageObj.status;
            response.uniqueId = updatedMessageObj.uniqueId;

        } catch (error) {
            LoggerRepository.error({
                methodName: this.updateMessage.name,
                className: this.#CLASS_NAME,
                message: 'Failed to update message.',
                error: error,
            })

            response.error = true;
        }   
        
        return response;
    }

    deleteMessage(messageId: string, conversationId: string, userId: string, deleteForEveryone: boolean): void {
        try {

            const existingConversation = ConversationRepository.getConversation(conversationId, userId);

            if (!existingConversation) {
                throw new Error('Conversation not found');
            }

            const existingMessage = MessageRepository.getMessage(messageId, conversationId, userId);

            if (!existingMessage || existingMessage.creatorId !== userId) {
                throw new Error('Cannot perform operation, access denied.');
            }

            if (deleteForEveryone) {
                MessageRepository.deleteMessage(messageId, conversationId, userId);
            } else {
                MessageRepository.markMessageAsDeleted(messageId, conversationId, userId);
            }

        } catch (error) {
            LoggerRepository.error({
                methodName: this.deleteMessage.name,
                className: this.#CLASS_NAME,
                message: 'Failed to delete message.',
                error: error,
            })
        }
    }

    updateMessageStatus(messageId: string, conversationId: string, userId: string, status: MessageStatusEnum): ISendMessageResponse {
        const response: ISendMessageResponse = {
            error: false
        }

        try {

            const existingConversation = ConversationRepository.getConversation(conversationId, userId);

            if (!existingConversation) {
                throw new Error('Conversation not found');
            }

            const existingMessage = MessageRepository.getMessage(messageId, conversationId, userId);

            if (!existingMessage || existingMessage.creatorId !== userId) {
                throw new Error('Cannot perform operation, access denied.');
            }

            if (!Object.values(MessageStatusEnum).includes(status)) {
                throw new Error('Invalid status.');
            }

            MessageRepository.updateMessage(messageId, conversationId, userId, { status });

            const updatedMessageObj = MessageRepository.getMessage(messageId, conversationId, userId)!;

            response.content = updatedMessageObj.content;
            response.contentType = updatedMessageObj.contentType;
            response.conversationId = updatedMessageObj.conversationId;
            response.createdAt = updatedMessageObj.createdAt;
            response.status = updatedMessageObj.status;
            response.uniqueId = updatedMessageObj.uniqueId;

        } catch (error) {
            LoggerRepository.error({
                methodName: this.updateMessageStatus.name,
                className: this.#CLASS_NAME,
                message: 'Failed to update message status.',
                error: error,
            })

            response.error = true;
        }   
        
        return response;
    }

    fetchConversationMessages(conversationId: string, userId: string): IFetchConversationMessagesResponse {

        const response: IFetchConversationMessagesResponse = {
            error: false,
            messages: []
        }
        try {
            
            const userDetails = UserRepository.getUser(userId);

            if (!userDetails) {
                throw new Error('User not found.');
            }

            const conversationDetails = ConversationMetaDataController.getConversationWithMetaData({ conversationId, participantId: userId });

            if (!conversationDetails) {
                throw new Error('Conversation not found.');
            }

            const fetchTillTimeStamp = new Date(conversationDetails.deletedAt ?? new Date()).getTime();

            const conversationMessages = MessageRepository.getConversationMessages(conversationId, userId);

            const messages: MessageSchema[] = [];

            for (const messageObj of conversationMessages) {
                const createdAtTimeStamp = new Date(messageObj.createdAt).getTime();
                if (createdAtTimeStamp <= fetchTillTimeStamp) {
                    messages.push(messageObj);
                }
            }

            messages.sort((a,b) => {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            });

            response.messages = messages.map((messageObj) => {
                return {
                    uniqueId: messageObj.uniqueId,
                    content: messageObj.content,
                    contentType: messageObj.contentType,
                    conversationId: messageObj.conversationId,
                    createdAt: messageObj.createdAt,
                    status: messageObj.status,
                }
            })

        } catch (error) {
            LoggerRepository.error({
                methodName: this.fetchConversationMessages.name,
                className: this.#CLASS_NAME,
                message: 'Failed to fetch conversation messages.',
                error: error,
            })
            response.error = true;
            delete response.messages;
        }

        return response;
    }
}
