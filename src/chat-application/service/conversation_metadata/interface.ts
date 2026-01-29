import { ConversationMetaDataSchema, ConversationSchema } from "../../db/schema";

export type IUpdateConvoMetadata = Partial<
    Pick<
        IConversationWithMetaData,
        'conversationName' |
        'description' |
        'icon'
    >
>;

export type IConversationWithMetaData = Pick<
    ConversationSchema & ConversationMetaDataSchema,
    'uniqueId' |
    'participantId' |
    'privilegeLevel' |
    'status' |
    'createdAt' |
    'deletedAt' |
    'updatedAt' |
    'lastReadAt' |
    'lastReadMessageId' |
    'type' |
    'conversationName' |
    'description' |
    'icon'
>;

export interface IControllerGetConversationWithMetaDataPayload {
    conversationId: string;
    participantId: string;
}

export interface IControllerUpdateConversationWithMetaDataPayload {
    conversationId: string;
    participantId: string;
    upsertData: IUpdateConvoMetadata;
}