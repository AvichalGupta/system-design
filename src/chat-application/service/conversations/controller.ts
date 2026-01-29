import {
    IControllerAddContactsToGroupPayload,
    IControllerCreateGroupPayload,
    IControllerFetchRecentConversationsPayload,
    IControllerRemoveUsersFromGroupPayload,
    IControllerUpdateUserPrivilegePayload
} from "./interface";
import { ConversationServiceBusinessLayer } from "./service";

export class ConversationControllerBusinessLayer {

    #serviceLayer: ConversationServiceBusinessLayer;

    constructor() {
        this.#serviceLayer = new ConversationServiceBusinessLayer();
    }

    createGroup(payload: IControllerCreateGroupPayload) {
        return this.#serviceLayer.createGroup(payload.userId, payload.groupPayload);
    }

    addContactsToGroup(payload: IControllerAddContactsToGroupPayload) {
        return this.#serviceLayer.addContactsToGroup(payload.groupId, payload.requestorUserId, payload.participantDetails);
    }

    removeUsersFromGroup(payload: IControllerRemoveUsersFromGroupPayload) {
        return this.#serviceLayer.removeUsersFromGroup(payload.groupId, payload.requestorUserId, payload.participantIds);
    }

    updateUserPrivilege(payload: IControllerUpdateUserPrivilegePayload) {
        return this.#serviceLayer.updateUserPrivilege(payload.conversationId, payload.userId, payload.privilegeDetails);
    }

    fetchRecentConversations(payload: IControllerFetchRecentConversationsPayload) {
        return this.#serviceLayer.fetchRecentConversations(payload.userId);
    }
}
