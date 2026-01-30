import { ConversationRepository, ConversationMetaDataRepository, LoggerRepository } from "../..";
import { ConversationSchema, ConversationMetaDataSchema } from "../../db/schema";
import { IAddContactResponse } from "../users/interface";
import { IConversationWithMetaData, IUpdateConvoMetadata } from "./interface";

export class ConversationMetaDataServiceBusinessLayer {

    #CLASS_NAME = ConversationMetaDataServiceBusinessLayer.name;

    getConversationWithMetaData(conversationId: string, participantId: string): IConversationWithMetaData | null {

        try {

            const existingConversation: ConversationSchema | null = ConversationRepository.getConversation(conversationId, participantId);
    
            if (!existingConversation) {
                throw new Error('User Conversation not found');
            }
    
            const existingConversationMetaData: ConversationMetaDataSchema | null = ConversationMetaDataRepository.getConversationMetaData(conversationId);
    
            if (!existingConversationMetaData) {
                throw new Error('User Conversation Metadata not found');
            }
    
            const convoWithMetaData: IConversationWithMetaData = {
                uniqueId: existingConversation.uniqueId,
                participantId: existingConversation.participantId,
                privilegeLevel: existingConversation.privilegeLevel,
                status: existingConversation.status,
                createdAt: existingConversation.createdAt,
                updatedAt: existingConversation.updatedAt,
                deletedAt: existingConversation.deletedAt,
                lastReadAt: existingConversation.lastReadAt,
                lastReadMessageId: existingConversation.lastReadMessageId,
                type: existingConversationMetaData.type,
                conversationName: existingConversationMetaData.conversationName,
                description: existingConversationMetaData.description,
                icon: existingConversationMetaData.icon,
            };
    
            return convoWithMetaData;
        } catch (error) {
            LoggerRepository.error({
                methodName: this.getConversationWithMetaData.name,
                className: this.#CLASS_NAME,
                message: 'Failed to get conversation metadata.',
                error: error,
            })
            return null;
        } 

    }

    updateConversationWithMetaData(conversationId: string, participantId: string, payload: IUpdateConvoMetadata): IAddContactResponse {

        const response: IAddContactResponse = {
            error: false,
            conversationId: null
        }

        try {
            
            const existingConvoMetaData = this.getConversationWithMetaData(conversationId, participantId);
            
            if (!existingConvoMetaData) {
                throw new Error('Conversation MetaData not found.');
            }

            ConversationMetaDataRepository.updateConversationMetaData(conversationId, {
                conversationName: payload.conversationName,
                description: payload.description,
                icon: payload.icon,
            });

            response.conversationId = conversationId;
            delete response.error;

        } catch (error) {
            LoggerRepository.error({
                methodName: this.updateConversationWithMetaData.name,
                className: this.#CLASS_NAME,
                message: 'Failed to update conversation metadata.',
                error: error,
            })

            response.error = true;
            delete response.conversationId;
        }
    
        return response;
    }
}