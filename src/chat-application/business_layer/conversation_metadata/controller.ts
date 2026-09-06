import { LoggerRepository } from "../..";
import { IGenericControllerResponse } from "../global-interface";
import { IControllerGetConversationWithMetaDataPayload, IControllerUpdateConversationWithMetaDataPayload } from "./interface";
import { ConversationMetaDataServiceBusinessLayer } from "./service";

export class ConversationMetaDataControllerBusinessLayer {
    #CLASS_NAME = ConversationMetaDataControllerBusinessLayer.name;
    #serviceLayer: ConversationMetaDataServiceBusinessLayer;

    constructor() {
        this.#serviceLayer = new ConversationMetaDataServiceBusinessLayer();
    }

    getConversationWithMetaData(payload: IControllerGetConversationWithMetaDataPayload) {
        try {
            return this.#serviceLayer.getConversationWithMetaData(payload.conversationId, payload.participantId)
        } catch (error) {
            LoggerRepository.error({
                methodName: this.getConversationWithMetaData.name,
                className: this.#CLASS_NAME,
                message: 'Failed to get conversation metadata.',
                error: error,
            })
        }
    }

    updateConversationWithMetaData(payload: IControllerUpdateConversationWithMetaDataPayload) {
        try {
            return this.#serviceLayer.updateConversationWithMetaData(payload.conversationId, payload.participantId, payload.upsertData);
        } catch (error) {
            LoggerRepository.error({
                methodName: this.updateConversationWithMetaData.name,
                className: this.#CLASS_NAME,
                message: 'Failed to update conversation metadata.',
                error: error,
            })
        }
    }

}