import { ConversationRepository, ConversationMetaDataRepository } from "../..";
import { ConversationSchema, ConversationMetaDataSchema } from "../../db/schema";
import { IConversationWithMetaData, ISrvcUpdateConvoWithMetaData, IUpdateConvoMetadata } from "./interface";

export class ConversationMetaDataServiceBusinessLayer {

    getConversationWithMetaData(conversationId: string, participantId: string): IConversationWithMetaData {
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
    }

    updateConversationWithMetaData(conversationId: string, participantId: string, payload: IUpdateConvoMetadata): ISrvcUpdateConvoWithMetaData {
        const existingConvoMetaData = this.getConversationWithMetaData(conversationId, participantId);
        
        if (!existingConvoMetaData) {
            throw new Error('Conversation MetaData not found.');
        }

        ConversationMetaDataRepository.updateConversationMetaData(conversationId, {
            conversationName: payload.conversationName,
            description: payload.description,
            icon: payload.icon,
        });
    
        return { conversationId } as ISrvcUpdateConvoWithMetaData;
    }
}