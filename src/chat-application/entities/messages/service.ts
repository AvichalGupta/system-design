import { v7 as uuidV7 } from 'uuid';
import { ConversationMessagesDB, MessagesDB, UserConversationsDB } from "../..";
import { MessageContentTypeEnum, MessageSchema, MessageStatusEnum } from "../../db/schema";

export class Messages {

    #createUserMessageKey(messageId: string, conversationId: string, participantId: string): string {
        return `${messageId}-${participantId}-${conversationId}`;
    }

    getMessage(uniqueId: string, conversationId: string, creatorId: string): MessageSchema | null {

        const mapperKey: string = this.#createUserMessageKey(uniqueId, conversationId, creatorId);
        return MessagesDB.get(mapperKey) ?? null;

    }

    getConversationMessages(conversationId: string, userId: string): MessageSchema[] {

        const messageIds: string[] = Array.from(ConversationMessagesDB.get(conversationId) ?? []);

        const userMessages: MessageSchema[] = [];

        for (const messageId of messageIds) {
            const mapperKey: string = this.#createUserMessageKey(messageId, conversationId, userId);
            if (MessagesDB.has(mapperKey)) {
                userMessages.push(MessagesDB.get(mapperKey)!);
            }
        }

        return userMessages;
    }

    #createMessageDBSchema(messagePayload: Partial<MessageSchema>, existingMessageSchema: MessageSchema | null = null, upsert = false): MessageSchema {

        const utcDate = new Date().toUTCString();

        if (!messagePayload || !Object.keys(messagePayload).length) {
            throw new Error('Invalid payload. Missing required keys.');
        }

        if (upsert === false) {

            if (!messagePayload.creatorId) {
                throw new Error('Invalid payload. Missing creator details.');
            }

            if (!messagePayload.conversationId) {
                throw new Error('Invalid payload. Missing conversation details.');
            }

            if (!messagePayload.content) {
                throw new Error('Invalid payload. Missing message details.');
            }

            if (!messagePayload.contentType) {
                throw new Error('Invalid payload. Missing message metadata details.');
            }

            const messageSchemaObj: MessageSchema = {
                uniqueId: uuidV7(),
                creatorId: messagePayload.creatorId,
                conversationId: messagePayload.conversationId,
                content: messagePayload.content,
                contentType: messagePayload.contentType,
                status: MessageStatusEnum.q,
                createdAt: utcDate,
                updatedAt: utcDate,
                deletedAt: null,
            }

            return messageSchemaObj;
        } else {

            if (!existingMessageSchema || !Object.keys(existingMessageSchema).length) {
                throw new Error('Invalid payload. Missing existing object data.');
            }

            if (existingMessageSchema.contentType !== MessageContentTypeEnum.t) {
                if (messagePayload.content) {
                    throw new Error('Invalid payload. Cannot update content across types.')
                }
            } else {
                throw new Error('Invalid payload. Cannot update message details.');
            }

            const messageSchemaObj: MessageSchema = {
                uniqueId: uuidV7(),
                creatorId: existingMessageSchema.creatorId,
                conversationId: existingMessageSchema.conversationId,
                content: messagePayload.content ?? existingMessageSchema.content,
                contentType: existingMessageSchema.contentType,
                status: messagePayload?.status ?? existingMessageSchema.status,
                createdAt: existingMessageSchema.createdAt,
                updatedAt: utcDate,
                deletedAt: ('deletedAt' in messagePayload) ? utcDate : existingMessageSchema.deletedAt,
            }

            return messageSchemaObj;
        }
    }

    createMessage(messagePayload: Partial<MessageSchema>): MessageSchema {

        const messageDBPayload = this.#createMessageDBSchema(messagePayload);

        const mapperKey: string = this.#createUserMessageKey(messageDBPayload.uniqueId, messageDBPayload.conversationId, messageDBPayload.creatorId);

        if (MessagesDB.has(mapperKey)) {
            throw new Error('message already exists.');
        }

        if (ConversationMessagesDB.has(messageDBPayload.conversationId)) {
            const userConversationSet = UserConversationsDB.get(messageDBPayload.conversationId)!;
            if (userConversationSet.has(messageDBPayload.uniqueId)) {
                throw new Error('message already exists.');
            }
        }

        MessagesDB.set(mapperKey, messageDBPayload);

        let convoMessageSet: Set<string> = new Set();

        if (ConversationMessagesDB.has(messageDBPayload.creatorId)) {
            convoMessageSet = ConversationMessagesDB.get(messageDBPayload.conversationId)!;
        }

        convoMessageSet.add(messageDBPayload.uniqueId);
        ConversationMessagesDB.set(messageDBPayload.conversationId, convoMessageSet);

        return MessagesDB.get(mapperKey)!;

    }

    updateMessage(uniqueId: string, conversationId: string, creatorId: string, updatedPayload: Partial<MessageSchema>) {

        const mapperKey: string = this.#createUserMessageKey(uniqueId, conversationId, creatorId);

        if (!MessagesDB.has(mapperKey) || !ConversationMessagesDB.has(conversationId)) {
            throw new Error('message does not exist.');
        }

        const existingMessage = MessagesDB.get(mapperKey)!;
        const updatedDBSchema = this.#createMessageDBSchema(updatedPayload, existingMessage, true);

        MessagesDB.set(mapperKey, updatedDBSchema);

    }

    markMessageAsDeleted(messageId: string, conversationId: string, creatorId: string) {
        this.updateMessage(messageId, conversationId, creatorId, { deletedAt: new Date().toUTCString() } as Partial<MessageSchema>);
    }

    deleteMessage(messageId: string, conversationId: string, creatorId: string): void {

        const mapperKey: string = this.#createUserMessageKey(messageId, conversationId, creatorId);
        MessagesDB.delete(mapperKey);

        let userMessageSet: Set<string> = new Set();

        if (ConversationMessagesDB.has(conversationId)) {
            userMessageSet = ConversationMessagesDB.get(conversationId)!;
        }

        userMessageSet.delete(messageId);
        ConversationMessagesDB.set(conversationId, userMessageSet);

    }
}