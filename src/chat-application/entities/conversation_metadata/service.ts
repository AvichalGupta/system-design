import { ConversationsMetaDataDB } from "../..";
import { ConversationMetaDataSchema } from "../../db/schema";

export class ConversationMetaData {

    getConversationMetaData(conversationId: string): ConversationMetaDataSchema | null {
        return ConversationsMetaDataDB.get(conversationId) ?? null;
    }

    #createConversationMetaDataDBSchema(conversationMetaDataPayload: Partial<ConversationMetaDataSchema>, existingConversationMetaDataSchema: ConversationMetaDataSchema | null = null, upsert = false): ConversationMetaDataSchema {

        if (!conversationMetaDataPayload || !Object.keys(conversationMetaDataPayload).length) {
            throw new Error('Invalid payload. Missing required keys.');
        }

        if (upsert === false) {

            if (!conversationMetaDataPayload.conversationId) {
                throw new Error('Invalid payload. Missing conversation details.');
            }

            if (!conversationMetaDataPayload.type) {
                throw new Error('Invalid payload. Missing conversation idnetifier details.');
            }

            const conversationMetaDataSchemaObj: ConversationMetaDataSchema = {
                conversationId: conversationMetaDataPayload.conversationId,
                conversationName: conversationMetaDataPayload.conversationName ?? null,
                description: conversationMetaDataPayload.description ?? null,
                icon: conversationMetaDataPayload.icon ?? null,
                type: conversationMetaDataPayload.type ?? null
            }

            return conversationMetaDataSchemaObj;
        } else {

            if (!existingConversationMetaDataSchema || !Object.keys(existingConversationMetaDataSchema).length) {
                throw new Error('Invalid payload. Missing existing object data.');
            }

            const conversationMetaDataSchemaObj: ConversationMetaDataSchema = {
                conversationId: existingConversationMetaDataSchema.conversationId,
                conversationName: conversationMetaDataPayload.conversationName ?? existingConversationMetaDataSchema.conversationName,
                description: conversationMetaDataPayload.description ?? existingConversationMetaDataSchema.description,
                icon: conversationMetaDataPayload.icon ?? existingConversationMetaDataSchema.icon,
                type: conversationMetaDataPayload.type ?? existingConversationMetaDataSchema.type,
            }

            return conversationMetaDataSchemaObj;
        }
    }

    createConversationMetaData(conversationMetaDataPayload: Partial<ConversationMetaDataSchema>): ConversationMetaDataSchema {

        const conversationMetaDataDBPayload = this.#createConversationMetaDataDBSchema(conversationMetaDataPayload);

        if (ConversationsMetaDataDB.has(conversationMetaDataDBPayload.conversationId)) {
            throw new Error('conversation metadata already exists.');
        }

        ConversationsMetaDataDB.set(conversationMetaDataDBPayload.conversationId, conversationMetaDataDBPayload);

        return ConversationsMetaDataDB.get(conversationMetaDataDBPayload.conversationId)!;
    }

    updateConversationMetaData(conversationId: string, updatedPayload: Partial<ConversationMetaDataSchema>) {
        
        if (!ConversationsMetaDataDB.has(conversationId)) {
            throw new Error('conversation metadata does not exist.');
        }

        const existingConversationMetaData = ConversationsMetaDataDB.get(conversationId)!;
        const updatedDBSchema = this.#createConversationMetaDataDBSchema(updatedPayload, existingConversationMetaData, true);

        ConversationsMetaDataDB.set(updatedDBSchema.conversationId, updatedDBSchema);

    }

    deleteConversationMetaData(conversationId: string): void {
        ConversationsMetaDataDB.delete(conversationId);
    }
}