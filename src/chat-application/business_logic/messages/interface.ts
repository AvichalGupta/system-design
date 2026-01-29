import { MessageSchema, MessageStatusEnum } from "../../db/schema";

export type IFetchConversationMessagesResponse = {
    error: boolean;
    messages?: Partial<
        Pick<
            MessageSchema,
            'uniqueId' |
            'content' |
            'contentType' |
            'conversationId' |
            'createdAt' |
            'status'
        >
    >[];
};

export type ISendMessageResponse = Partial<
    Pick<
        MessageSchema,
        'uniqueId' |
        'content' |
        'contentType' |
        'conversationId' |
        'createdAt' |
        'status'
    >
> & {
    error: boolean;
};

export type ISendMessage = Partial<
    Pick<
        MessageSchema,
        'content' |
        'contentType'
    >
>;

export interface IControllerSendMessagePayload {
    conversationId: string;
    userId: string;
    messagePayload: ISendMessage;
}

export interface IControllerUpdateMessagePayload {
    messageId: string;
    conversationId: string;
    userId: string;
    messagePayload: ISendMessage;
}

export interface IControllerDeleteMessagePayload {
    messageId: string;
    conversationId: string;
    userId: string;
    deleteForEveryone: boolean;
}

export interface IControllerUpdateMessageStatusPayload {
    messageId: string;
    conversationId: string;
    userId: string;
    status: MessageStatusEnum;
}

export interface IControllerFetchConversationMessagesPayload {
    conversationId: string;
    userId: string;
}
