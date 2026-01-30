import { IControllerGetConversationWithMetaDataPayload, IControllerUpdateConversationWithMetaDataPayload } from "./interface";
import { ConversationMetaDataServiceBusinessLayer } from "./service";

export class ConversationMetaDataControllerBusinessLayer {
    #serviceLayer: ConversationMetaDataServiceBusinessLayer;

    constructor() {
        this.#serviceLayer = new ConversationMetaDataServiceBusinessLayer();
    }

    getConversationWithMetaData(payload: IControllerGetConversationWithMetaDataPayload) {
        return this.#serviceLayer.getConversationWithMetaData(payload.conversationId, payload.participantId)
    }

    updateConversationWithMetaData(payload: IControllerUpdateConversationWithMetaDataPayload) {
        return this.#serviceLayer.updateConversationWithMetaData(payload.conversationId, payload.participantId, payload.upsertData);
    }

}