import {
    IControllerDeleteMessagePayload,
    IControllerFetchConversationMessagesPayload,
    IControllerSendMessagePayload,
    IControllerUpdateMessagePayload,
    IControllerUpdateMessageStatusPayload
} from "./interface";
import { MessageServiceBusinessLayer } from "./service";

export class MessageControllerBusinessLayer {
    #CLASS_NAME = MessageControllerBusinessLayer.name;
    #serviceLayer: MessageServiceBusinessLayer;

    constructor() {
        this.#serviceLayer = new MessageServiceBusinessLayer();
    }

    sendMessage(payload: IControllerSendMessagePayload) {
        return this.#serviceLayer.sendMessage(payload.conversationId, payload.userId, payload.messagePayload);
    }

    updateMessage(payload: IControllerUpdateMessagePayload) {
        return this.#serviceLayer.updateMessage(payload.messageId, payload.conversationId, payload.userId, payload.messagePayload);
    }

    deleteMessage(payload: IControllerDeleteMessagePayload) {
        return this.#serviceLayer.deleteMessage(payload.messageId, payload.conversationId, payload.userId, payload.deleteForEveryone);
    }

    updateMessageStatus(payload: IControllerUpdateMessageStatusPayload) {
        return this.#serviceLayer.updateMessageStatus(payload.messageId, payload.conversationId, payload.userId, payload.status);
    }

    fetchConversationMessages(payload: IControllerFetchConversationMessagesPayload) {
        return this.#serviceLayer.fetchConversationMessages(payload.conversationId, payload.userId);
    }
}
