import { v7 as uuidV7 } from 'uuid';
import { ConversationMetaDataRepository, ConversationsDB, UserConversationsDB } from "../..";
import { ConversationSchema } from "../../db/schema";

export class Conversations {

    #createUserConversationKey(conversationId: string, participantId: string): string {
        return `${participantId}-${conversationId}`;
    }

    getConversation(uniqueId: string, participantId: string): ConversationSchema | null {

        const mapperKey: string = this.#createUserConversationKey(uniqueId, participantId);
        return ConversationsDB.get(mapperKey) ?? null;

    }

    getUserConversations(userId: string): ConversationSchema[] {

        const conversationIds: string[] = Array.from(UserConversationsDB.get(userId) ?? []);

        const userConversations: ConversationSchema[] = [];

        for (const convoId of conversationIds) {
            const mapperKey: string = this.#createUserConversationKey(convoId, userId);
            if (ConversationsDB.has(mapperKey)) {
                userConversations.push(ConversationsDB.get(mapperKey)!);
            }
        }

        return userConversations;
    }

    #createConversationDBSchema(conversationPayload: Partial<ConversationSchema>, existingConversationSchema: ConversationSchema | null = null, upsert = false): ConversationSchema {

        const utcDate = new Date().toUTCString();

        if (!conversationPayload || !Object.keys(conversationPayload).length) {
            throw new Error('Invalid payload. Missing required keys.');
        }

        if (upsert === false) {

            if (!conversationPayload.participantId) {
                throw new Error('Invalid payload. Missing participant details.');
            }

            if (!conversationPayload.privilegeLevel) {
                throw new Error('Invalid payload. Missing privilege details.');
            }

            if (!conversationPayload.status) {
                throw new Error('Invalid payload. Missing status details.');
            }

            const conversationSchemaObj: ConversationSchema = {
                uniqueId: conversationPayload.uniqueId ?? uuidV7(),
                participantId: conversationPayload.participantId,
                privilegeLevel: conversationPayload.privilegeLevel,
                status: conversationPayload.status,
                createdAt: utcDate,
                updatedAt: utcDate,
                lastReadAt: utcDate,
                deletedAt: null,
                lastReadMessageId: null,
            }

            return conversationSchemaObj;
        } else {

            if (!existingConversationSchema || !Object.keys(existingConversationSchema).length) {
                throw new Error('Invalid payload. Missing existing object data.');
            }

            const conversationSchemaObj: ConversationSchema = {
                uniqueId: existingConversationSchema.uniqueId,
                participantId: existingConversationSchema.participantId,
                privilegeLevel: conversationPayload?.privilegeLevel ?? existingConversationSchema.privilegeLevel,
                status: conversationPayload?.status ?? existingConversationSchema.status,
                createdAt: existingConversationSchema.createdAt,
                updatedAt: utcDate,
                lastReadAt: ('lastReadAt' in conversationPayload) ? utcDate : existingConversationSchema.lastReadAt,
                deletedAt: ('deletedAt' in conversationPayload) ? utcDate : existingConversationSchema.deletedAt,
                lastReadMessageId: conversationPayload.lastReadMessageId ?? existingConversationSchema.lastReadMessageId,
            }

            return conversationSchemaObj;
        }
    }

    createConversation(conversationPayload: Partial<ConversationSchema>): ConversationSchema {

        const conversationDBPayload = this.#createConversationDBSchema(conversationPayload);

        const mapperKey: string = this.#createUserConversationKey(conversationDBPayload.uniqueId, conversationDBPayload.participantId);

        if (ConversationsDB.has(mapperKey)) {
            throw new Error('conversation already exists.');
        }

        if (UserConversationsDB.has(conversationDBPayload.participantId)) {
            const userConversationSet = UserConversationsDB.get(conversationDBPayload.participantId)!;
            if (userConversationSet.has(conversationDBPayload.uniqueId)) {
                throw new Error('conversation already exists.');
            }
        }

        ConversationsDB.set(mapperKey, conversationDBPayload);

        let userConversationSet: Set<string> = new Set();

        if (UserConversationsDB.has(conversationDBPayload.participantId)) {
            userConversationSet = UserConversationsDB.get(conversationDBPayload.participantId)!;
        }

        userConversationSet.add(conversationDBPayload.uniqueId);
        UserConversationsDB.set(conversationDBPayload.participantId, userConversationSet);

        return ConversationsDB.get(mapperKey)!;
    }

    updateConversation(uniqueId: string, participantId: string, updatedPayload: Partial<ConversationSchema>) {

        const mapperKey: string = this.#createUserConversationKey(uniqueId, participantId);

        if (!ConversationsDB.has(mapperKey) || !UserConversationsDB.has(participantId)) {
            throw new Error('conversation does not exist.');
        }

        const existingConversation = ConversationsDB.get(mapperKey)!;
        const updatedDBSchema = this.#createConversationDBSchema(updatedPayload, existingConversation, true);

        ConversationsDB.set(mapperKey, updatedDBSchema);

    }

    markConversationAsDeleted(conversationId: string, participantId: string) {
        this.updateConversation(conversationId, participantId, { deletedAt: new Date().toUTCString() } as Partial<ConversationSchema>);
    }

    deleteConversation(uniqueId: string, participantId: string): void {

        const mapperKey: string = this.#createUserConversationKey(uniqueId, participantId);
        ConversationsDB.delete(mapperKey);

        let userConversationSet: Set<string> = new Set();

        if (UserConversationsDB.has(participantId)) {
            userConversationSet = UserConversationsDB.get(participantId)!;
        }

        userConversationSet.delete(uniqueId);
        UserConversationsDB.set(participantId, userConversationSet);

        ConversationMetaDataRepository.deleteConversationMetaData(uniqueId);

    }
}